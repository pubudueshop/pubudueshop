import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let auth = null;

try {
  let credential = null;

  // 1. Check if direct JSON string is supplied via environment variable (Great for cloud platforms like Render / Vercel / Railway)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
  } 
  // 2. Check if path to serviceAccountKey.json is specified
  else {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      const fileContent = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      credential = admin.credential.cert(fileContent);
    } else {
      // 3. Fallback to default application credentials or project ID initialization
      console.warn('⚠️ serviceAccountKey.json not found in backend folder. Using project ID initialization.');
      credential = admin.credential.applicationDefault();
    }
  }

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || 'pubudu-inventry'
  });

  db = admin.firestore();
  auth = admin.auth();
  console.log('✅ Firebase Admin SDK initialized successfully for project:', process.env.FIREBASE_PROJECT_ID || 'pubudu-inventry');

} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.warn('ℹ️ Please ensure you have placed serviceAccountKey.json in the backend directory or set FIREBASE_SERVICE_ACCOUNT_JSON in .env');
}

export { admin, db, auth };
