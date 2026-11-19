'use strict';
/**
 * Persistance. L'interface est volontairement minuscule — get / set / update — pour pouvoir la remplacer par
 * Redis, SQLite, Postgres ou Firestore sans toucher au reste du code :
 *
 *   store.get(userId)            → préférences de l'utilisateur (objet, jamais null)
 *   store.update(userId, patch)  → fusionne `patch` et enregistre
 *
 * Deux implémentations : mémoire (tests, essais) et fichier JSON (écriture atomique, suffisant pour quelques
 * milliers d'utilisateurs sur un petit serveur).
 */
const fs = require('node:fs');
const path = require('node:path');

class MemoryStore {
  constructor(defaults = {}) {
    this.defaults = defaults;
    this.users = new Map();
  }

  get(id) {
    return { ...this.defaults, ...(this.users.get(id) || {}) };
  }

  update(id, patch) {
    const next = { ...this.get(id), ...patch };
    this.users.set(id, next);
    this.onChange();
    return next;
  }

  onChange() {}
}

class FileStore extends MemoryStore {
  constructor(file, defaults) {
    super(defaults);
    this.file = file;
    this.timer = null;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const [id, v] of Object.entries(data.users || {})) this.users.set(id, v);
    } catch { /* premier démarrage ou fichier illisible : on repart d'un état vide */ }
  }

  onChange() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 300);
    if (this.timer.unref) this.timer.unref();
  }

  /** Écriture atomique : fichier temporaire puis renommage (jamais de fichier à moitié écrit). */
  flush() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ users: Object.fromEntries(this.users) }));
    fs.renameSync(tmp, this.file);
  }
}

function createStore(dataDir, defaults) {
  return dataDir ? new FileStore(path.join(dataDir, 'store.json'), defaults) : new MemoryStore(defaults);
}

module.exports = { createStore, MemoryStore, FileStore };
