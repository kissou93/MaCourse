/**
 * @file utils.js
 * @description Fonctions utilitaires partagées entre toutes les pages de MaCourse.
 * Aucune dépendance sur db.js — ce fichier est autonome.
 * 
 * @module utils
 */

'use strict';

// ─────────────────────────────────────────────
// FORMATAGE
// ─────────────────────────────────────────────

/**
 * Formate un nombre en prix FCFA lisible.
 * @param {number} amount - Montant en FCFA
 * @returns {string} Ex: "12 500 FCFA"
 *
 * @example
 * formatPrice(12500) // "12 500 FCFA"
 */
function formatPrice(amount) {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') // espace insécable
    + '\u00A0FCFA';
}

/**
 * Formate un nombre en prix court (sans "FCFA").
 * @param {number} amount
 * @returns {string} Ex: "12 500"
 */
function formatAmount(amount) {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

/**
 * Formate un pourcentage de marge.
 * @param {number} buyPrice  - Prix d'achat
 * @param {number} sellPrice - Prix de vente
 * @returns {string} Ex: "+38%"
 */
function formatMargin(buyPrice, sellPrice) {
  if (!sellPrice || sellPrice <= 0) return '—';
  const pct = Math.round(((sellPrice - buyPrice) / sellPrice) * 100);
  return '+' + pct + '%';
}

/**
 * Calcule le pourcentage de marge.
 * @param {number} buyPrice
 * @param {number} sellPrice
 * @returns {number} Pourcentage arrondi
 */
function calcMarginPct(buyPrice, sellPrice) {
  if (!sellPrice || sellPrice <= 0) return 0;
  return Math.round(((sellPrice - buyPrice) / sellPrice) * 100);
}

/**
 * Pad un nombre sur 2 chiffres.
 * @param {number} n
 * @returns {string} Ex: "07"
 */
function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

// ─────────────────────────────────────────────
// DOM
// ─────────────────────────────────────────────

/**
 * Raccourci pour document.getElementById.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function qs(id) {
  return document.getElementById(id);
}

/**
 * Raccourci pour document.querySelector.
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
function qsel(selector) {
  return document.querySelector(selector);
}

/**
 * Raccourci pour document.querySelectorAll.
 * @param {string} selector
 * @returns {NodeList}
 */
function qsAll(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Définit le contenu HTML d'un élément par son ID.
 * @param {string} id   - ID de l'élément
 * @param {string} html - Contenu HTML
 */
function setHTML(id, html) {
  const el = qs(id);
  if (el) el.innerHTML = html;
}

/**
 * Définit le texte d'un élément par son ID.
 * @param {string} id   - ID de l'élément
 * @param {string} text - Texte
 */
function setText(id, text) {
  const el = qs(id);
  if (el) el.textContent = text;
}

/**
 * Ajoute ou retire une classe CSS selon une condition.
 * @param {HTMLElement|string} target    - Élément ou ID
 * @param {string}             className - Classe CSS
 * @param {boolean}            condition - true = ajouter, false = retirer
 */
function toggleClass(target, className, condition) {
  const el = typeof target === 'string' ? qs(target) : target;
  if (!el) return;
  if (condition) el.classList.add(className);
  else el.classList.remove(className);
}

// ─────────────────────────────────────────────
// TOAST (NOTIFICATIONS)
// ─────────────────────────────────────────────

/** Durée d'affichage du toast en ms */
const TOAST_DURATION = 2600;

/** Timer actif du toast (évite les chevauchements) */
let _toastTimer = null;

/**
 * Affiche une notification toast.
 * @param {string} message          - Message à afficher
 * @param {'light'|'dark'} [theme]  - Thème visuel (défaut: 'dark')
 *
 * @example
 * showToast('✅ Commande confirmée !', 'light');
 */
function showToast(message, theme) {
  const t = theme || 'dark';
  const el = qs('toast-' + t);
  if (!el) return;

  el.textContent = message;
  el.classList.add('show');

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () {
    el.classList.remove('show');
  }, TOAST_DURATION);
}

// ─────────────────────────────────────────────
// NAVIGATION INTER-PAGES
// ─────────────────────────────────────────────

/**
 * Navigue vers une autre page de l'application.
 * @param {string} page - Nom de la page ('client', 'admin', 'livreur', 'index')
 */
function goTo(page) {
  const base = _getBasePath();
  if (page === 'index' || page === 'home') {
    window.location.href = base + 'index.html';
  } else {
    window.location.href = base + 'pages/' + page + '.html';
  }
}

/**
 * Détermine le chemin de base selon la page courante.
 * @returns {string}
 */
function _getBasePath() {
  const path = window.location.pathname;
  return path.includes('/pages/') ? '../' : './';
}

// ─────────────────────────────────────────────
// BADGES DE STATUT
// ─────────────────────────────────────────────

/**
 * Retourne le HTML d'un badge de statut de commande.
 * @param {string} status - Statut de la commande
 * @returns {string} HTML du badge
 */
function statusBadge(status) {
  const classes = {
    pending:          'badge badge--orange',
    confirmed:        'badge badge--blue',
    preparing:        'badge badge--yellow',
    ready:            'badge badge--blue',
    out_for_delivery: 'badge badge--orange',
    delivered:        'badge badge--green',
  };
  const labels = ORDER_STATUS_LABELS || {
    pending:          'En attente',
    confirmed:        'Confirmée',
    preparing:        'En préparation',
    ready:            'Prête',
    out_for_delivery: 'En livraison',
    delivered:        'Livrée',
  };
  const cls   = classes[status] || 'badge badge--muted';
  const label = labels[status]  || status;
  return '<span class="' + cls + '">' + label + '</span>';
}

/**
 * Retourne la classe CSS du badge de marge selon le pourcentage.
 * @param {number} pct - Pourcentage de marge
 * @returns {string} Classe CSS
 */
function marginBadgeClass(pct) {
  if (pct >= 30) return 'badge badge--green';
  if (pct >= 20) return 'badge badge--yellow';
  return 'badge badge--red';
}

// ─────────────────────────────────────────────
// GPS & GÉOLOCALISATION
// ─────────────────────────────────────────────

/**
 * Estime la zone de livraison à partir des coordonnées GPS.
 * Basé sur la distance au centre de Cotonou (6.3654°N, 2.4183°E).
 * En production, remplacer par un appel à l'API Nominatim ou Google Geocoding.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {{ zone: string, quartier: string }}
 */
function estimateZoneFromCoords(lat, lng) {
  // Distance approximative en km (formule simplifiée)
  const dist = Math.sqrt(
    Math.pow(lat - 6.3654, 2) + Math.pow(lng - 2.4183, 2)
  ) * 111;

  let zone, quartier;

  if (dist < 2) {
    zone = 'proche'; quartier = 'Akpakpa Centre';
  } else if (dist < 3) {
    zone = 'proche'; quartier = 'Cadjehoun';
  } else if (dist < 5) {
    zone = 'intermediaire'; quartier = 'Godomey';
  } else if (dist < 7) {
    zone = 'intermediaire'; quartier = 'Agla';
  } else {
    zone = 'eloignee'; quartier = 'Abomey-Calavi';
  }

  return { zone: zone, quartier: quartier };
}

// ─────────────────────────────────────────────
// DIVERS
// ─────────────────────────────────────────────

/**
 * Filtre un tableau de quartiers selon une saisie utilisateur.
 * @param {Array<{name: string, zone: string}>} quartiers
 * @param {string} query - Saisie utilisateur
 * @returns {Array<{name: string, zone: string}>}
 */
function filterQuartiers(quartiers, query) {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];
  return quartiers.filter(function (item) {
    return item.name.toLowerCase().indexOf(q) >= 0;
  });
}

/**
 * Retourne le label lisible d'une zone de livraison.
 * @param {string} zone
 * @returns {string}
 */
function zoneLabel(zone) {
  const labels = {
    proche:        'Proche (≤ 3 km)',
    intermediaire: 'Intermédiaire (3–7 km)',
    eloignee:      'Éloignée (> 7 km)',
  };
  return labels[zone] || zone;
}

/**
 * Génère un état vide standardisé pour les tableaux admin.
 * @param {number} colspan - Nombre de colonnes
 * @param {string} message - Message à afficher
 * @returns {string} HTML de la ligne vide
 */
function emptyTableRow(colspan, message) {
  return '<tr><td colspan="' + colspan + '" class="table__empty">' + message + '</td></tr>';
}
