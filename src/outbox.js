'use strict';
/**
 * File d'envoi qui respecte la limite de l'API : 60 requêtes par minute et par clé par défaut (HTTP 429 au-delà).
 * Tous les envois passent par ici : ils sont espacés d'au moins `intervalMs` et exécutés dans l'ordre.
 * Une erreur d'un envoi n'arrête pas la file (elle est renvoyée à l'appelant de CET envoi).
 *
 * Pour un quota relevé (demandez-le à GPChat), baissez `intervalMs`.
 */
class Outbox {
  constructor(bot, { intervalMs = 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now } = {}) {
    this.bot = bot;
    this.interval = intervalMs;
    this.sleep = sleep;
    this.now = now;
    this.tail = Promise.resolve();
    this.lastAt = 0;
  }

  /** Planifie `fn` (une fonction qui appelle l'API) dans la file. */
  schedule(fn) {
    const run = async () => {
      const wait = this.lastAt + this.interval - this.now();
      if (wait > 0) await this.sleep(wait);
      this.lastAt = this.now();
      return fn();
    };
    const result = this.tail.then(run, run);
    this.tail = result.catch(() => {}); // la file continue même si cet envoi échoue
    return result;
  }

  /** Message texte vers un chat { to } ou { groupId }. options : { markdown, buttons, replyToMsgId, mentionedUserIds } */
  text(chat, content, options = {}) {
    return this.schedule(() => (chat.groupId ? this.bot.sendGroupMessage(chat.groupId, content, options) : this.bot.sendMessage(chat.to, content, options)));
  }

  /** Autres types de messages (image, document, position…) : corps de l'API tel quel. */
  raw(chat, body) {
    return this.schedule(() => this.bot.send({ ...(chat.groupId ? { groupId: chat.groupId } : { to: chat.to }), ...body }));
  }

  edit(chat, msgId, patch) {
    return this.schedule(() => this.bot.editMessage(chat, msgId, patch));
  }

  /** « écrit… » : n'attend pas la fin de la durée et n'échoue jamais (cosmétique). */
  typing(chat, seconds = 3) {
    if (chat.groupId) return Promise.resolve(); // l'API ne propose « écrit… » qu'en conversation privée
    return this.schedule(() => this.bot.sendChatAction(chat.to, 'typing', seconds)).catch(() => {});
  }
}

module.exports = { Outbox };
