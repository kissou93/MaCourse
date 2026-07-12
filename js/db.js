/**
 * @file db.js
 * @description Couche données de MaCourse.
 * Gère les modèles, les données initiales et la persistance via localStorage.
 * 
 * En production, ce fichier sera remplacé par des appels API REST.
 * 
 * @module db
 */

'use strict';

// ─────────────────────────────────────────────
// CONSTANTES MÉTIER
// ─────────────────────────────────────────────

/** Frais de livraison par zone (en FCFA) */
const DELIVERY_FEES = {
  proche:        500,
  intermediaire: 1000,
  eloignee:      1500,
};

/** Montant minimum pour la livraison gratuite (en FCFA) */
const FREE_DELIVERY_THRESHOLD = 15000;

/** Durée de réservation d'un créneau (en ms) */
const SLOT_RESERVATION_DURATION = 20 * 60 * 1000; // 20 minutes

/** Durée d'un créneau de livraison (en ms) */
const SLOT_DURATION = 2 * 60 * 60 * 1000; // 2 heures

/** Nombre de créneaux proposés */
const SLOT_COUNT = 5;

/** Délai minimum avant le premier créneau (en heures) */
const SLOT_MIN_DELAY = 2;

/** Flux de statuts d'une commande (dans l'ordre) */
const ORDER_STATUS_FLOW = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

/** Labels lisibles des statuts de commande */
const ORDER_STATUS_LABELS = {
  pending:          'En attente',
  confirmed:        'Confirmée',
  preparing:        'En préparation',
  ready:            'Prête',
  out_for_delivery: 'En livraison',
  delivered:        'Livrée',
};

/** Quartiers de Cotonou et leurs zones de livraison */
const QUARTIERS = [
  { name: 'Akpakpa',        zone: 'proche' },
  { name: 'Cadjehoun',      zone: 'proche' },
  { name: 'Fidjrossè',      zone: 'proche' },
  { name: 'Haie Vive',      zone: 'proche' },
  { name: 'Ganhi',          zone: 'proche' },
  { name: 'Zongo',          zone: 'proche' },
  { name: 'Missèbo',        zone: 'proche' },
  { name: 'Aidjèdo',        zone: 'proche' },
  { name: 'Agla',           zone: 'intermediaire' },
  { name: 'Godomey',        zone: 'intermediaire' },
  { name: 'Vèdoko',         zone: 'intermediaire' },
  { name: 'Sikècodji',      zone: 'intermediaire' },
  { name: 'Gbèdjromèdé',    zone: 'intermediaire' },
  { name: 'Abomey-Calavi',  zone: 'eloignee' },
  { name: 'Porto-Novo',     zone: 'eloignee' },
  { name: 'Ouidah',         zone: 'eloignee' },
];

// ─────────────────────────────────────────────
// CLÉS LOCALSTORAGE
// ─────────────────────────────────────────────

const STORAGE_KEYS = {
  PRODUCTS: 'mc_products',
  ORDERS:   'mc_orders',
  CLIENTS:  'mc_clients',
  CART:     'mc_cart',
  NEXT_ID:  'mc_next_order_id',
};

// ─────────────────────────────────────────────
// DONNÉES INITIALES
// ─────────────────────────────────────────────

/**
 * Catalogue produits initial.
 * @type {Array<Product>}
 * 
 * @typedef {Object} Product
 * @property {number}  id       - Identifiant unique
 * @property {string}  name     - Nom du produit
 * @property {string}  emoji    - Emoji représentatif
 * @property {string}  unit     - Unité de vente
 * @property {number}  buyPrice - Prix d'achat (FCFA)
 * @property {number}  sellPrice- Prix de vente (FCFA)
 * @property {string}  category - Catégorie
 * @property {number}  stock    - Stock disponible
 * @property {number}  minStock - Seuil d'alerte stock
 * @property {boolean} active   - Produit visible en boutique
 * @property {boolean} featured - Mis en avant sur l'accueil
 * @property {string|null} badge - Badge promotionnel
 */
