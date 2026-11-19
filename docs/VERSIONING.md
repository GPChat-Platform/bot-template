# Versionnage et changelog

- **SemVer** dans `package.json` : correctif (bogue), mineur (nouveauté compatible), majeur (commande renommée/supprimée, variable d'environnement obligatoire nouvelle, format de données incompatible).
- **CHANGELOG.md** au format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), écrit pour l'utilisateur et l'exploitant du bot. Les changements en cours vont sous `## [Non publié]`.
- **Dépréciation** : une commande ou une variable est d'abord dépréciée (version mineure), puis retirée dans la version majeure suivante.
- **Publier** : `node scripts/release.mjs <correctif|mineur|majeur>` (tests, version, changelog, commit, étiquette `vX.Y.Z`), puis `git push --follow-tags` ; le workflow `release.yml` crée la Release GitHub et l'image GHCR.
- **Compatibilité GPChat** : API `/v1` ; dans une version majeure GPChat ne publie que des changements rétrocompatibles et maintient une version au moins 12 mois après l'annonce de la suivante — [politique](https://gpchat.app/en/developers/docs#versioning).
- La version est affichée au démarrage (journal) et dans `gpchat_bot_info{version}`.
