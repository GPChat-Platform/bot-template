# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · versionnage : [SemVer](https://semver.org/lang/fr/) · politique : [docs/VERSIONING.md](docs/VERSIONING.md)

## [Non publié]

## [1.1.0] — 2026-11-20

### Modifié
- SDK GPChat 1.1.1 embarqué : en polling, les conversations sont traitées **en parallèle** (`CONCURRENCY`, 16 par défaut) tout en gardant l'ordre des messages dans chaque conversation ; acquittement rapide ; un événement en échec est réessayé après 30 s.
- `sendChatAction()` ne réessaie plus (indicateur « écrit… » purement cosmétique) : sous forte charge, les nouveaux essais consommaient le quota.

### Ajouté
- Variable `CONCURRENCY` (validée au démarrage).

## [1.0.0] — 2026-11-19

### Ajouté
- Modèle de bot : polling ou webhook signé, registre de commandes, boutons, Markdown, dédoublonnage, file d'envoi limitée, préférences FR/EN, store fichier/mémoire.
- Observabilité : journaux JSON, `/healthz` `/readyz` `/metrics` (Prometheus), version dans `gpchat_bot_info`.
- 21 tests sans réseau, Dockerfile durci avec `HEALTHCHECK`, `docker-compose.yml`, CI GitHub Actions.
