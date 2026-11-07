const crypto = require('crypto');
const { redis } = require('./_lib');

function getCookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

module.exports = async (req, res) => {
  const fbclid = (req.query && req.query.fbclid) || '';
  const fbp = getCookie(req, '_fbp');
  let fbc = getCookie(req, '_fbc');
  if (!fbc && fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;

  const id = crypto.randomBytes(6).toString('hex');
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

  const tg = await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/createChatInviteLink`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.CHANNEL_ID,
        name: id,
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + 3600,
      }),
    }
  );
  const data = await tg.json();
  if (!data.ok) {
    return res.status(500).json({ error: 'invite link failed', detail: data.description });
  }
  const link = data.result.invite_link;

  const click = {
    id, ts: Date.now(), fbclid, fbp, fbc, ip,
    ua: req.headers['user-agent'] || '',
    host: req.headers.host, link,
  };
  const week = String(60 * 60 * 24 * 7);
  await redis(['SET', `click:${id}`, JSON.stringify(click), 'EX', week]);
  await redis(['SET', `link:${link}`, id, 'EX', week]);
  await redis(['INCR', 'stats:clicks']);

  res.writeHead(302, { Location: link });
  res.end();
};
