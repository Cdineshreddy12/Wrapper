/**
 * Thin loader: show "Loading app" quickly, then load Fastify + app in app-fastify.js
 */
import './run-prelude.js';

export default (async () => {
  const m = await import('./app-fastify.js');
  return m.run();
})();
