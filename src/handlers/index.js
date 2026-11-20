'use strict';
/**
 * Le routeur : reçoit un événement GPChat (polling ou webhook, même format) et le transforme en appel de commande.
 *
 * Règles que GPChat attend d'un bon bot (voir https://gpchat.app/en/developers/docs#bot-rules) :
 *  - un bot RÉPOND, il ne démarche pas : on ne répond qu'à un message reçu ;
 *  - dans un groupe, on ne répond qu'aux commandes ou quand le bot est mentionné — jamais à toute la conversation ;
 *  - un même événement peut arriver deux fois : dédoublonnage par `msgId` (ou `id` d'événement) ;
 *  - on ne plante jamais sur une erreur : message poli à l'utilisateur, détail dans les journaux.
 */
const { commands, callbacks } = require('./commands');
const { t } = require('../i18n');

/**
 * « /echo@mon_bot bonjour » → { name: 'echo', args: 'bonjour', bot: 'mon_bot' } ; texte sans « / » → null.
 * En groupe, « /commande@nom_du_bot » ne concerne QUE ce bot (convention Telegram) ; la plateforme ne le remet
 * qu'à lui, et le routeur l'ignore aussi si BOT_USERNAME est renseigné (protection supplémentaire).
 */
function parseCommand(text) {
  const m = /^\/([a-zA-Z0-9_]{1,32})(?:@(\w+))?(?:\s+([\s\S]*))?$/.exec(String(text || '').trim());
  if (!m) return null;
  const cmd = { name: m[1].toLowerCase(), args: (m[3] || '').trim() };
  if (m[2]) cmd.bot = m[2].toLowerCase();
  return cmd;
}

function createRouter({ outbox, store, config, logger, dedupe, button }) {
  const stats = () => ({ users: store.users ? store.users.size : 0 });

  function makeContext({ chat, userId, args = '', msgId, isGroup }) {
    const prefs = store.get(userId);
    const lang = prefs.lang || config.defaultLang;
    return {
      args, userId, lang, isGroup, prefs, button, msgId,
      isAdmin: config.adminIds.includes(userId),
      t: (key, params) => t(lang, key, params),
      tIn: (other, key, params) => t(other, key, params),
      setPrefs: (patch) => store.update(userId, patch),
      stats,
      reply: (text, options = {}) => outbox.text(chat, text, { markdown: true, ...options }),
      replyImage: (fileUrl, caption, buttons) => outbox.raw(chat, { type: 'image', fileUrl, caption, buttons }),
      typing: () => outbox.typing(chat),
      editMessage: (patch) => outbox.edit(chat, msgId, patch),
    };
  }

  async function onMessage(update) {
    const d = update.data || {};
    if (!d.from) return;
    const isGroup = update.type === 'group_message.received';
    const chat = isGroup ? { groupId: d.groupId } : { to: d.chatId || d.from };
    const cmd = d.type === 'text' ? parseCommand(d.textMsg) : null;

    if (isGroup && !cmd && !d.isMentioned) return; // règle d'or en groupe : silence sauf commande ou mention
    // Commande adressée à un autre bot du groupe (« /aide@autre_bot ») : pas pour nous.
    if (isGroup && cmd && cmd.bot && config.botUsername && cmd.bot !== config.botUsername) return;
    const base = { chat, userId: d.from, msgId: d.msgId, isGroup };

    if (!cmd) {
      // Message libre en privé (ou mention en groupe) : ici, un simple rappel d'aide. Remplacez par votre logique (IA, recherche…).
      const ctx = makeContext(base);
      return ctx.reply(d.type === 'text' ? ctx.t('unknown') : ctx.t('notText'));
    }
    const def = commands[cmd.name];
    const ctx = makeContext({ ...base, args: cmd.args });
    if (!def) return ctx.reply(ctx.t('unknown'));
    if (def.adminOnly && !ctx.isAdmin) return ctx.reply(ctx.t('adminOnly'));
    return def.run(ctx);
  }

  async function onCallback(update) {
    const d = update.data || {};
    if (!d.from) return;
    const chat = d.groupId ? { groupId: d.groupId } : { to: d.chatId || d.from };
    const [prefix, ...rest] = String(d.data || '').split(':');
    const handler = callbacks[prefix];
    if (!handler) return;
    await handler(makeContext({ chat, userId: d.from, msgId: d.msgId, isGroup: Boolean(d.groupId) }), rest.join(':'));
  }

  /** Point d'entrée unique : une mise à jour GPChat (voir « Événements et charge utile » dans la documentation). */
  async function handle(update) {
    try {
      const id = update.data && update.data.msgId ? `${update.type}:${update.data.msgId}` : update.id;
      if (update.type !== 'callback.received' && dedupe.check(id)) {
        logger.debug('événement déjà traité', { id });
        return;
      }
      if (update.type === 'message.received' || update.type === 'group_message.received') await onMessage(update);
      else if (update.type === 'callback.received') await onCallback(update);
      // 'ping' et types inconnus : ignorés sans bruit (GPChat ajoutera de nouveaux types avec le temps)
    } catch (e) {
      logger.error('échec de traitement', { type: update.type, error: e.message });
      const d = update.data || {};
      const chat = d.groupId ? { groupId: d.groupId } : d.from ? { to: d.chatId || d.from } : null;
      if (chat) {
        const lang = store.get(d.from).lang || config.defaultLang;
        await outbox.text(chat, t(lang, 'error'), {}).catch(() => {});
      }
    }
  }

  return { handle, parseCommand };
}

module.exports = { createRouter, parseCommand };
