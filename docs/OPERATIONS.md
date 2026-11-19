# Exploitation

Le modèle est prêt pour la production : journaux, sondes de santé et métriques sont déjà branchés (`src/lib/ops.js`, identique à `@gpchat/bot-ops` de la [bibliothèque de bots](https://github.com/GPChat-Platform/bots)).

| Sujet | Où |
|---|---|
| **Journaux** | une ligne JSON par événement sur la sortie standard (`NODE_ENV=production`) ; niveau `LOG_LEVEL` ; jamais de secret ni de message privé |
| **Santé** | `GET /healthz` (vivant) · `GET /readyz` (opérationnel ; 503 si le polling est périmé ou une dépendance KO) · `OPS_PORT` (9100), lié à `127.0.0.1` |
| **Métriques** | `GET /metrics` (Prometheus) : `gpchat_bot_events_total`, `gpchat_bot_api_requests_total`, `gpchat_bot_event_duration_seconds`, `gpchat_bot_last_poll_success_timestamp_seconds`, `gpchat_bot_info{version}`… |
| **Dépendance critique** | `ops.addReadinessCheck('mon-api', async () => true)` : `/readyz` passe à 503 si elle tombe |
| **Alertes GPChat** | configurez un e-mail et/ou un webhook Slack/Discord d'alerte dans la console (*Paramètres*) : GPChat prévient le créateur d'un bot en polling qui ne vient plus chercher ses messages (10 min), d'un webhook en panne (24 h), d'événements abandonnés, de signalements |
| **Alertes Prometheus** | exemples (polling arrêté, erreurs, limite 429, redémarrage) : [OPERATIONS.md de la bibliothèque](https://github.com/GPChat-Platform/bots/blob/main/docs/OPERATIONS.md) |

Dépannage rapide : `/readyz` = 503 « aucun polling réussi » → clé API révoquée (`/token`), mode de réception repassé en webhook, ou API injoignable ; journal « limite de requêtes atteinte (429) » → plus de 60 requêtes/minute, espacez les envois ou demandez un quota plus élevé à GPChat.
