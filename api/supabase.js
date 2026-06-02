const SB_URL = 'https://yuofrxupqbjoysafvowb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1b2ZyeHVwcWJqb3lzYWZ2b3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTIzODAsImV4cCI6MjA5NTgyODM4MH0.-b8iesaEHZVo7BVrfaYVw-FnPUeFECpmF0zzgqrHtvo';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { path, ...queryParams } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path' });

  const qs = Object.keys(queryParams).length
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';

  const targetUrl = `${SB_URL}${path}${qs}`;

  try {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
    };

    if (req.headers['prefer']) headers['Prefer'] = req.headers['prefer'];

    const fetchOptions = { method: req.method, headers };

    if (req.method === 'POST' || req.method === 'PATCH') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const sbRes = await fetch(targetUrl, fetchOptions);
    const ct = sbRes.headers.get('content-type') || '';

    if (ct.includes('application/json')) {
      return res.status(sbRes.status).json(await sbRes.json());
    }
    return res.status(sbRes.status).send(await sbRes.text());

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
