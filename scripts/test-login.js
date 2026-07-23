const http = require('http');
const https = require('https');

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(opts, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        try { resolve({ status: res.statusCode, body: JSON.parse(data), cookies }); }
        catch { resolve({ status: res.statusCode, body: data, cookies }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const email = 'roster@lanework.com';
  const password = '***';

  console.log('1. LOGIN...');
  const login = await api('POST', '/api/auth/login', { email, password });
  console.log('   Status:', login.status);
  console.log('   Body:', JSON.stringify(login.body).substring(0, 200));
  console.log('   Cookies:', login.cookies.length);

  const authCookie = login.cookies.find(c => c.startsWith('auth-token='));
  if (!authCookie) { console.log('FAIL: No auth cookie set'); process.exit(1); }
  const token = authCookie.split('=')[1].split(';')[0];
  console.log('   Token length:', token.length);

  // 2. Verify session
  console.log('\n2. VERIFY SESSION...');
  const session = await api('GET', '/api/auth/me', null, authCookie);
  console.log('   Status:', session.status);
  console.log('   Body:', JSON.stringify(session.body).substring(0, 200));

  // 3. Get CSRF token
  console.log('\n3. GET CSRF...');
  const csrf = await api('GET', '/api/auth/csrf');
  console.log('   Status:', csrf.status);

  // 4. Login via credentials callback (POST)
  console.log('\n4. POST credentials callback...');
  const cb = await api('POST', '/api/auth/callback/credentials',
    `csrfToken=${csrf.body.csrfToken}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    'application/x-www-form-urlencoded', authCookie
  );
  // ↑ This calls NextAuth v5 callback which set the session cookie
  // If still 302 → Configuration, NEXTAUTH_SECRET is the sole cause

  process.exit(0);
}
main().catch(e => { console.error('FATAL:', e); process.exit(1); });