const INITIAL_PRODUCTS = [
  { id: 1,  name: 'Riz parfumé',       emoji: '🌾', unit: 'Sac 5kg',          buyPrice: 3000, sellPrice: 4200, category: 'Céréales',   stock: 42,  minStock: 10, active: true, featured: true,  badge: '-10%' },
  { id: 2,  name: 'Spaghetti',         emoji: '🍝', unit: 'Paquet 500g',       buyPrice: 280,  sellPrice: 380,  category: 'Céréales',   stock: 85,  minStock: 20, active: true, featured: true,  badge: null },
  { id: 3,  name: 'Macaroni',          emoji: '🍝', unit: 'Paquet 500g',       buyPrice: 260,  sellPrice: 350,  category: 'Céréales',   stock: 60,  minStock: 20, active: true, featured: false, badge: null },
  { id: 4,  name: 'Farine de blé',     emoji: '🌾', unit: 'Sac 1kg',           buyPrice: 380,  sellPrice: 520,  category: 'Céréales',   stock: 30,  minStock: 15, active: true, featured: false, badge: null },
  { id: 5,  name: 'Sardines',          emoji: '🐟', unit: 'Boîte 425g',        buyPrice: 420,  sellPrice: 650,  category: 'Conserves',  stock: 120, minStock: 30, active: true, featured: true,  badge: null },
  { id: 6,  name: "Thon à l'huile",   emoji: '🐠', unit: 'Boîte 185g',        buyPrice: 500,  sellPrice: 750,  category: 'Conserves',  stock: 80,  minStock: 20, active: true, featured: true,  badge: null },
  { id: 7,  name: 'Maquereau',         emoji: '🐟', unit: 'Boîte 425g',        buyPrice: 400,  sellPrice: 600,  category: 'Conserves',  stock: 55,  minStock: 15, active: true, featured: false, badge: null },
  { id: 8,  name: 'Corned Beef',       emoji: '🥩', unit: 'Boîte 340g',        buyPrice: 800,  sellPrice: 1200, category: 'Conserves',  stock: 40,  minStock: 10, active: true, featured: false, badge: null },
  { id: 9,  name: 'Tomate concentrée', emoji: '🫙', unit: 'Boîte 800g',        buyPrice: 620,  sellPrice: 900,  category: 'Légumes',    stock: 8,   minStock: 15, active: true, featured: true,  badge: null },
  { id: 10, name: 'Haricots blancs',   emoji: '🫘', unit: 'Boîte 400g',        buyPrice: 320,  sellPrice: 480,  category: 'Légumes',    stock: 35,  minStock: 10, active: true, featured: false, badge: null },
  { id: 11, name: 'Huile végétale',    emoji: '🫒', unit: 'Bidon 1L',          buyPrice: 780,  sellPrice: 1100, category: 'Huiles',     stock: 50,  minStock: 15, active: true, featured: true,  badge: null },
  { id: 12, name: 'Huile de palme',    emoji: '🟠', unit: 'Bidon 1L',          buyPrice: 650,  sellPrice: 950,  category: 'Huiles',     stock: 6,   minStock: 10, active: true, featured: false, badge: null },
  { id: 13, name: 'Sel iodé',          emoji: '🧂', unit: 'Sachet 1kg',        buyPrice: 100,  sellPrice: 180,  category: 'Condiments', stock: 200, minStock: 50, active: true, featured: false, badge: null },
  { id: 14, name: 'Sucre cristallisé', emoji: '🍚', unit: 'Sachet 1kg',        buyPrice: 300,  sellPrice: 420,  category: 'Condiments', stock: 90,  minStock: 25, active: true, featured: false, badge: null },
  { id: 15, name: 'Cube Maggi',        emoji: '🟡', unit: 'Boîte 60 cubes',    buyPrice: 450,  sellPrice: 650,  category: 'Condiments', stock: 100, minStock: 25, active: true, featured: true,  badge: null },
  { id: 16, name: 'Lait Nido',         emoji: '🥛', unit: 'Boîte 400g',        buyPrice: 2100, sellPrice: 2800, category: 'Boissons',   stock: 35,  minStock: 10, active: true, featured: true,  badge: null },
  { id: 17, name: 'Milo',              emoji: '🍫', unit: 'Boîte 400g',        buyPrice: 1600, sellPrice: 2200, category: 'Boissons',   stock: 30,  minStock: 10, active: true, featured: true,  badge: null },
  { id: 18, name: 'Café soluble',      emoji: '☕', unit: 'Bocal 100g',         buyPrice: 1200, sellPrice: 1800, category: 'Boissons',   stock: 25,  minStock: 8,  active: true, featured: false, badge: null },
  { id: 19, name: 'Thé Lipton',        emoji: '🍵', unit: 'Boîte 100 sachets', buyPrice: 680,  sellPrice: 980,  category: 'Boissons',   stock: 55,  minStock: 15, active: true, featured: false, badge: null },
];

