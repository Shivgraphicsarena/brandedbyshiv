// api/usage.js — Check remaining free uses for a user

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function getDB() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

const FREE_LIMIT = 3;
const WINDOW_MS = 48 * 60 * 60 * 1000;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.query.userId || req.headers['x-forwarded-for'] || 'anonymous';

  try {
    const db = getDB();
    const ref = db.collection('usage').doc(`gemini_${userId}`);
    const doc = await ref.get();
    const now = Date.now();

    if (!doc.exists) {
      return res.json({ used: 0, remaining: FREE_LIMIT, resetIn: null });
    }

    const data = doc.data();
    const elapsed = now - (data.windowStart || 0);

    if (elapsed > WINDOW_MS) {
      return res.json({ used: 0, remaining: FREE_LIMIT, resetIn: null });
    }

    const used = data.count || 0;
    const remaining = Math.max(0, FREE_LIMIT - used);
    const resetIn = remaining === 0 ? Math.ceil((WINDOW_MS - elapsed) / 3600000) : null;

    res.json({ used, remaining, resetIn, limit: FREE_LIMIT });

  } catch (err) {
    console.error('Usage check error:', err);
    res.json({ used: 0, remaining: FREE_LIMIT, resetIn: null });
  }
};
