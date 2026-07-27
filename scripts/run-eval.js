/**
 * Run eval directly from CLI (bypasses auth for testing)
 */
const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^(\w+)="?([^"\n]+)"?$/);
  if (m) env[m[1]] = m[2];
}
Object.assign(process.env, env);

async function run() {
  // Dynamic import ESM modules
  const { analyzeShipmentStatus, optimizeRoute, analyzeSentiment, generateTaskReasoning } = await import('../src/lib/ai.js');
  const { getEvalDataset } = await import('../src/lib/eval-dataset.js');

  const dataset = getEvalDataset();
  console.log(`Running ${dataset.length} eval tests...\n`);

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of dataset) {
    const start = Date.now();
    let output = '';
    let error = null;

    try {
      switch (test.agent) {
        case 'shipment-tracking':
          output = await analyzeShipmentStatus(test.input.trackingNumber);
          break;
        case 'route-optimization':
          output = await optimizeRoute(test.input.origin, test.input.destination, test.input.constraints || []);
          break;
        case 'customer-support':
          output = await analyzeSentiment(test.input.text);
          break;
        case 'reasoning':
          output = await generateTaskReasoning(test.input.taskType, test.input.context);
          break;
      }
    } catch (e) {
      error = e.message;
    }

    const latencyMs = Date.now() - start;
    const lower = output.toLowerCase();
    const keywordHits = test.expectedKeywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    const keywordScore = test.expectedKeywords.length ? keywordHits / test.expectedKeywords.length : 1;
    const lengthScore = Math.min(output.length / test.minLength, 1);
    const latencyScore = Math.min(test.maxLatencyMs / Math.max(latencyMs, 1), 1);
    const overall = keywordScore * 0.35 + lengthScore * 0.25 + latencyScore * 0.20 + (error ? 0 : 0.20);
    const isPass = overall >= 0.5;

    if (isPass) passed++; else failed++;

    console.log(`${isPass ? '✅' : '❌'} ${test.id} | ${test.agent.padEnd(20)} | ${(overall*100).toFixed(0)}% | ${latencyMs}ms | ${test.scenario}`);

    results.push({ testId: test.id, agent: test.agent, scenario: test.scenario, passed: isPass, overall, latencyMs, output: output.slice(0, 150), error });

    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Passed: ${passed}/${dataset.length} (${((passed/dataset.length)*100).toFixed(0)}%)`);
  console.log(`Failed: ${failed}/${dataset.length}`);

  // Per agent
  const agents = [...new Set(dataset.map(t => t.agent))];
  for (const agent of agents) {
    const agentResults = results.filter(r => r.agent === agent);
    const avg = agentResults.reduce((s, r) => s + r.overall, 0) / agentResults.length;
    const p = agentResults.filter(r => r.passed).length;
    console.log(`  ${agent}: ${p}/${agentResults.length} passed | avg ${(avg*100).toFixed(0)}%`);
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });