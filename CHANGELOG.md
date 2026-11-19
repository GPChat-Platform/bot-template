# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · versionnage : [SemVer](https://semver.org/lang/fr/) · politique : [docs/VERSIONING.md](docs/VERSIONING.md)

## [Non publié]

## [1.0.0] — 2026-11-19

### Ajouté
- Modèle de bot : polling ou webhook signé, registre de commandes, boutons, Markdown, dédoublonnage, file d'envoi limitée, préférences FR/EN, store fichier/mémoire.
- Observabilité : journaux JSON, `/healthz` `/readyz` `/metrics` (Prometheus), version dans `gpchat_bot_info`.
- 21 tests sans réseau, Dockerfile durci avec `HEALTHCHECK`, `docker-compose.yml`, CI GitHub Actions.
