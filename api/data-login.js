export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, message: 'Metode tidak diizinkan.' });
  }

  const apiUrl = String(process.env.DATA_LOGIN_API_URL || '').trim();
  const apiToken = String(process.env.DATA_LOGIN_API_TOKEN || '').trim();

  if (!apiUrl || !apiToken) {
    return response.status(500).json({
      ok: false,
      message: 'Environment Variables DATA_LOGIN_API_URL dan DATA_LOGIN_API_TOKEN belum diatur di Vercel.'
    });
  }

  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(apiUrl)) {
    return response.status(500).json({
      ok: false,
      message: 'DATA_LOGIN_API_URL harus menggunakan URL Web App Google Apps Script yang berakhir /exec.'
    });
  }

  try {
    const upstreamUrl = new URL(apiUrl);
    upstreamUrl.searchParams.set('format', 'json');
    upstreamUrl.searchParams.set('key', apiToken);
    upstreamUrl.searchParams.set('t', String(Date.now()));

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'application/json' }
    });

    const rawBody = await upstreamResponse.text();
    let payload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error('Web App tidak mengembalikan JSON. Pastikan deployment dapat diakses oleh Anyone.');
    }

    if (!upstreamResponse.ok || !payload || !payload.ok || !Array.isArray(payload.records)) {
      const message = payload && payload.message ? payload.message : 'Respons Data Login tidak sesuai.';
      return response.status(upstreamResponse.ok ? 502 : upstreamResponse.status).json({ ok: false, message });
    }

    return response.status(200).json(payload);
  } catch (error) {
    return response.status(502).json({
      ok: false,
      message: error && error.message ? error.message : 'Data Login tidak dapat dihubungkan.'
    });
  }
}
