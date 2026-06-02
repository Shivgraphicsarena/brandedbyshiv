// api/scan.js — Vercel Serverless Function
// Handles product image scan via Gemini Vision
// Same rate limit as gemini.js (shared usage pool)

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

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

async function checkRateLimit(db, userId) {
  const ref = db.collection('usage').doc(userId);
  const doc = await ref.get();
  const now = Date.now();

  if (!doc.exists) {
    await ref.set({ count: 1, windowStart: now });
    return { allowed: true, remaining: FREE_LIMIT - 1 };
  }

  const data = doc.data();
  const elapsed = now - (data.windowStart || 0);

  if (elapsed > WINDOW_MS) {
    await ref.set({ count: 1, windowStart: now });
    return { allowed: true, remaining: FREE_LIMIT - 1 };
  }

  if (data.count >= FREE_LIMIT) {
    const resetIn = Math.ceil((WINDOW_MS - elapsed) / 3600000);
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      message: `You've used all 3 free generations. Resets in ${resetIn} hour${resetIn === 1 ? '' : 's'}.`
    };
  }

  await ref.update({ count: FieldValue.increment(1) });
  return { allowed: true, remaining: FREE_LIMIT - 1 - data.count };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageType, prompt, userId } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
  if (!imageBase64) return res.status(400).json({ error: 'No image provided.' });

  const trackingId = userId || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'anonymous';

  try {
    const db = getDB();
    const limit = await checkRateLimit(db, `gemini_${trackingId}`);

    if (!limit.allowed) {
      return res.status(429).json({
        error: limit.message,
        resetIn: limit.resetIn,
        limitReached: true
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: imageType || 'image/jpeg', data: imageBase64 } },
              { text: prompt || 'Analyze this product image and generate branding prompts.' }
            ]
          }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 4096 }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text, remaining: limit.remaining });

  } catch (err) {
    console.error('Scan API error:', err);
    res.status(500).json({ error: 'Scan failed. Please try again.' });
  }
};
