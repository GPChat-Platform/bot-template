'use strict';
/**
 * Textes de l'interface, par langue. Ajoutez une langue en copiant un bloc ; `t()` retombe sur le français
 * si une clé manque. L'utilisateur choisit sa langue avec /lang (préférence conservée dans le store).
 */
const STRINGS = {
  fr: {
    welcome: 'Bonjour ! Je suis un bot **modèle** GPChat. Tapez /help pour voir ce que je sais faire.',
    help: '**Commandes**',
    unknown: 'Commande inconnue. Tapez /help.',
    pong: 'pong 🏓',
    echo: 'Vous avez dit :',
    echoUsage: 'Utilisation : `/echo votre texte`',
    counter: 'Compteur : **{n}**',
    counterButtonPlus: '➕ Ajouter',
    counterButtonReset: '↺ Remettre à zéro',
    langSet: 'Langue : français.',
    langBad: 'Langues disponibles : `fr`, `en`.',
    whoami: 'Votre identifiant : `{id}`',
    adminOnly: 'Commande réservée aux administrateurs du bot.',
    notText: 'Je ne sais lire que le texte pour l’instant 🙂',
    error: 'Une erreur est survenue. Réessayez dans un instant.',
    linkButton: 'Documentation',
  },
  en: {
    welcome: 'Hello! I am the GPChat **template** bot. Type /help to see what I can do.',
    help: '**Commands**',
    unknown: 'Unknown command. Type /help.',
    pong: 'pong 🏓',
    echo: 'You said:',
    echoUsage: 'Usage: `/echo your text`',
    counter: 'Counter: **{n}**',
    counterButtonPlus: '➕ Add',
    counterButtonReset: '↺ Reset',
    langSet: 'Language: English.',
    langBad: 'Available languages: `fr`, `en`.',
    whoami: 'Your id: `{id}`',
    adminOnly: 'This command is for the bot administrators.',
    notText: 'I can only read text for now 🙂',
    error: 'Something went wrong. Please try again in a moment.',
    linkButton: 'Documentation',
  },
};

function t(lang, key, params) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.fr[key] ?? key;
  for (const [k, v] of Object.entries(params || {})) s = s.split(`{${k}}`).join(String(v));
  return s;
}

module.exports = { t, STRINGS };
