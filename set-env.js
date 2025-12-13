const fs = require('fs');
const path = require('path');

// Definimos la ruta donde Angular espera el archivo
const dir = './src/environments';
const fileName = 'environment.ts';
const filePath = path.join(dir, fileName);

// Creamos el contenido usando variables de entorno que pondremos en Netlify
const envConfigFile = `
export const environment = {
  production: true,
  firebase: {
    apiKey: '${process.env.FIREBASE_API_KEY}',
    authDomain: '${process.env.FIREBASE_AUTH_DOMAIN}',
    projectId: '${process.env.FIREBASE_PROJECT_ID}',
    storageBucket: '${process.env.FIREBASE_STORAGE_BUCKET}',
    messagingSenderId: '${process.env.FIREBASE_SENDER_ID}',
    appId: '${process.env.FIREBASE_APP_ID}'
  }
};
`;

// 1. Nos aseguramos de que la carpeta existe
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 2. Escribimos el archivo
fs.writeFileSync(filePath, envConfigFile);

console.log(`✅ Archivo ${fileName} generado correctamente en ${dir}`);