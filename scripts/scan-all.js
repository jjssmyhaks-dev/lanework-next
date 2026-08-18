const http = require('http');
const tests = [
  ['GET','/'],['GET','/login'],['GET','/register'],
  ['GET','/dashboard'],['GET','/onboarding'],['GET','/chat'],
  ['GET','/shipment'],['GET','/inventory'],['GET','/routes'],['GET','/warehouse'],['GET','/fleet'],['GET','/customer'],
  ['GET','/api/shipment'],['GET','/api/inventory'],['GET','/api/routes'],
  ['GET','/api/warehouse'],['GET','/api/fleet/drivers'],['GET','/api/fleet/vehicles'],
  ['GET','/api/customer'],['GET','/api/dashboard/stats'],
  ['GET','/api/integrations?orgId=default'],['GET','/api/agents/trust?orgId=default'],
  ['GET','/api/usage?orgId=default'],['GET','/api/approvals?orgId=default'],
  ['POST','/api/contact','{"name":"Test","email":"t@t.com"}'],
  ['POST','/api/approvals','{"orgId":"default","agentType":"shipment_tracking","actionType":"reroute","description":"Test"}'],
  ['POST','/api/onboarding','{"step":"create-org","userId":"u1","orgName":"TestOrg"}'],
  ['GET','/api/db/init'],
];
let done = 0;
const results = [];
tests.forEach(([m, p, b]) => {
  const opts = { hostname: 'localhost', port: 3000, path: p, method: m, headers: {}, timeout: 10000 };
  if (b) { opts.headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }; }
  const req = http.request(opts, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      const s = body.length > 80 ? body.slice(0, 80) + '...' : body;
      results.push(m + ' ' + p + ' → ' + res.statusCode + ' | ' + (s || 'empty').replace(/\n/g, ' '));
      if (++done === tests.length) { results.sort().forEach(r => console.log(r)); process.exit(0); }
    });
  });
  req.on('error', e => { results.push(m + ' ' + p + ' → ERR ' + e.message); if (++done === tests.length) { results.sort().forEach(r => console.log(r)); process.exit(0); } });
  if (b) req.write(b);
  req.end();
});
