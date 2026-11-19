'use strict';
/**
 * Dédoublonnage des événements. GPChat peut livrer deux fois le même événement (nouvel essai après un délai,
 * rejeu depuis la console, accusé non reçu). Le `msgId` (ou l'`id` d'événement en polling) est unique : on retient
 * les identifiants récents et on ignore ceux déjà traités.
 */
class Dedupe {
  constructor({ max = 2000, ttlMs = 10 * 60 * 1000, now = Date.now } = {}) {
    this.max = max;
    this.ttl = ttlMs;
    this.now = now;
    this.seen = new Map(); // id -> horodatage
  }

  /** true si l'identifiant a déjà été vu (et ne doit pas être retraité) ; sinon le mémorise. */
  check(id) {
    if (!id) return false; // pas d'identifiant : on ne peut pas dédoublonner, on traite
    const t = this.now();
    const prev = this.seen.get(id);
    if (prev !== undefined && prev + this.ttl > t) return true;
    this.seen.delete(id);
    this.seen.set(id, t);
    if (this.seen.size > this.max) this.seen.delete(this.seen.keys().next().value);
    return false;
  }
}

module.exports = { Dedupe };
