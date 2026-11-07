const { redis } = require('./_lib');

module.exports = async (req, res) => {
  const clicks = Number(await redis(['GET', 'stats:clicks'])) || 0;
  const joins = Number(await redis(['GET', 'stats:joins'])) || 0;
  const join_rate_percent = clicks ? Math.round((joins / clicks) * 1000) / 10 : 0;
  res.status(200).json({ clicks, joins, join_rate_percent });
};
