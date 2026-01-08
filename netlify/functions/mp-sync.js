const admin = require('firebase-admin');
const axios = require('axios');

// Inicialización estándar
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

exports.handler = async (event) => {
  // ============================================================
  // 1. CABECERAS CORS (La cura para tu error rojo)
  // ============================================================
  const headers = {
    'Access-Control-Allow-Origin': '*', // Permite que Angular (localhost) llame aquí
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // ============================================================
  // 2. MANEJO DE PREFLIGHT (La pregunta invisible del navegador)
  // ============================================================
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers, // <--- IMPORTANTÍSIMO DEVOLVERLAS AQUÍ
      body: ''
    };
  }

  // Si no es POST, chao
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: 'Method Not Allowed' 
    };
  }

  try {
    const { userId } = JSON.parse(event.body);
    if (!userId) throw new Error('Usuario no identificado');

    // --- LÓGICA DE CURSOR (Evita repetidos) ---
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    
    // Fecha base 2026 si es la primera vez
    const BASE_DATE_2026 = '2026-01-01T00:00:00.000-03:00';
    let lastSyncDate = userData.last_sync ? userData.last_sync : BASE_DATE_2026;

    console.log(`Sync user ${userId} from: ${lastSyncDate}`);

    // --- PETICIÓN A MERCADO PAGO ---
    const mpResponse = await axios.get('https://api.mercadopago.com/v1/account/movements/search', {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      params: {
        sort: 'date_created',
        criteria: 'asc',
        range: 'date_created',
        begin_date: lastSyncDate, 
        limit: 50
      }
    });

    const movements = mpResponse.data.results || [];
    
    // Si no hay nada nuevo
    if (movements.length === 0) {
      return {
        statusCode: 200,
        headers, // <--- NO OLVIDAR HEADERS
        body: JSON.stringify({ message: 'Todo al día.', count: 0 })
      };
    }

    // --- PROCESAR MOVIMIENTOS ---
    const batch = db.batch();
    const transactionsRef = db.collection(`users/${userId}/transactions`);
    
    let processedCount = 0;
    let maxDateProcessed = lastSyncDate;

    for (const mov of movements) {
      if (mov.status !== 'approved' && mov.status !== 'accredited') continue;

      // Doble chequeo de seguridad
      const existingDocs = await transactionsRef.where('mp_id', '==', String(mov.id)).get();
      if (!existingDocs.empty) {
        if (mov.date_created > maxDateProcessed) maxDateProcessed = mov.date_created;
        continue; 
      }

      // Detectar Ingreso vs Gasto
      let type = 'gasto';
      let category = 'varios';
      let amount = mov.amount;
      const description = (mov.description || mov.detail || 'Movimiento MP').toUpperCase();

      if (amount > 0) {
        type = 'ingreso';
        category = 'Ingreso MP';
      } else {
        type = 'gasto';
        amount = Math.abs(amount);
        category = 'Gasto MP';
      }

      const newDocRef = transactionsRef.doc();
      batch.set(newDocRef, {
        mp_id: String(mov.id),
        description: description,
        amount: amount,
        type: type,
        category: category,
        date: new Date(mov.date_created),
        source: 'mercadopago',
        createdAt: new Date()
      });

      processedCount++;
      if (mov.date_created > maxDateProcessed) {
        maxDateProcessed = mov.date_created;
      }
    }

    // Guardar nueva fecha de corte
    if (processedCount > 0) {
      const nextSyncDate = new Date(new Date(maxDateProcessed).getTime() + 1).toISOString();
      batch.set(userRef, { last_sync: nextSyncDate }, { merge: true });
      await batch.commit();
    }

    return {
      statusCode: 200,
      headers, 
      body: JSON.stringify({ 
        message: `Éxito. ${processedCount} nuevos.`, 
        count: processedCount 
      })
    };

  } catch (error) {
    console.error('Error Sync:', error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: error.message }) 
    };
  }
};