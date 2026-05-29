import admin from "firebase-admin";
import { query } from "../db";

let initialized = false;

function ensureFirebase() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return true;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return false;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
  initialized = true;
  return true;
}

export async function sendPushToUser(userId: string, title: string, body: string, data: Record<string, string> = {}) {
  if (!ensureFirebase()) return { sent: false, reason: "firebase_not_configured" };

  const result = await query<{ fcm_token: string | null }>("SELECT fcm_token FROM users WHERE id = $1", [userId]);
  const token = result.rows[0]?.fcm_token;
  if (!token) return { sent: false, reason: "missing_fcm_token" };

  await admin.messaging().send({
    token,
    notification: { title, body },
    data
  });

  return { sent: true };
}
