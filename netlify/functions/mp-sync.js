const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment } = require('mercadopago');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

exports.handler = async (event) => {
  // Solo permitimos GET desde tu app
  if (event.httpMethod !== 'GET') return { statusCode: 405 };

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    // 1. Buscamos movimientos de los últimos 7 días
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const filters = {
      begin_date: sevenDaysAgo.toISOString(),
      end_date: now.toISOString(),
      sort: 'date_approved',
      criteria: 'desc',
      status: 'approved' // Solo los que ya se cobraron
    };

    const searchResult = await payment.search({ options: filters });
    const payments = searchResult.results || [];

    const myFullNames = (process.env.MY_FULL_NAMES || "").toUpperCase().split(',').map(n => n.trim());
    const userId = process.env.MY_FIREBASE_UID;
    const transactionsRef = db.collection(`users/${userId}/transactions`);
    
    let addedCount = 0;

    // 2. Procesamos cada pago encontrado
    for (const pay of payments) {
      const description = (pay.description || "").toUpperCase();
      const isSelfTransfer = myFullNames.some(name => name && description.includes(name));
      const amount = pay.transaction_amount;

      // Filtros: Solo gastos (egresos) y que NO sean a mi nombre
      // En el search de MP, los pagos que vos hacés tienen montos positivos pero son tipo 'payment' o 'transfer'
      if (!isSelfTransfer && amount > 0) {
        
        // Verificamos si ya existe en la DB para no duplicar
        const existing = await transactionsRef.where("mpId", "==", String(pay.id)).get();
        
        if (existing.empty) {
          await transactionsRef.add({
            amount: amount,
            description: `MP: ${pay.description || 'Gasto'}`,
            category: "Mercado Pago",
            date: admin.firestore.Timestamp.fromDate(new Date(pay.date_approved)),
            type: "gasto",
            mpId: String(pay.id),
            metadata: "manual-sync"
          });
          addedCount++;
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Sincronización terminada. ${addedCount} nuevos movimientos.` })
    };

  } catch (error) {
    console.error('Error Sync:', error);
    return { statusCode: 500, body: 'Error en la sincronización' };
  }
};