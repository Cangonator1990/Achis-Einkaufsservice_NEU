/**
 * API Konfiguration
 * 
 * Zentrale Konfigurationsdatei für alle API-Endpunkte der Anwendung.
 * Hier werden alle verfügbaren Endpunkte als Konstanten definiert,
 * um Tippfehler zu vermeiden und die Wartbarkeit zu verbessern.
 */

// Basis-URL für alle API-Endpunkte
// Wir verwenden zwei Basis-URLs:
// - '/api' für die alten, bestehenden Endpunkte (auth, user, etc.)
// - '/api/v2' für die neuen modularen Endpunkte
export const API_BASE_URL = '/api';  
export const API_V2_BASE_URL = '/api/v2';

// Hauptbereiche der API
const AUTH = '/auth';
const USERS = '/users';
const ADDRESSES = '/addresses';
const ORDERS = '/orders';
const CART = '/cart';
const ADMIN = '/admin';
const NOTIFICATIONS = '/notifications';

// Authentifizierungs-Endpunkte
export const API_AUTH = {
  LOGIN: `${AUTH}/login`,
  LOGOUT: `${AUTH}/logout`,
  CHECK: `${AUTH}/check`,
  REGISTER: `${AUTH}/register`,
  RESET_PASSWORD: `${AUTH}/reset-password`,
  CHANGE_PASSWORD: `${AUTH}/change-password`,
};

// Benutzer-Endpunkte
export const API_USERS = {
  ME: `${USERS}/me`,
  PROFILE: `${USERS}/profile`,
  GET_BY_ID: (id: number) => `${USERS}/${id}`,
  UPDATE: (id: number) => `${USERS}/${id}`,
  DELETE: (id: number) => `${USERS}/${id}`,
  LIST: USERS,
  SET_PREFERENCES: (id: number) => `${USERS}/${id}/preferences`,
};

// Adress-Endpunkte
export const API_ADDRESSES = {
  LIST: ADDRESSES,
  GET_BY_ID: (id: number) => `${ADDRESSES}/${id}`,
  CREATE: ADDRESSES,
  UPDATE: (id: number) => `${ADDRESSES}/${id}`,
  DELETE: (id: number) => `${ADDRESSES}/${id}`,
  SET_DEFAULT: (id: number) => `${ADDRESSES}/${id}/default`,
};

// Bestellungs-Endpunkte
export const API_ORDERS = {
  LIST: ORDERS,
  GET_BY_ID: (id: number) => `${ORDERS}/${id}`,
  GET_BY_NUMBER: (orderNumber: string) => `${ORDERS}/number/${orderNumber}`,
  CREATE: ORDERS,
  UPDATE: (id: number) => `${ORDERS}/${id}`,
  CANCEL: (id: number) => `${ORDERS}/${id}/cancel`,
  DELETE: (id: number) => `${ORDERS}/${id}`,
  ITEMS: (orderId: number) => `${ORDERS}/${orderId}/items`,
  ADD_ITEM: (orderId: number) => `${ORDERS}/${orderId}/items`,
  UPDATE_ITEM: (orderId: number, itemId: number) => `${ORDERS}/${orderId}/items/${itemId}`,
  DELETE_ITEM: (orderId: number, itemId: number) => `${ORDERS}/${orderId}/items/${itemId}`,
  DRAFT: `${ORDERS}/draft`,
  UPDATE_DRAFT: `${ORDERS}/draft`,
  DELETE_DRAFT: `${ORDERS}/draft`,
};

// Warenkorb-Endpunkte
export const API_CART = {
  GET: CART,
  ADD_ITEM: `${CART}/items`,
  REMOVE_ITEM: (itemId: number) => `${CART}/items/${itemId}`,
  CLEAR: `${CART}/clear`,
  ITEMS: `${CART}/items`,
  UPDATE_ITEM: (itemId: number) => `${CART}/items/${itemId}`,
};

// Admin-Endpunkte
export const API_ADMIN = {
  DASHBOARD: `${ADMIN}/dashboard`,
  STATS: `${ADMIN}/stats`,
  RECENT_ORDERS: `${ADMIN}/recent-orders`,
  RECENT_USERS: `${ADMIN}/recent-users`,
  USERS: {
    LIST: `${ADMIN}/users`,
    GET_BY_ID: (id: number) => `${ADMIN}/users/${id}`,
    CREATE: `${ADMIN}/users`,
    UPDATE: (id: number) => `${ADMIN}/users/${id}`,
    DELETE: (id: number) => `${ADMIN}/users/${id}`,
    TOGGLE_ACTIVE: (id: number) => `${ADMIN}/users/${id}/toggle-active`,
  },
  ORDERS: {
    LIST: `${ADMIN}/orders`,
    GET_BY_ID: (id: number) => `${ADMIN}/orders/${id}`,
    UPDATE: (id: number) => `${ADMIN}/orders/${id}`,
    DELETE: (id: number) => `${ADMIN}/orders/${id}`,
    RESTORE: (id: number) => `${ADMIN}/orders/${id}/restore`,
  },
};

// Benachrichtigungs-Endpunkte
export const API_NOTIFICATIONS = {
  LIST: NOTIFICATIONS,
  UNREAD_COUNT: `${NOTIFICATIONS}/unread/count`,
  MARK_AS_READ: (id: number) => `${NOTIFICATIONS}/${id}/read`,
  MARK_ALL_AS_READ: `${NOTIFICATIONS}/read-all`,
  DELETE: (id: number) => `${NOTIFICATIONS}/${id}`,
  DELETE_ALL: NOTIFICATIONS,
};