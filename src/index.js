'use strict';
/**
 * Point d'entrée : lit la configuration, assemble les pièces et démarre en mode polling ou webhook.
 *
 *   npm start                  démarre le bot
 *   node src/index.js --check  vérifie la configuration puis quitte (utile en CI / avant un déploiement)
 */
const { GPChatBot, button } = require('./lib/gpchat-bot');
const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { Outbox } = require('./outbox');
const { Dedupe } = require('./dedupe');
const { createStore } = require('./store');
const { createRouter } = require('./handlers');
const { createWebhookServer } = require('./webhook');

function main() {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const logger = createLogger({ level: config.logLevel });
  if (process.argv.includes('--check')) {
    logger.info('configuration valide', { mode: config.mode });
    return;
  }

  const bot = new GPChatBot({ apiKey: config.apiKey, baseUrl: config.baseUrl });
  const store = createStore(config.dataDir, { lang: config.defaultLang });
  const router = createRouter({ outbox: new Outbox(bot), store, config, logger, dedupe: new Dedupe(), button });

  let stop = () => {};
  if (config.mode === 'webhook') {
    const server = createWebhookServer({ secrets: config.webhookSecrets, onEvent: router.handle, logger });
    server.listen(config.port, () => logger.info('webhook en écoute', { port: config.port, path: '/gpchat/webhook' }));
    stop = () => server.close();
  } else {
    // Polling : le bot interroge GPChat (long polling 20 s) — aucun serveur public, aucun tunnel. Activez-le avec
    // « /setmode polling » dans @gpchat_forge. L'appel à /v1/updates valide aussi la publication du bot.
    stop = bot.poll(router.handle, { timeout: 20, onError: (e) => logger.warn('polling', { error: e.message }) });
    logger.info('polling démarré');
  }

  // Arrêt propre : on cesse d'écouter puis on enregistre l'état.
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      logger.info('arrêt', { signal: sig });
      stop();
      if (store.flush) store.flush();
      process.exit(0);
    });
  }
}

if (require.main === module) main();

module.exports = { main };
