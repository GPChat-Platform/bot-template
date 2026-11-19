'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConfig } = require('../src/config');
const { Dedupe } = require('../src/dedupe');
const { Outbox } = require('../src/outbox');
const { MemoryStore, FileStore, createStore } = require('../src/store');
const { createRouter, parseCommand } = require('../src/handlers');
const { createWebhookServer } = require('../src/webhook');
const { button, verifyWebhookSignature } = require('../src/lib/gpchat-bot');
const crypto = require('node:crypto');

const silent = { debug() {}, info() {}, warn() {}, error() {} };

/** Un bot factice qui enregistre ce qu'on lui demande d'envoyer. */
function fakeBot() {
  const sent = [];
  return {
    sent,
    sendMessage: async (to, text, o) => sent.push({ kind: 'dm', to, text, o }),
    sendGroupMessage: async (groupId, text, o) => sent.push({ kind: 'group', groupId, text, o }),
    send: async (body) => sent.push({ kind: 'raw', body }),
    editMessage: async (chat, msgId, patch) => sent.push({ kind: 'edit', chat, msgId, patch }),
    sendChatAction: async (to, action) => sent.push({ kind: 'typing', to, action }),
  };
}

function setup(over = {}) {
  const bot = fakeBot();
  const config = { adminIds: ['admin'], defaultLang: 'fr', ...over.config };
  const store = new MemoryStore({ lang: config.defaultLang });
  const outbox = new Outbox(bot, { intervalMs: 0 });
  const router = createRouter({ outbox, store, config, logger: silent, dedupe: new Dedupe(), button });
  const dm = (textMsg, from = 'u1', msgId = `m${Math.random()}`) =>
    router.handle({ type: 'message.received', data: { from, chatId: from, type: 'text', textMsg, msgId } });
  return { bot, store, router, dm };
}

test('config : valeurs par défaut, erreurs groupées et claires', () => {
  const ok = loadConfig({ GPCHAT_API_KEY: 'k' });
  assert.equal(ok.mode, 'polling');
  assert.equal(ok.port, 8080);
  assert.deepEqual(ok.adminIds, []);
  assert.throws(() => loadConfig({}), /GPCHAT_API_KEY est obligatoire/);
  assert.throws(() => loadConfig({ GPCHAT_API_KEY: 'k', GPCHAT_MODE: 'webhook' }), /GPCHAT_WEBHOOK_SECRET est obligatoire/);
  assert.throws(() => loadConfig({ GPCHAT_API_KEY: 'k', GPCHAT_MODE: 'x', PORT: '0' }), (e) => e.name === 'ConfigError' && /GPCHAT_MODE/.test(e.message) && /PORT/.test(e.message));
  const wh = loadConfig({ GPCHAT_API_KEY: 'k', GPCHAT_MODE: 'webhook', GPCHAT_WEBHOOK_SECRET: 'a, b', ADMIN_IDS: 'u1,u2' });
  assert.deepEqual(wh.webhookSecrets, ['a', 'b']);
  assert.deepEqual(wh.adminIds, ['u1', 'u2']);
});

test('dedupe : un identifiant n\'est traité qu\'une fois, puis oublié après le délai', () => {
  let t = 0;
  const d = new Dedupe({ ttlMs: 1000, now: () => t });
  assert.equal(d.check('a'), false);
  assert.equal(d.check('a'), true);
  assert.equal(d.check(undefined), false, 'sans identifiant : on traite');
  t = 1001;
  assert.equal(d.check('a'), false, 'expiré');
  const small = new Dedupe({ max: 2 });
  small.check('1'); small.check('2'); small.check('3');
  assert.equal(small.check('1'), false, 'le plus ancien a été évincé');
});

test('outbox : envois espacés et dans l\'ordre, une erreur n\'arrête pas la file', async () => {
  const calls = [];
  let clock = 0;
  const waits = [];
  const outbox = new Outbox({ sendMessage: async (to, text) => { calls.push(text); if (text === 'boom') throw new Error('KO'); } }, {
    intervalMs: 100, now: () => clock, sleep: async (ms) => { waits.push(ms); clock += ms; },
  });
  const a = outbox.text({ to: 'u' }, 'a');
  const b = outbox.text({ to: 'u' }, 'boom');
  const c = outbox.text({ to: 'u' }, 'c');
  await a;
  await assert.rejects(b, /KO/);
  await c;
  assert.deepEqual(calls, ['a', 'boom', 'c']);
  assert.ok(waits.length >= 2 && waits.every((w) => w <= 100));
});

