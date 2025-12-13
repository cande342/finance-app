const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Inicializamos Firebase (solo si no está inicializado)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  // Solo aceptamos peticiones POST (lo que manda Mercado Pago)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, data } = body;

    // Solo procesamos si es un pago creado o actualizado
    if (action === "payment.created" || action === "payment.updated") {
      
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const payment = new Payment(client);
      
      // Consultamos el detalle del pago a la API de Mercado Pago
      const payInfo = await payment.get({ id: data.id });

      // --- FILTROS DE SEGURIDAD Y LÓGICA ---
      const date = new Date(payInfo.date_approved || payInfo.date_created);
      const limitDate = new Date("2025-12-01T00:00:00Z");
      const amount = payInfo.transaction_amount;
      const isApproved = payInfo.status === 'approved';
      // regular_payment son compras. Excluimos transferencias internas.
      const isPurchase = payInfo.operation_type === 'regular_payment' || payInfo.operation_type === 'pos_payment';

      if (date >= limitDate && isApproved && isPurchase) {
        
        const userId = process.env.MY_FIREBASE_UID;
        const transactionsRef = db.collection(`users/${userId}/transactions`);

        // Evitamos duplicados: chequeamos si ya existe este mpId
        const existing = await transactionsRef.where("mpId", "==", String(data.id)).get();
        
        if (existing.empty) {
          await transactionsRef.add({
            amount: amount,
            description: `MP: ${payInfo.description || 'Gasto sin nombre'}`,
            category: "Mercado Pago",
            date: admin.firestore.Timestamp.fromDate(date),
            type: "gasto",
            mpId: String(data.id), // Guardamos el ID para no repetirlo
            metadata: "auto-webhook"
          });
          console.log(`Gasto guardado: $${amount}`);
        }
      }
    }

    return { statusCode: 200, body: 'Recibido' };
  } catch (error) {
    console.error('Error Webhook:', error);
    // Respondemos 200 igual para que Mercado Pago no nos sature con reintentos
    return { statusCode: 200, body: 'Error procesado' };
  }
};