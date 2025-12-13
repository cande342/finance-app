import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  collectionSnapshots,
  getDocs,
  where
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { combineLatest, map, Observable, of, switchMap } from 'rxjs';
import { Transaction } from '../interfaces/Transaction';
import { Installment } from '../interfaces/Installment';
import { InvestmentCard } from '../interfaces/Investment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private http = inject(HttpClient);

  // Helper privado para manejar la espera del usuario
  private getUserData<T>(collectionName: string, orderField?: string): Observable<T[]> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of([]); // Si no hay usuario, devuelve array vacío
        
        const ref = collection(this.firestore, `users/${user.uid}/${collectionName}`);
        
        let q;
        if (orderField) {
          q = query(ref, orderBy(orderField, 'desc'));
        } else {
          q = query(ref); // Sin orden específico
        }

        // collectionData devuelve la data en tiempo real
        return collectionData(q, { idField: 'id' }) as Observable<T[]>;
      })
    );
  }

  // =========================================
  //              TRANSACCIONES
  // =========================================

  getTransactions(): Observable<Transaction[]> {
    // Usamos el helper para esperar al usuario y luego pedir 'transactions'
    return this.getUserData<Transaction>('transactions', 'date'); 
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>) {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = collection(this.firestore, `users/${user.uid}/transactions`);
    await addDoc(ref, transaction);
  }



  // =========================================
  //                CUOTAS
  // =========================================

  getInstallments(): Observable<Installment[]> {
    return this.getUserData<Installment>('installments');
  }

  async addInstallment(installment: Omit<Installment, 'id'>) {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = collection(this.firestore, `users/${user.uid}/installments`);
    await addDoc(ref, installment);
  }

  /**
   * Paga una cuota y crea UNA transacción asociada a esa cuota.
   * Antes de crearla verifica si ya existe una transacción para esa cuota
   * (evita duplicados / fantasmas).
   */
  async payInstallment(id: string, currentPaid: number, total: number) {
    const userId = this.auth.currentUser?.uid;
    if (!userId || currentPaid >= total) return;

    // actualizar cuotas pagadas
    const docRef = doc(this.firestore, `users/${userId}/installments/${id}`);
    await updateDoc(docRef, {
      paidCuotas: currentPaid + 1
    });

    // --- crear transacción asociada a esta cuota (si no existe aún) ---
    const instSnap = await getDoc(docRef);
    if (!instSnap.exists()) return;
    const instData = instSnap.data() as any;

    const amountPerCuota = instData.amountPerCuota ?? 0;
    const item = instData.item ?? 'Cuota';
    const cuotaNumber = currentPaid + 1;

    // Buscamos si ya existe una transacción creada para este installment + cuotaNumber
    const transactionsRef = collection(this.firestore, `users/${userId}/transactions`);
    const q = query(
      transactionsRef,
      where('installmentId', '==', id),
      where('installmentCuota', '==', cuotaNumber)
    );

    const existing = await getDocs(q);

    if (existing.empty) {
      // No existe: creamos la transacción con metadata que la liga a la cuota
      await addDoc(transactionsRef, {
        type: 'gasto',
        amount: amountPerCuota,
        description: `Pago cuota ${cuotaNumber}/${total} - ${item}`,
        category: 'cuota',
        date: new Date(),
        installmentId: id,
        installmentCuota: cuotaNumber
      });
    } else {
      // Ya existía: no crear otra (evita duplicados / reapariciones)
      return;
    }
  }

  async deleteInstallment(id: string) {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return;
    
    const docRef = doc(this.firestore, `users/${userId}/installments/${id}`);

    // borrar transacciones ligadas a este installment para no dejar huellas(no hay historial)
    const transactionsRef = collection(this.firestore, `users/${userId}/transactions`);
    const q = query(transactionsRef, where('installmentId', '==', id));
    const snaps = await getDocs(q);
    for (const s of snaps.docs) {
      await deleteDoc(doc(this.firestore, `users/${userId}/transactions/${s.id}`));
    }

    await deleteDoc(docRef);
  }


  // =========================================
  //              INVERSIONES
  // =========================================
  getInvestments(): Observable<InvestmentCard[]> {
      return authState(this.auth).pipe(
        switchMap(user => {
          if (!user) return of([]);
          const ref = collection(this.firestore, `users/${user.uid}/investments`);
          // Inversiones requiere map manual para el ID
          return collectionSnapshots(ref).pipe(
            map(snaps => snaps.map(s => {
              const data = s.data() as any;
              return {
                id: s.id,
                ...data
              } as InvestmentCard;
            }))
          );
        })
      );
    }


  async addInvestment(investment: Omit<InvestmentCard, 'id'>) {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return;

    const ref = collection(this.firestore, `users/${userId}/investments`);
    await addDoc(ref, {
      ...investment,
      createdAt: new Date()
    });
  }

  async updateInvestment(id: string, data: Partial<InvestmentCard>) {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return;

    const docRef = doc(this.firestore, `users/${userId}/investments/${id}`);
    return updateDoc(docRef, data);
  }


  // =========================================
  //        MIX PARA TABLA PRINCIPAL
  // =========================================

  getAllMovements(): Observable<Transaction[]> {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return of([]);

    const trans$ = this.getTransactions();
    const investments$ = this.getInvestments();

    return combineLatest([trans$, investments$]).pipe(
      map(([trans, _investments]) => {
        return [...trans].sort((a, b) => {
          const at = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
          const bt = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
          return bt - at;
        });
      })
    );
  }

  syncMercadoPago() {
    const url = 'https://sensational-semolina-f4d794.netlify.app/.netlify/functions/mp-sync';
    return this.http.get<{message: string}>(url);
  }

}
