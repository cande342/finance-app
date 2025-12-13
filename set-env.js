const fs = require('fs');
const path = require('path');


const dir = './src/environments';
const fileName = 'environment.ts';
const filePath = path.join(dir, fileName);


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


if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}


fs.writeFileSync(filePath, envConfigFile);

