import { BrowserRuntime } from "../runtime";

async function runBenchmark() {
  const runtime = new BrowserRuntime({ worker: true });
  await runtime.ready();

  const start = performance.now();
  console.log("--- Browser Runtime Benchmark ---");

  // Simulated workload
  const iterations = 10;
  for (let i = 0; i < iterations; i++) {
    // In a real environment, we'd process actual files.
    // Here we measure the orchestration overhead.
    await runtime.execute(
      {
        input: "placeholder.jpg",
        operations: [{ type: "resize", width: 100 } as any],
      },
      {
        "placeholder.jpg": new Uint8Array(1024 * 1024), // 1MB
      }
    );
  }

  const end = performance.now();
  const avg = (end - start) / iterations;
  console.log(`Average execution time (orchestration + setup): ${avg.toFixed(2)}ms`);

  await runtime.terminate();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmark().catch(console.error);
}
