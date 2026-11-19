'use strict';
/**
 * Les commandes du bot. C'est ICI que vous écrivez votre bot : chaque entrée est
 *
 *   nom: { description: { fr, en }, adminOnly?: boolean, run: async (ctx) => { … } }
 *
 * `ctx` fournit :
 *   ctx.args       texte après la commande (« /echo bonjour » → « bonjour »)
 *   ctx.lang       langue de l'utilisateur ('fr' | 'en')
 *   ctx.userId     identifiant GPChat de l'expéditeur
 *   ctx.isGroup    true si le message vient d'un groupe
 *   ctx.reply(text, options)        répond (Markdown activé) dans la même conversation
 *   ctx.replyImage(url, caption, buttons)  répond avec une image
 *   ctx.typing()   affiche « écrit… » (conversation privée)
 *   ctx.t(key, params)              texte traduit
 *   ctx.store      préférences persistantes de l'utilisateur : ctx.prefs / ctx.setPrefs(patch)
 *   ctx.button     fabrique de boutons : button.callback(texte, donnée) / button.link(texte, url)
 *
 * Les `description` alimentent /help ET la liste de commandes à enregistrer dans le profil du bot
 * (voir `npm run commands`, qui affiche le JSON à coller dans bot.json / la console).
 */
const commands = {
  start: {
    description: { fr: 'Démarrer le bot', en: 'Start the bot' },
    run: async (ctx) => ctx.reply(ctx.t('welcome'), {
      buttons: [[ctx.button.callback('➕ Compteur / Counter', 'counter:0'), ctx.button.link(ctx.t('linkButton'), 'https://gpchat.app/en/developers/docs')]],
    }),
  },

  help: {
    description: { fr: 'Liste des commandes', en: 'List the commands' },
    run: async (ctx) => {
      const lines = Object.entries(commands)
        .filter(([, c]) => !c.adminOnly || ctx.isAdmin)
        .map(([name, c]) => `• \`/${name}\` — ${c.description[ctx.lang] || c.description.fr}`);
      return ctx.reply(`${ctx.t('help')}\n${lines.join('\n')}`);
    },
  },

  ping: {
    description: { fr: 'Vérifier que le bot répond', en: 'Check that the bot answers' },
    run: async (ctx) => ctx.reply(ctx.t('pong')),
  },

  echo: {
    description: { fr: 'Répète votre texte : /echo bonjour', en: 'Repeats your text: /echo hello' },
    run: async (ctx) => {
      if (!ctx.args) return ctx.reply(ctx.t('echoUsage'));
      // Le texte vient d'un utilisateur : on le renvoie SANS Markdown pour qu'il ne puisse pas mettre en forme (ni piéger) ma réponse.
      return ctx.reply(`${ctx.t('echo')} ${ctx.args}`, { markdown: false });
    },
  },

  counter: {
    description: { fr: 'Démo de boutons : un compteur modifiable', en: 'Buttons demo: an editable counter' },
    run: async (ctx) => ctx.reply(ctx.t('counter', { n: 0 }), { buttons: counterButtons(ctx, 0) }),
  },

  typing: {
    description: { fr: 'Démo « écrit… » puis réponse', en: 'Demo of “typing…” then an answer' },
    run: async (ctx) => {
      await ctx.typing();
      return ctx.reply('✍️ …');
    },
  },

  lang: {
    description: { fr: 'Changer de langue : /lang fr ou en', en: 'Change language: /lang fr or en' },
    run: async (ctx) => {
      const v = ctx.args.toLowerCase();
      if (v !== 'fr' && v !== 'en') return ctx.reply(ctx.t('langBad'));
      ctx.setPrefs({ lang: v });
      return ctx.reply(ctx.tIn(v, 'langSet'));
    },
  },

  whoami: {
    description: { fr: 'Afficher votre identifiant GPChat', en: 'Show your GPChat id' },
    run: async (ctx) => ctx.reply(ctx.t('whoami', { id: ctx.userId })),
  },

  stats: {
    description: { fr: 'Statistiques du bot (administrateurs)', en: 'Bot statistics (admins)' },
    adminOnly: true,
    run: async (ctx) => ctx.reply(`👥 ${ctx.stats().users} • ⏱️ ${Math.round(process.uptime())} s`),
  },
};

function counterButtons(ctx, n) {
  return [[ctx.button.callback(ctx.t('counterButtonPlus'), `counter:${n + 1}`), ctx.button.callback(ctx.t('counterButtonReset'), 'counter:0')]];
}

/**
 * Boutons : quand l'utilisateur appuie sur un bouton `callbackData`, le bot reçoit un événement
 * `callback.received`. La donnée suit la convention « préfixe:valeur » ; on la route ici par préfixe.
 * `ctx.editMessage(patch)` modifie le message qui porte le bouton (texte et/ou boutons).
 */
const callbacks = {
  counter: async (ctx, value) => {
    const n = Math.max(0, Math.min(999, Number.parseInt(value, 10) || 0)); // ne jamais faire confiance à la donnée reçue
    await ctx.editMessage({ content: ctx.t('counter', { n }), buttons: counterButtons(ctx, n) });
  },
};

module.exports = { commands, callbacks };
