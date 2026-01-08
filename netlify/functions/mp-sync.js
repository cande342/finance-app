const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

exports.handler = async (event) => {
  // 1. HEADERS CORS (Indispensables)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 2. PREFLIGHT
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { userId } = JSON.parse(event.body);

    // --- LÓGICA DE CURSOR DE TIEMPO ---
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    
    // Fecha base: 2026 (o la fecha que prefieras para iniciar)
    const BASE_DATE = '2026-01-01T00:00:00.000-03:00';
    let lastSyncDate = userData.last_sync ? userData.last_sync : BASE_DATE;

    console.log(`Sync User: ${userId} | Desde: ${lastSyncDate}`);

    // --- 3. PETICIÓN A LA RUTA CLÁSICA (LA QUE FUNCIONA) ---
    // Volvemos a /v1/payments/search que es la que usa el SDK
    const mpResponse = await axios.get('https://api.mercadopago.com/v1/payments/search', {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      params: {
        'sort': 'date_created',
        'criteria': 'asc',         // Traer del más viejo al más nuevo
        'range': 'date_created',   // Filtrar por fecha de creación
        'begin_date': lastSyncDate, 
        'limit': 50,
        'offset': 0
      }
    });

    const movements = mpResponse.data.results || [];

    if (movements.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Todo al día.', count: 0 })
      };
    }

    // --- PROCESAMIENTO ---
    const batch = db.batch();
    const transactionsRef = db.collection(`users/${userId}/transactions`);
    
    let processedCount = 0;
    let maxDateProcessed = lastSyncDate;

    for (const mov of movements) {
      // Solo aprobados
      if (mov.status !== 'approved' && mov.status !== 'accredited') continue;

      // Chequeo de duplicados por ID (mp_id)
      const existing = await transactionsRef.where('mp_id', '==', String(mov.id)).get();
      
      // Actualizamos el cursor temporal aunque ya exista
      if (mov.date_created > maxDateProcessed) {
        maxDateProcessed = mov.date_created;
      }

      if (!existing.empty) continue; // Si existe, saltamos

      // --- Detectar Tipo ---
      // En payments/search, 'transaction_amount' es el monto total.
      // Generalmente son gastos o cobros.
      // Si usas payments/search, MP suele devolver todo positivo.
      // Tendrás que confiar en tu lógica: si es payment suele ser Gasto tuyo (o Cobro si vendes).
      // Asumiremos GASTO por defecto, salvo que sea una transferencia recibida.
      
      let type = 'gasto';
      let category = 'Mercado Pago';
      let amount = mov.transaction_amount; // En este endpoint se llama transaction_amount

      // Intento básico de detectar ingresos (es difícil en este endpoint, pero probamos)
      // Si el operation_type es 'transfer' y vos no sos el payer... (Complejo sin más datos)
      // Por seguridad, en esta versión lo tratamos como Gasto/Movimiento genérico
      // O ajustamos según signo si viniera negativo (raro en este endpoint).
      
      const description = (mov.description || mov.reason || 'Movimiento MP').toUpperCase();

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
    }

    // Guardar fecha de corte
    if (processedCount > 0) {
      // Sumamos 1 segundo
      const nextSyncDate = new Date(new Date(maxDateProcessed).getTime() + 1000).toISOString();
      batch.set(userRef, { last_sync: nextSyncDate }, { merge: true });
      await batch.commit();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: `Sincronizados ${processedCount} movimientos.`, 
        count: processedCount 
      })
    };

  } catch (error) {
    console.error('Error MP:', error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message, 
        details: error.response ? error.response.data : null 
      })
    };
  }
};