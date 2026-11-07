const { redis, sha } = require('./_lib');

async function sendCapi(click, tgUserId) {
  const user_data = {
    client_ip_address: click.ip,
    client_user_agent: click.ua,
    external_id: sha(tgUserId),
  };
  if (click.fbc) user_data.fbc = click.fbc;
  if (click.fbp) user_data.fbp = click.fbp;

  const payload = {
    data: [{
      event_name: 'Subscribe',
      event_time: Math.floor(Date.now() / 1000),
      event_id: click.id,
      action_source: 'website',
      event_source_url: `https://${click.host}/`,
      user_data,
    }],
  };
  const r = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.PIXEL_ID}/events?access_token=${process.env.META_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
  console.log('CAPI', r.status, await r.text());
}

module.exports = async (req, res) => {
  if ((req.query && req.query.secret) !== process.env.WEBHOOK_SECRET) {
    return res.status(403).end();
  }
  const cm = (req.body || {}).chat_member;
  if (cm) {
    const nu = cm.new_chat_member || {};
    const user = nu.user || {};
    const link = cm.invite_link && cm.invite_link.invite_link;
    if (nu.status === 'member' && link && !user.is_bot) {
      const id = await redis(['GET', `link:${link}`]);
      if (id) {
        const first = await redis(['SET', `joined:${id}`, '1', 'NX', 'EX', String(60 * 60 * 24 * 7)]);
        if (first) {
          const raw = await redis(['GET', `click:${id}`]);
          if (raw) {
            await redis(['INCR', 'stats:joins']);
            await sendCapi(JSON.parse(raw), user.id);
          }
        }
      }
    }
  }
  res.status(200).json({ ok: true });
};
