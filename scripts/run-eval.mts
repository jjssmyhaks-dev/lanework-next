// Run eval via tsx with .mts extension for ESM top-level await
import { analyzeShipmentStatus, optimizeRoute, analyzeSentiment, generateTaskReasoning } from '../src/lib/ai';
import { getEvalDataset } from '../src/lib/eval-dataset';

const agent = process.argv[2] || null;

const dataset = agent
  ? getEvalDataset().filter(t => t.agent === agent)
  : getEvalDataset();

console.log(`Running ${dataset.length} eval tests${agent ? ` for ${agent}` : ''}...\n`);

let passed = 0;
let failed = 0;
const agentStats: Record<string, { passed: number; total: number; totalScore: number }> = {};

for (const t of dataset) {
  const start = Date.now();
  let out = '';
  let error: string | null = null;

  try {
    switch (t.agent) {
      case 'shipment-tracking':
        out = await analyzeShipmentStatus(t.input.trackingNumber as string);
        break;
      case 'route-optimization':
        out = await optimizeRoute(
          t.input.origin as string,
          t.input.destination as string,
          (t.input.constraints as string[]) || []
        );
        break;
      case 'customer-support':
        out = await analyzeSentiment(t.input.text as string);
        break;
      case 'reasoning':
        out = await generateTaskReasoning(
          t.input.taskType as string,
          t.input.context as string
        );
        break;
    }
  } catch (e: any) {
    error = e.message;
  }

  const ms = Date.now() - start;
  const lower = out.toLowerCase();
  const hits = t.expectedKeywords.filter(k => lower.includes(k.toLowerCase())).length;
  const ks = t.expectedKeywords.length ? hits / t.expectedKeywords.length : 1;
  const ls = Math.min(out.length / t.minLength, 1);
  const lats = Math.min(t.maxLatencyMs / Math.max(ms, 1), 1);
  const ov = ks * 0.35 + ls * 0.25 + lats * 0.2 + (error ? 0 : 0.20);
  const isPass = ov >= 0.5;

  if (isPass) passed++;
  else failed++;

  if (!agentStats[t.agent]) {
    agentStats[t.agent] = { passed: 0, total: 0, totalScore: 0 };
  }
  agentStats[t.agent].total++;
  if (isPass) agentStats[t.agent].passed++;
  agentStats[t.agent].totalScore += ov;

  const icon = isPass ? '✅' : '❌';
  console.log(`${icon} ${t.id} | ${t.agent.padEnd(20)} | ${(ov * 100).toFixed(0)}% | ${ms}ms | ${t.scenario.slice(0, 60)}${error ? ' | ERR: ' + error.slice(0, 40) : ''}`);

  // Rate limit
  if (dataset.indexOf(t) < dataset.length - 1) {
    await new Promise(r => setTimeout(r, 300));
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passed}/${dataset.length} (${((passed / dataset.length) * 100).toFixed(0)}%)`);
console.log(`Failed: ${failed}/${dataset.length}`);
console.log(`\nPer agent:`);
for (const [a, s] of Object.entries(agentStats)) {
  const avg = (s.totalScore / s.total * 100).toFixed(0);
  console.log(`  ${a}: ${s.passed}/${s.total} passed | avg ${avg}%`);
}

process.exit(0);
