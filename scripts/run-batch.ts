import { runBatch } from "../src/engine/run";
import { batchMetrics } from "../src/engine/measure";

runBatch()
  .then(async (r) => {
    const m = await batchMetrics();
    console.log("run", r);
    console.log("atRisk", m.atRisk, "recovered", m.recovered, "rate", m.rate, "cases", m.caseCount);
    console.log("stops", m.stops);
    console.log("byCause", m.byCause);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
