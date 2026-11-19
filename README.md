# GPChat Bot Template

Le **modèle officiel** pour créer un bot [GPChat](https://gpchat.app) : un vrai projet, commenté, fonctionnel dès le premier lancement, avec la structure que la plateforme attend.
*The **official starter** for building a [GPChat](https://gpchat.app/en/) bot: a real, commented project that works on the first run, with the structure the platform expects.*

[Français](#français) · [English](#english)

---

## Français

### Ce que vous obtenez

| | |
|---|---|
| **Deux modes de réception** | `polling` (aucun serveur public, parfait en local) ou `webhook` (HTTPS, signature HMAC vérifiée, rotation de secret) — un seul réglage |
| **Commandes et boutons** | registre de commandes (`src/handlers/commands.js`), boutons à rappel (`callback.received`), modification de message, « écrit… » |
| **Les règles GPChat respectées** | silence en groupe sauf commande ou mention, dédoublonnage par `msgId`, jamais de message à l'initiative du bot, réponse 200 immédiate en webhook |
| **Limites de l'API gérées** | file d'envoi espacée (60 requêtes/minute par clé), erreurs d'un envoi isolées |
| **Robustesse** | configuration validée au démarrage, erreurs → message poli à l'utilisateur, arrêt propre, journaux JSON |
| **Préférences utilisateur** | langue FR/EN (`/lang`), store à interface minuscule (mémoire ou fichier JSON atomique, remplaçable par Redis/SQL) |
| **Qualité** | 17 tests sans réseau (`npm test`), CI GitHub Actions (Node 20/22 + build Docker), Dockerfile durci, `docker-compose.yml` |
| **SDK inclus** | `src/lib/gpchat-bot.js` (officiel, sans dépendance) — rien à installer |

### Démarrer en 3 minutes

```bash
# 1. Utilisez ce dépôt comme modèle (bouton « Use this template » sur GitHub) ou clonez-le
git clone https://github.com/GPChat-Platform/bot-template mon-bot && cd mon-bot

# 2. Créez le bot : écrivez à @gpchat_forge → /newbot, puis /setmode polling. Copiez la clé API.
cp .env.example .env        # collez la clé dans GPCHAT_API_KEY

# 3. Lancez
npm start                   # → « polling démarré » ; écrivez /start à votre bot dans l'app GPChat
npm test                    # 17 tests
```

Aucune dépendance à installer (Node.js ≥ 20 suffit).

### Écrire votre bot

Tout se passe dans **`src/handlers/commands.js`** :

```js
const commands = {
  meteo: {
    description: { fr: 'Météo d’une ville : /meteo Douala', en: 'Weather for a city: /meteo Douala' },
    run: async (ctx) => {
      await ctx.typing();
      const texte = await maFonctionMeteo(ctx.args);        // votre logique
      return ctx.reply(texte);                               // Markdown activé par défaut
    },
  },
};
```

`ctx` offre `reply`, `replyImage`, `editMessage`, `typing`, `t` (traductions), `prefs`/`setPrefs` (préférences persistantes), `userId`, `isGroup`, `isAdmin`, `button`. La liste complète est commentée en tête du fichier.

Puis :

1. **`bot.json`** : nom (sans *gpchat, forge, official, admin, verified*), @username finissant par `bot`, description (20 à 512 caractères), catégorie. `npm run commands` affiche la liste de commandes à enregistrer.
2. **Avatar** : `assets/avatar.svg` est un exemple ; ajoutez votre image carrée (512 × 512) et mettez-la avec `/setphoto` dans @gpchat_forge ou dans la console (onglet *Bot*).
3. **Publier** : console → *Publication* (ou `/publish`). En polling, un appel à l'API suffit à valider la checklist. Tant que le bot est en brouillon, seuls vous et vos testeurs peuvent l'utiliser.

### Modes de réception

| | `polling` (défaut) | `webhook` |
|---|---|---|
| Serveur public HTTPS | non | oui |
| Réglage GPChat | `/setmode polling` | URL `https://votre-domaine/gpchat/webhook` + secret (console → Webhooks) |
| Variables | `GPCHAT_API_KEY` | `GPCHAT_MODE=webhook`, `GPCHAT_WEBHOOK_SECRET`, `PORT` |
| Idéal pour | développement, petit hébergement, pas de domaine | production à fort trafic, plateformes serverless |

### Déployer

```bash
docker compose up -d --build        # lit .env, données persistantes dans un volume
```

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour l'organisation du code, les choix de conception et les pistes (persistance Redis/SQL, hébergement serverless).

### Aller plus loin

- [Documentation développeur](https://gpchat.app/developers/docs) · [Tutoriel pas à pas](https://gpchat.app/developers/tutorial-ai-bot) · [Référence API](https://gpchat.app/developers/api-reference)
- [Bibliothèque de bots open source](https://github.com/GPChat-Platform/bots) : des bots complets (cinéma, événement, alertes) à lire et à forker.

---

## English

### What you get

| | |
|---|---|
| **Two delivery modes** | `polling` (no public server, perfect locally) or `webhook` (HTTPS, verified HMAC signature, secret rotation) — one setting |
| **Commands and buttons** | command registry (`src/handlers/commands.js`), callback buttons (`callback.received`), message editing, “typing…” |
| **GPChat rules respected** | silent in groups unless commanded or mentioned, deduplication by `msgId`, no bot-initiated messages, immediate 200 in webhook mode |
| **API limits handled** | spaced send queue (60 requests/minute per key), per-send error isolation |
| **Robustness** | config validated at startup, errors → polite user message, graceful shutdown, JSON logs |
| **User preferences** | FR/EN language (`/lang`), tiny-interface store (memory or atomic JSON file, swappable for Redis/SQL) |
| **Quality** | 17 network-free tests (`npm test`), GitHub Actions CI (Node 20/22 + Docker build), hardened Dockerfile, `docker-compose.yml` |
| **SDK included** | `src/lib/gpchat-bot.js` (official, dependency-free) — nothing to install |

### Get started in 3 minutes

```bash
git clone https://github.com/GPChat-Platform/bot-template my-bot && cd my-bot   # or “Use this template” on GitHub
# Create the bot: message @gpchat_forge → /newbot, then /setmode polling. Copy the API key.
cp .env.example .env        # paste the key into GPCHAT_API_KEY
npm start                   # → “polling démarré”; send /start to your bot in the GPChat app
npm test
```

No dependency to install (Node.js ≥ 20 is enough).

### Write your bot

Everything happens in **`src/handlers/commands.js`**: add an entry `{ description: { fr, en }, run: async (ctx) => … }`. `ctx` provides `reply`, `replyImage`, `editMessage`, `typing`, `t`, `prefs`/`setPrefs`, `userId`, `isGroup`, `isAdmin`, `button` (documented at the top of the file).

Then fill in `bot.json` (name without *gpchat, forge, official, admin, verified*, @username ending in `bot`, description of 20–512 characters, category; `npm run commands` prints the command list to register), add a square 512 × 512 avatar (`/setphoto` in @gpchat_forge or the console's *Bot* tab), and publish from the console (*Publication* tab or `/publish`). While a bot is a draft, only you and your testers can use it.

### Delivery modes

| | `polling` (default) | `webhook` |
|---|---|---|
| Public HTTPS server | no | yes |
| GPChat setting | `/setmode polling` | URL `https://your-domain/gpchat/webhook` + secret (console → Webhooks) |
| Variables | `GPCHAT_API_KEY` | `GPCHAT_MODE=webhook`, `GPCHAT_WEBHOOK_SECRET`, `PORT` |
| Best for | development, small hosting, no domain | high-traffic production, serverless platforms |

### Deploy

```bash
docker compose up -d --build        # reads .env, persistent data in a volume
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the code layout and design choices.

### Learn more

[Developer docs](https://gpchat.app/en/developers/docs) · [Step-by-step tutorial](https://gpchat.app/en/developers/tutorial-ai-bot) · [API reference](https://gpchat.app/en/developers/api-reference) · [Open-source bot library](https://github.com/GPChat-Platform/bots)

## Licence / License

MIT — see [LICENSE](LICENSE). Versioning of the GPChat API: [policy](https://gpchat.app/en/developers/docs#versioning) (old versions maintained at least 12 months).