/**
 * Clients initiaux (données de démo).
 * @type {Array<Client>}
 *
 * @typedef {Object} Client
 * @property {string} name    - Nom complet
 * @property {string} phone   - Numéro de téléphone
 * @property {string} quartier- Quartier de résidence
 * @property {number} orders  - Nombre de commandes passées
 * @property {number} spent   - Total dépensé (FCFA)
 * @property {number} points  - Points de fidélité
 */
const INITIAL_CLIENTS = [
  { name: 'Adjoua Kossou',  phone: '+229 61 23 45 67', quartier: 'Akpakpa',       orders: 12, spent: 58400, points: 584 },
  { name: 'Bertin Ahossou', phone: '+229 97 65 43 21', quartier: 'Cadjehoun',     orders: 8,  spent: 34200, points: 342 },
  { name: 'Chantal Dossou', phone: '+229 66 55 44 33', quartier: 'Fidjrossè',     orders: 5,  spent: 21000, points: 210 },
  { name: 'David Mensah',   phone: '+229 55 44 33 22', quartier: 'Abomey-Calavi', orders: 15, spent: 72600, points: 726 },
];

/**
 * Livreurs initiaux (données de démo).
 * @type {Array<Livreur>}
 *
 * @typedef {Object} Livreur
 * @property {string}  name      - Nom complet
 * @property {boolean} online    - Disponible en ce moment
 * @property {number}  deliveries- Livraisons effectuées aujourd'hui
 * @property {number}  rating    - Note moyenne (/5)
 * @property {string}  zone      - Zone de couverture
 * @property {number}  revenue   - Revenus du jour (FCFA)
 */
const INITIAL_LIVREURS = [
  { name: 'Kofi Agbodjan',  online: true,  deliveries: 7, rating: 4.8, zone: 'Akpakpa / Centre',     revenue: 7000 },
  { name: 'Moussa Boukari', online: true,  deliveries: 6, rating: 4.6, zone: 'Cadjehoun / Fidjrossè', revenue: 6000 },
  { name: 'Romain Hounsa',  online: false, deliveries: 3, rating: 4.7, zone: 'Abomey-Calavi',         revenue: 3000 },
];

// ─────────────────────────────────────────────
// COUCHE PERSISTANCE
// ─────────────────────────────────────────────

/**
 * Lit une valeur depuis localStorage.
 * @param {string} key - Clé de stockage
 * @param {*} fallback - Valeur par défaut si absent
 * @returns {*} Valeur désérialisée ou fallback
 */
function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('[db] storageGet error:', key, e);
    return fallback;
  }
}

/**
 * Écrit une valeur dans localStorage.
 * @param {string} key   - Clé de stockage
 * @param {*}      value - Valeur à sérialiser
 */
function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[db] storageSet error:', key, e);
  }
}

// ─────────────────────────────────────────────
// API DONNÉES — PRODUITS
// ─────────────────────────────────────────────

