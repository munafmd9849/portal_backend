import base from './playwright.config.js';

/** Reuse SQLite E2E suite against isolated PostgreSQL (E2E_DB=postgres). */
export default {
  ...base,
  webServer: base.webServer.map((server) => {
    if (!server.cwd?.endsWith('backend')) return server;
    return {
      ...server,
      command: 'node scripts/seed-e2e.js && node src/server.js',
      env: {
        ...server.env,
        E2E_DB: 'postgres',
      },
    };
  }),
};
