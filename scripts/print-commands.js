'use strict';
// Affiche la liste de commandes au format attendu par GPChat (bot.json / console → Bot → Commandes).
// Elle est générée depuis src/handlers/commands.js : une seule source de vérité.
const { commands } = require('../src/handlers/commands');

const list = Object.entries(commands)
  .filter(([, c]) => !c.adminOnly)
  .map(([command, c]) => ({ command, description: c.description.fr }));
console.log(JSON.stringify(list, null, 2));
