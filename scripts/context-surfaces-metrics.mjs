import puppeteer from 'puppeteer';

const targetUrl = process.env.CONTEXT_SURFACE_URL || 'http://localhost:3000/dev/ui';
const cycles = Number.parseInt(process.env.CONTEXT_SURFACE_CYCLES || '20', 10);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60_000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Ouvrir la surface 4B.2')));

  const collect = () => page.evaluate(() => ({
    nodes: document.querySelectorAll('*').length,
    resources: performance.getEntriesByType('resource').length,
    heap: performance.memory?.usedJSHeapSize ?? null,
  }));

  await page.evaluate(() => globalThis.gc?.());
  const before = await collect();
  const openLatencies = [];
  let openNodes = before.nodes;

  for (let index = 0; index < cycles; index += 1) {
    const latency = await page.evaluate(() => new Promise((resolve, reject) => {
      const trigger = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Ouvrir la surface 4B.2'));
      if (!(trigger instanceof HTMLButtonElement)) {
        reject(new Error('Context surface trigger not found'));
        return;
      }
      const startedAt = performance.now();
      const observer = new MutationObserver(() => {
        if (!document.querySelector('[role="dialog"]')) return;
        observer.disconnect();
        resolve(performance.now() - startedAt);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      trigger.click();
    }));
    openLatencies.push(latency);
    if (index === 0) openNodes = (await collect()).nodes;

    await page.evaluate(() => new Promise((resolve, reject) => {
      const close = document.querySelector('[role="dialog"] button[aria-label="Fermer"]');
      if (!(close instanceof HTMLButtonElement)) {
        reject(new Error('Context surface close button not found'));
        return;
      }
      const observer = new MutationObserver(() => {
        if (document.querySelector('[role="dialog"]')) return;
        observer.disconnect();
        resolve();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      close.click();
    }));
  }

  const client = await page.createCDPSession();
  await client.send('HeapProfiler.collectGarbage');
  const after = await collect();
  const sorted = [...openLatencies].sort((a, b) => a - b);
  const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];

  process.stdout.write(`${JSON.stringify({
    targetUrl,
    cycles,
    openingMs: {
      p50: Number(percentile(0.5).toFixed(2)),
      p95: Number(percentile(0.95).toFixed(2)),
      min: Number(sorted[0].toFixed(2)),
      max: Number(sorted.at(-1).toFixed(2)),
    },
    domNodes: { closed: before.nodes, open: openNodes, after: after.nodes, deltaAfter: after.nodes - before.nodes },
    requests: { before: before.resources, after: after.resources, delta: after.resources - before.resources },
    heapBytes: before.heap === null || after.heap === null
      ? null
      : { before: before.heap, after: after.heap, delta: after.heap - before.heap },
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
