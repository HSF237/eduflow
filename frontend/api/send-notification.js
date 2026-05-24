import crypto from 'crypto';

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  })).toString('base64url');

  const input = `${header}.${payload}`;
  const sign  = crypto.createSign('RSA-SHA256');
  sign.update(input);
  const sig = sign.sign(sa.private_key.replace(/\\n/g, '\n'), 'base64url');
  const jwt = `${input}.${sig}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('No access token: ' + JSON.stringify(data));
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { tokens, title, body } = req.body || {};
  if (!tokens?.length) return res.status(200).json({ sent: 0 });

  let sa;
  try {
    sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch {
    return res.status(500).json({ error: 'Missing FIREBASE_SERVICE_ACCOUNT env var' });
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(sa);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  let sent = 0;

  for (const token of tokens) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: { token, notification: { title, body } },
        }),
      });
      if (r.ok) sent++;
    } catch { /* skip bad token */ }
  }

  return res.status(200).json({ sent });
}
