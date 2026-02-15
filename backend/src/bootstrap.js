/**
 * Entry point: logs immediately, then loads app.js.
 * If you see ECANCELED after "Loading app", nodemon restarted during load — run once: npm start
 */
process.stdout.write('🚀 Backend starting...\n');
await new Promise((r) => setImmediate(r));
process.stdout.write('📦 Loading app...\n');
await new Promise((r) => setImmediate(r));

const loadPromise = import('./app.js');
const progress = setInterval(() => {
  process.stdout.write('   … still loading\n');
}, 5000);
try {
  const appModule = await loadPromise;
  clearInterval(progress);
  if (appModule.default && typeof appModule.default.then === 'function') {
    await appModule.default;
  }
} finally {
  clearInterval(progress);
}