const Products = {
  /** @returns {Array<Product>} Tous les produits */
  getAll() {
    return storageGet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },

  /** @returns {Array<Product>} Produits actifs uniquement */
  getActive() {
    return this.getAll().filter(p => p.active);
  },

  /**
   * @param {number} id
   * @returns {Product|undefined}
   */
  getById(id) {
    return this.getAll().find(p => p.id === id);
  },

  /**
   * Met à jour un produit existant.
   * @param {number} id      - ID du produit
   * @param {Object} changes - Champs à modifier
   * @returns {boolean} Succès
   */
  update(id, changes) {
    const products = this.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return false;
    products[index] = Object.assign({}, products[index], changes);
    storageSet(STORAGE_KEYS.PRODUCTS, products);
    return true;
  },

  /**
   * Ajoute un nouveau produit.
   * @param {Omit<Product, 'id'>} product
   * @returns {Product} Produit créé avec son ID
   */
  create(product) {
    const products = this.getAll();
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
    const newProduct = Object.assign({}, product, { id: maxId + 1 });
    products.push(newProduct);
    storageSet(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  },

  /**
   * Décrémente le stock d'un produit.
   * @param {number} id       - ID du produit
   * @param {number} quantity - Quantité à déduire
   * @returns {boolean} Succès
   */
  decrementStock(id, quantity) {
    const product = this.getById(id);
    if (!product || product.stock < quantity) return false;
    return this.update(id, { stock: product.stock - quantity });
  },

  /**
   * Incrémente le stock d'un produit (retour panier ou réapprovisionnement).
   * @param {number} id       - ID du produit
   * @param {number} quantity - Quantité à ajouter
   * @returns {boolean} Succès
   */
  incrementStock(id, quantity) {
    const product = this.getById(id);
    if (!product) return false;
    return this.update(id, { stock: product.stock + quantity });
  },

  /** @returns {Array<Product>} Produits dont le stock est sous le seuil d'alerte */
  getLowStock() {
    return this.getAll().filter(p => p.stock <= p.minStock);
  },

  /** Réinitialise les produits aux données initiales */
  reset() {
    storageSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },
};

// ─────────────────────────────────────────────
// API DONNÉES — COMMANDES
// ─────────────────────────────────────────────

/**
 * @typedef {Object} OrderItem
 * @property {number} productId - ID du produit
 * @property {string} name      - Nom (snapshot au moment de la commande)
 * @property {string} emoji     - Emoji (snapshot)
 * @property {number} quantity  - Quantité commandée
 * @property {number} unitPrice - Prix unitaire (snapshot)
 */

/**
 * @typedef {Object} Order
 * @property {string}      id         - Identifiant (ex: CMD-001)
 * @property {string}      client     - Nom du client
 * @property {string}      phone      - Téléphone du client
 * @property {string}      quartier   - Quartier de livraison
 * @property {string}      zone       - Zone tarifaire
 * @property {string}      slot       - Créneau de livraison
 * @property {string}      payment    - Mode de paiement
 * @property {Array<OrderItem>} items - Articles commandés
 * @property {number}      subtotal   - Sous-total articles (FCFA)
 * @property {number}      deliveryFee- Frais de livraison (FCFA)
 * @property {number}      total      - Total TTC (FCFA)
 * @property {string}      status     - Statut actuel
 * @property {number}      trackStep  - Étape de suivi (0-4)
 * @property {string}      date       - Date de création (locale)
 * @property {string}      time       - Heure de création (locale)
 */

const Orders = {
  /** @returns {Array<Order>} Toutes les commandes (plus récentes en premier) */
  getAll() {
    return storageGet(STORAGE_KEYS.ORDERS, []);
  },

  /**
   * @param {string} id
   * @returns {Order|undefined}
   */
  getById(id) {
    return this.getAll().find(o => o.id === id);
  },

  /**
   * @param {string} status
   * @returns {Array<Order>}
   */
  getByStatus(status) {
    return this.getAll().filter(o => o.status === status);
  },

  /**
   * Crée une nouvelle commande.
   * @param {Omit<Order, 'id'|'status'|'trackStep'|'date'|'time'>} data
   * @returns {Order} Commande créée
   */
  create(data) {
    const orders = this.getAll();
    const nextId = storageGet(STORAGE_KEYS.NEXT_ID, 1);
    const now = new Date();

    const order = Object.assign({}, data, {
      id:         'CMD-' + String(nextId).padStart(3, '0'),
      status:     'pending',
      trackStep:  0,
      date:       now.toLocaleDateString('fr-FR'),
      time:       now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });

    orders.unshift(order);
    storageSet(STORAGE_KEYS.ORDERS, orders);
    storageSet(STORAGE_KEYS.NEXT_ID, nextId + 1);
    return order;
  },

  /**
   * Fait avancer une commande au statut suivant.
   * @param {string} id - ID de la commande
   * @returns {Order|null} Commande mise à jour ou null si impossible
   */
  advance(id) {
    const orders = this.getAll();
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) return null;

    const order = orders[index];
    const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
    if (currentIndex === ORDER_STATUS_FLOW.length - 1) return null;

    orders[index] = Object.assign({}, order, {
      status:    ORDER_STATUS_FLOW[currentIndex + 1],
      trackStep: Math.min(order.trackStep + 1, 4),
    });

    storageSet(STORAGE_KEYS.ORDERS, orders);
    return orders[index];
  },
};

