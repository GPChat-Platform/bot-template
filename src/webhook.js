'use strict';
/**
 * Serveur HTTP du mode webhook (sans framework : node:http suffit).
 *
 *  POST /gpchat/webhook   événements GPChat. Le corps BRUT est vérifié (HMAC-SHA256) AVANT tout traitement ;
 *                         on répond 200 tout de suite (GPChat attend < 10 s) et on traite ensuite.
 *  GET  /healthz          sonde de santé pour votre hébergeur / votre supervision.
 *
 * Pendant une rotation de secret, GPChat envoie deux signatures ; `secrets` accepte plusieurs valeurs.
 */
const http = require('node:http');
const { verifyWebhookSignature } = require('./lib/gpchat-bot');

const MAX_BODY = 1024 * 1024; // 1 Mo : un événement GPChat est bien plus petit

function createWebhookServer({ secrets, onEvent, logger }) {
  return http.createServer((req, res) => {
    const reply = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const url = (req.url || '').split('?')[0];
    if (req.method === 'GET' && url === '/healthz') return reply(200, { ok: true });
    if (req.method !== 'POST' || url !== '/gpchat/webhook') return reply(404, { error: 'not found' });

    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reply(413, { error: 'too large' });
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (size > MAX_BODY) return;
      const raw = Buffer.concat(chunks);
      if (!verifyWebhookSignature(raw, req.headers['x-gpchat-signature'], secrets)) {
        logger.warn('signature de webhook invalide');
        return reply(401, { error: 'invalid signature' });
      }
      let event;
      try {
        event = JSON.parse(raw.toString('utf8'));
      } catch {
        return reply(400, { error: 'invalid json' });
      }
      reply(200, { ok: true }); // accusé de réception immédiat…
      Promise.resolve(onEvent(event)).catch((e) => logger.error('webhook : échec de traitement', { error: e.message })); // …puis traitement
    });
  });
}

module.exports = { createWebhookServer };
