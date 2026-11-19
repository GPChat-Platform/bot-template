'use strict';
/**
 * Journal minimal : une ligne par événement, JSON en production (facile à envoyer vers Graylog/Loki/Datadog),
 * lisible en développement. Ne journalisez jamais de secret (clé API, jetons) ni le contenu des messages privés.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function createLogger({ level = 'info', json = process.env.NODE_ENV === 'production', out = console } = {}) {
  const min = LEVELS[level] ?? LEVELS.info;
  const log = (lvl, msg, fields) => {
    if (LEVELS[lvl] < min) return;
    const line = json
      ? JSON.stringify({ t: new Date().toISOString(), level: lvl, msg, ...fields })
      : `${new Date().toISOString()} ${lvl.toUpperCase().padEnd(5)} ${msg}${fields ? ` ${JSON.stringify(fields)}` : ''}`;
    (lvl === 'error' || lvl === 'warn' ? out.error : out.log)(line);
  };
  return {
    debug: (m, f) => log('debug', m, f),
    info: (m, f) => log('info', m, f),
    warn: (m, f) => log('warn', m, f),
    error: (m, f) => log('error', m, f),
  };
}

module.exports = { createLogger };