// ─────────────────────────────────────────────
// API DONNÉES — CLIENTS
// ─────────────────────────────────────────────

const Clients = {
  /** @returns {Array<Client>} */
  getAll() {
    return storageGet(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
  },

  /**
   * Met à jour les statistiques du client principal après une commande.
   * @param {number} orderTotal - Montant de la commande
   */
  recordOrder(orderTotal) {
    const clients = this.getAll();
    clients[0].orders += 1;
    clients[0].spent  += orderTotal;
    clients[0].points += Math.floor(orderTotal / 100);
    storageSet(STORAGE_KEYS.CLIENTS, clients);
  },
};

// ─────────────────────────────────────────────
// API DONNÉES — PANIER
// ─────────────────────────────────────────────

/**
 * @typedef {Object} CartItem
 * @property {number} productId - ID du produit
 * @property {number} quantity  - Quantité dans le panier
 */

const Cart = {
  /**
   * @returns {Object.<number, number>} Map productId → quantity
   */
  get() {
    return storageGet(STORAGE_KEYS.CART, {});
  },

  /**
   * @param {Object.<number, number>} cart
   */
  save(cart) {
    storageSet(STORAGE_KEYS.CART, cart);
  },

  /** Vide le panier */
  clear() {
    storageSet(STORAGE_KEYS.CART, {});
  },

  /**
   * Calcule le sous-total du panier.
   * @param {Object.<number, number>} cart
   * @returns {number} Sous-total en FCFA
   */
  getSubtotal(cart) {
    return Object.entries(cart).reduce((sum, entry) => {
      const product = Products.getById(Number(entry[0]));
      return sum + (product ? product.sellPrice * entry[1] : 0);
    }, 0);
  },

  /**
   * Calcule les frais de livraison.
   * @param {number} subtotal  - Sous-total articles
   * @param {string} zone      - Zone de livraison
   * @returns {number} Frais en FCFA (0 si livraison gratuite)
   */
  getDeliveryFee(subtotal, zone) {
    if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
    return DELIVERY_FEES[zone] || DELIVERY_FEES.proche;
  },
};

// ─────────────────────────────────────────────
// API DONNÉES — CRÉNEAUX
// ─────────────────────────────────────────────

/**
 * @typedef {Object} Slot
 * @property {number}  id      - Index du créneau (0-4)
 * @property {string}  label   - Label affiché (ex: "14h00 – 16h00")
 * @property {Date}    start   - Heure de début
 * @property {Date}    end     - Heure de fin
 * @property {boolean} available - Disponible à la réservation
 */

const Slots = {
  /**
   * Génère les créneaux disponibles à partir de maintenant.
   * Les créneaux sont glissants : le premier commence dans SLOT_MIN_DELAY heures.
   * @returns {Array<Slot>}
   */
  generate() {
    const now = new Date();
    const slots = [];

    for (let i = 0; i < SLOT_COUNT; i++) {
      const startMs = now.getTime() + (SLOT_MIN_DELAY + i * 2) * 3600000;
      const start   = new Date(startMs);
      const end     = new Date(startMs + SLOT_DURATION);

      slots.push({
        id:        i,
        label:     Slots._formatTime(start) + ' – ' + Slots._formatTime(end),
        start:     start,
        end:       end,
        available: i !== 2, // Créneau 2 simulé "complet" pour la démo
      });
    }

    return slots;
  },

  /**
   * Formate une date en "HHhMM".
   * @param {Date} date
   * @returns {string}
   */
  _formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return h + 'h' + m;
  },
};

// ─────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────

/**
 * Initialise la base de données si c'est la première visite.
 * Appelé une fois au chargement de chaque page.
 */
function initDB() {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    storageSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
    storageSet(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    storageSet(STORAGE_KEYS.ORDERS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.NEXT_ID)) {
    storageSet(STORAGE_KEYS.NEXT_ID, 1);
  }
}
