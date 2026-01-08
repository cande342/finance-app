const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}

const db = admin.firestore();

// TU USUARIO DE MERCADO PAGO
const MY_MP_USER_ID = Number(process.env.MP_USER_ID);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // --- PREFLIGHT ---
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // --- BODY ---
    const { userId } = JSON.parse(event.body);
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId requerido' })
      };
    }

    // --- CURSOR TEMPORAL ---
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    const BASE_DATE = '2026-01-01T00:00:00.000-03:00';
    const lastSyncDate = userData.last_sync || BASE_DATE;
    const now = new Date().toISOString();

    console.log(`[MP SYNC GASTOS] ${userId} | ${lastSyncDate} → ${now}`);

    // --- MERCADO PAGO ---
    const mpResponse = await axios.get(
      'https://api.mercadopago.com/v1/payments/search',
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        },
        params: {
          sort: 'date_created',
          criteria: 'asc',
          range: 'date_created',
          begin_date: lastSyncDate,
          end_date: now,
          limit: 50,
          offset: 0
        }
      }
    );

    const movements = mpResponse.data.results || [];

    if (movements.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Sin gastos nuevos', count: 0 })
      };
    }

    // --- FIRESTORE ---
    const batch = db.batch();
    const transactionsRef = userRef.collection('transactions');

    let processedCount = 0;
    let maxDateProcessed = lastSyncDate;

    for (const mov of movements) {
      // Solo aprobados
      if (!['approved', 'accredited'].includes(mov.status)) continue;

      // Cursor temporal
      if (mov.date_created > maxDateProcessed) {
        maxDateProcessed = mov.date_created;
      }

      // ID determinístico (no duplicados)
      const txRef = transactionsRef.doc(String(mov.id));
      const txSnap = await txRef.get();
      if (txSnap.exists) continue;

      // --- SOLO GASTOS ---
      const isExpense = mov.payer?.id === MY_MP_USER_ID;

      const desc = (mov.description || '').toLowerCase();

      // Filtrar ingresos y transferencias entrantes
      const isBankIn =
        desc.includes('bank transfer') ||
        desc.includes('transferencia') ||
        desc.includes('varios');

      if (!isExpense || isBankIn) {
        continue;
      }

      const amount = -Math.abs(mov.transaction_amount);

      batch.set(txRef, {
        mp_id: String(mov.id),
        amount: amount,
        type: 'gasto',
        description: mov.description || 'Gasto Mercado Pago',
        category: 'Mercado Pago',
        date: new Date(mov.date_created),
        source: 'mercadopago',
        createdAt: new Date()
      });

      processedCount++;
    }

    // --- GUARDAR CURSOR ---
    if (processedCount > 0) {
      const nextSync = new Date(
        new Date(maxDateProcessed).getTime() + 1000
      ).toISOString();

      batch.set(userRef, { last_sync: nextSync }, { merge: true });
      await batch.commit();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Sincronizados ${processedCount} gastos`,
        count: processedCount
      })
    };

  } catch (error) {
    console.error('[MP SYNC ERROR]', error.response?.data || error.message);

    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data || null
      })
    };
  }
};