test('store : mémoire, fichier atomique, relecture', () => {
  const m = new MemoryStore({ lang: 'fr' });
  assert.equal(m.get('u').lang, 'fr');
  m.update('u', { lang: 'en' });
  assert.equal(m.get('u').lang, 'en');
  assert.equal(m.get('autre').lang, 'fr');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl-'));
  const f = createStore(dir, { lang: 'fr' });
  assert.ok(f instanceof FileStore);
  f.update('u', { lang: 'en' });
  f.flush();
  assert.equal(createStore(dir, { lang: 'fr' }).get('u').lang, 'en');
  assert.ok(createStore('', {}) instanceof MemoryStore);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('parseCommand : commandes, suffixe @bot, arguments, texte libre', () => {
  assert.deepEqual(parseCommand('/echo bonjour le monde'), { name: 'echo', args: 'bonjour le monde' });
  assert.deepEqual(parseCommand('/START@mon_bot'), { name: 'start', args: '' });
  assert.equal(parseCommand('bonjour'), null);
  assert.equal(parseCommand(''), null);
});

test('commandes : /start avec boutons, /help généré, /ping, /echo sans Markdown', async () => {
  const { bot, dm } = setup();
  await dm('/start');
  assert.match(bot.sent[0].text, /modèle/);
  assert.equal(bot.sent[0].o.buttons[0][0].callbackData, 'counter:0');
  assert.equal(bot.sent[0].o.buttons[0][1].url, 'https://gpchat.app/en/developers/docs');
  await dm('/help');
  assert.match(bot.sent[1].text, /`\/echo`/);
  assert.doesNotMatch(bot.sent[1].text, /\/stats/, 'commande admin masquée aux autres');
  await dm('/ping');
  assert.equal(bot.sent[2].text, 'pong 🏓');
  await dm('/echo **gras** piégé');
  assert.equal(bot.sent[3].o.markdown, false);
  await dm('/echo');
  assert.match(bot.sent[4].text, /Utilisation/);
  await dm('/inconnue');
  assert.match(bot.sent[5].text, /inconnue/i);
  await dm('un message libre');
  assert.match(bot.sent[6].text, /Commande inconnue/);
});

test('langue : préférence mémorisée par utilisateur', async () => {
  const { bot, dm, store } = setup();
  await dm('/lang en', 'u1');
  assert.equal(store.get('u1').lang, 'en');
  await dm('/ping', 'u1');
  await dm('/help', 'u1');
  assert.match(bot.sent.at(-1).text, /Commands/);
  await dm('/help', 'u2');
  assert.match(bot.sent.at(-1).text, /Commandes/);
  await dm('/lang xx', 'u2');
  assert.match(bot.sent.at(-1).text, /Langues disponibles/);
});

test('administrateurs : /stats réservée', async () => {
  const { bot, dm } = setup();
  await dm('/stats', 'u1');
  assert.match(bot.sent.at(-1).text, /réservée/);
  await dm('/stats', 'admin');
  assert.match(bot.sent.at(-1).text, /👥/);
  await dm('/help', 'admin');
  assert.match(bot.sent.at(-1).text, /\/stats/);
});

test('boutons : le compteur se modifie, la donnée reçue est bornée', async () => {
  const { bot, router } = setup();
  const click = (data) => router.handle({ type: 'callback.received', data: { from: 'u1', chatId: 'u1', msgId: 'M1', data } });
  await click('counter:5');
  const e = bot.sent.at(-1);
  assert.equal(e.kind, 'edit');
  assert.equal(e.msgId, 'M1');
  assert.match(e.patch.content, /\*\*5\*\*/);
  assert.equal(e.patch.buttons[0][0].callbackData, 'counter:6');
  await click('counter:999999999');
  assert.match(bot.sent.at(-1).patch.content, /\*\*999\*\*/);
  await click('counter:abc');
  assert.match(bot.sent.at(-1).patch.content, /\*\*0\*\*/);
  const n = bot.sent.length;
  await click('inconnu:1');
  assert.equal(bot.sent.length, n, 'préfixe inconnu ignoré');
});

test('groupes : silence sauf commande ou mention ; réponse dans le groupe', async () => {
  const { bot, router } = setup();
  const g = (textMsg, isMentioned = false, msgId = `g${Math.random()}`) =>
    router.handle({ type: 'group_message.received', data: { from: 'u1', groupId: 'G1', type: 'text', textMsg, isMentioned, msgId } });
  await g('salut tout le monde');
  assert.equal(bot.sent.length, 0);
  await g('/ping');
  assert.equal(bot.sent.at(-1).groupId, 'G1');
  await g('hé le bot', true);
  assert.equal(bot.sent.at(-1).kind, 'group');
});

test('dédoublonnage : un même msgId n\'est traité qu\'une fois', async () => {
  const { bot, dm } = setup();
  await dm('/ping', 'u1', 'M-DOUBLON');
  await dm('/ping', 'u1', 'M-DOUBLON');
  assert.equal(bot.sent.length, 1);
});

test('message non texte : réponse polie ; ping et types inconnus ignorés', async () => {
  const { bot, router } = setup();
  await router.handle({ type: 'message.received', data: { from: 'u1', chatId: 'u1', type: 'image', textMsg: '', msgId: 'I1' } });
  assert.match(bot.sent.at(-1).text, /texte/);
  const n = bot.sent.length;
  await router.handle({ type: 'ping', data: {} });
  await router.handle({ type: 'futur.evenement', data: { from: 'u1' } });
  assert.equal(bot.sent.length, n);
});

test('erreur dans une commande : message poli, pas de plantage', async () => {
  const bot = fakeBot();
  bot.sendMessage = async (to, text) => { if (text.startsWith('pong')) throw new Error('API KO'); bot.sent.push({ to, text }); };
  const store = new MemoryStore({ lang: 'fr' });
  const router = createRouter({ outbox: new Outbox(bot, { intervalMs: 0 }), store, config: { adminIds: [], defaultLang: 'fr' }, logger: silent, dedupe: new Dedupe(), button });
  await router.handle({ type: 'message.received', data: { from: 'u1', chatId: 'u1', type: 'text', textMsg: '/ping', msgId: 'E1' } });
  assert.match(bot.sent.at(-1).text, /erreur/i);
});

async function startWebhook(onEvent) {
  const server = createWebhookServer({ secrets: ['s3cret', 'ancien'], onEvent, logger: silent });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
const sign = (secret, raw, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}`;

test('webhook : signature valide acceptée (y compris l\'ancien secret), invalide refusée, rejeu refusé', async () => {
  const got = [];
  const { server, base } = await startWebhook(async (e) => { got.push(e); });
  const body = JSON.stringify({ type: 'message.received', data: { from: 'u1' } });
  const post = (headers) => fetch(`${base}/gpchat/webhook`, { method: 'POST', body, headers });
  assert.equal((await post({ 'x-gpchat-signature': sign('s3cret', body) })).status, 200);
  assert.equal((await post({ 'x-gpchat-signature': sign('ancien', body) })).status, 200, 'rotation de secret');
  assert.equal((await post({ 'x-gpchat-signature': sign('mauvais', body) })).status, 401);
  assert.equal((await post({})).status, 401);
  assert.equal((await post({ 'x-gpchat-signature': sign('s3cret', body, Math.floor(Date.now() / 1000) - 3600) })).status, 401, 'horodatage trop ancien');
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(got.length, 2);
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
  assert.equal((await fetch(`${base}/autre`)).status, 404);
  const bad = 'pas du json';
  assert.equal((await fetch(`${base}/gpchat/webhook`, { method: 'POST', body: bad, headers: { 'x-gpchat-signature': sign('s3cret', bad) } })).status, 400);
  server.close();
});

test('webhook : l\'accusé de réception ne dépend pas du traitement', async () => {
  let release;
  const slow = new Promise((r) => { release = r; });
  const { server, base } = await startWebhook(() => slow);
  const body = '{}';
  const t0 = Date.now();
  const res = await fetch(`${base}/gpchat/webhook`, { method: 'POST', body, headers: { 'x-gpchat-signature': sign('s3cret', body) } });
  assert.equal(res.status, 200);
  assert.ok(Date.now() - t0 < 1000);
  release();
  server.close();
});

test('SDK embarqué : vérification de signature directe', () => {
  const raw = '{"a":1}';
  assert.equal(verifyWebhookSignature(raw, sign('k', raw), 'k'), true);
  assert.equal(verifyWebhookSignature(raw, sign('k', raw), 'autre'), false);
});

