const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment } = require('mercadopago');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  try {
    const { action, data } = JSON.parse(event.body);

    if (action === "payment.created" || action === "payment.updated") {
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const payment = new Payment(client);
      const payInfo = await payment.get({ id: data.id });

      const date = new Date(payInfo.date_approved || payInfo.date_created);
      const limitDate = new Date("2025-12-01T00:00:00Z");
      
      const allowedTypes = ['regular_payment', 'pos_payment', 'transfer', 'account_money'];
      const isAllowedType = allowedTypes.includes(payInfo.operation_type);

      // ==========================================
      //    LÓGICA DE FILTRO POR NOMBRE COMPLETO
      // ==========================================

      const rawNames = process.env.MY_FULL_NAMES || "";
      const myFullNames = rawNames.toUpperCase().split(',').map(n => n.trim());
      
      const description = (payInfo.description || "").toUpperCase();
      
      // Verificamos si la descripción contiene alguno de tus NOMBRES COMPLETOS
      const isSelfTransfer = myFullNames.some(fullName => fullName && description.includes(fullName));

      if (date >= limitDate && payInfo.status === 'approved' && isAllowedType && !isSelfTransfer) {
        
        const userId = process.env.MY_FIREBASE_UID;
        const transactionsRef = db.collection(`users/${userId}/transactions`);
        const existing = await transactionsRef.where("mpId", "==", String(data.id)).get();
        
        if (existing.empty) {
          await transactionsRef.add({
            amount: payInfo.transaction_amount,
            description: `MP: ${payInfo.description || 'Transferencia/Pago'}`,
            category: "Mercado Pago",
            date: admin.firestore.Timestamp.fromDate(date),
            type: "gasto",
            mpId: String(data.id)
          });
          console.log(`✅ Gasto registrado: ${payInfo.description}`);
        }
      } else {
        console.log(`🚫 Movimiento filtrado. ${isSelfTransfer ? 'Detectada transferencia propia.' : 'No cumple requisitos.'}`);
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 200, body: 'Error procesado' };
  }
};