const crypto = require('crypto');

const R_URL = process.env.UPSTASH_REDIS_REST_URL;
const R_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(R_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${R_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  return j.result;
}

const sha = (v) =>
  crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');

module.exports = { redis, sha };
