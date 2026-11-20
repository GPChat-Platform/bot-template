'use strict';
/**
 * Configuration du bot, lue depuis les variables d'environnement (jamais depuis le code).
 * Les erreurs sont claires et groupées : on préfère échouer au démarrage plutôt qu'au premier message.
 *
 * Variables :
 *   GPCHAT_API_KEY         (obligatoire)  clé API du bot — console développeur → Identifiants
 *   GPCHAT_MODE            polling (défaut) | webhook
 *   GPCHAT_WEBHOOK_SECRET  (mode webhook)  secret de signature ; plusieurs valeurs séparées par des virgules
 *                          acceptées pendant une rotation de secret
 *   PORT                   port HTTP du mode webhook (défaut 8080)
 *   DATA_DIR               dossier de persistance (défaut ./data) ; vide = mémoire seulement
 *   ADMIN_IDS              userId des administrateurs du bot, séparés par des virgules (commandes réservées)
 *   DEFAULT_LANG           fr (défaut) | en
 *   LOG_LEVEL              debug | info (défaut) | warn | error
 *   BOT_USERNAME           @nom du bot (facultatif) : en groupe, les commandes « /cmd@autre_bot » sont ignorées
 *   CONCURRENCY            conversations traitées en parallèle en mode polling (défaut 16 ; l'ordre est
 *                          toujours respecté DANS une conversation)
 *   GPCHAT_BASE_URL        pour pointer vers un autre environnement (rare)
 */
const MODES = ['polling', 'webhook'];
const LANGS = ['fr', 'en'];

function list(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadConfig(env = process.env) {
  const errors = [];
  const mode = (env.GPCHAT_MODE || 'polling').toLowerCase();
  if (!MODES.includes(mode)) errors.push(`GPCHAT_MODE doit valoir ${MODES.join(' ou ')} (reçu : « ${env.GPCHAT_MODE} »)`);
  if (!env.GPCHAT_API_KEY) errors.push('GPCHAT_API_KEY est obligatoire (console développeur → Identifiants)');
  const secrets = list(env.GPCHAT_WEBHOOK_SECRET);
  if (mode === 'webhook' && secrets.length === 0) errors.push('GPCHAT_WEBHOOK_SECRET est obligatoire en mode webhook');
  const port = Number(env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push(`PORT invalide : « ${env.PORT} »`);
  const concurrency = Number(env.CONCURRENCY || 16);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 256) errors.push(`CONCURRENCY doit être un entier entre 1 et 256 (reçu : « ${env.CONCURRENCY} »)`);
  const lang = (env.DEFAULT_LANG || 'fr').toLowerCase();
  if (!LANGS.includes(lang)) errors.push(`DEFAULT_LANG doit valoir ${LANGS.join(' ou ')}`);

  if (errors.length) {
    const err = new Error(`Configuration invalide :\n  - ${errors.join('\n  - ')}`);
    err.name = 'ConfigError';
    throw err;
  }
  return {
    mode,
    apiKey: env.GPCHAT_API_KEY,
    webhookSecrets: secrets,
    port,
    concurrency,
    dataDir: env.DATA_DIR === undefined ? './data' : env.DATA_DIR,
    adminIds: list(env.ADMIN_IDS),
    botUsername: (env.BOT_USERNAME || '').replace(/^@/, '').toLowerCase() || undefined,
    defaultLang: lang,
    logLevel: (env.LOG_LEVEL || 'info').toLowerCase(),
    baseUrl: env.GPCHAT_BASE_URL || undefined,
  };
}

module.exports = { loadConfig };
