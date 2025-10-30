/**
 * API Endpoint Constants for Django Backend
 *
 * All endpoints match Django REST Framework URL patterns
 * Note: Django uses trailing slashes and underscores in action names
 */

// Django backend base URL
// Use VITE_API_URL for production deployment (Vercel will inject this)
const DJANGO_API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Authentication (Supabase-based)
  AUTH: {
    USER: `${DJANGO_API_BASE}/api/auth/user/`,
  },

  // Rooms
  ROOMS: {
    LIST: `${DJANGO_API_BASE}/api/rooms/`,
    DETAIL: (id: string) => `${DJANGO_API_BASE}/api/rooms/${id}/`,
    // Note: Status updates use PATCH to main endpoint with { status: "..." }
  },

  // Bookings
  BOOKINGS: {
    LIST: `${DJANGO_API_BASE}/api/bookings/`,
    DETAIL: (id: string) => `${DJANGO_API_BASE}/api/bookings/${id}/`,
    AVAILABILITY: `${DJANGO_API_BASE}/api/bookings/availability/`,
    // Note: Use query params for filtering (e.g., ?date=2024-01-01)
  },

  // Customers
  CUSTOMERS: {
    LIST: `${DJANGO_API_BASE}/api/customers/`,
    DETAIL: (id: string) => `${DJANGO_API_BASE}/api/customers/${id}/`,
    VERIFY_PIN: `${DJANGO_API_BASE}/api/customers/verify_pin/`, // Note: underscore, not hyphen
    // Note: Use query params for phone lookup: /api/customers/?phone=XXX
  },

  // Sensor Readings
  SENSORS: {
    READINGS: `${DJANGO_API_BASE}/api/sensors/readings/`,
    READING_DETAIL: (id: string) => `${DJANGO_API_BASE}/api/sensors/readings/${id}/`,
    // Note: Use query params for filtering: ?room=UUID&limit=50
  },

  // Knowledge Articles
  KNOWLEDGE: {
    ARTICLES: `${DJANGO_API_BASE}/api/knowledge/articles/`,
    ARTICLE_DETAIL: (id: string) => `${DJANGO_API_BASE}/api/knowledge/articles/${id}/`,
  },

  // WebSocket (Django Channels)
  WEBSOCKET: {
    SENSORS: () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = DJANGO_API_BASE.replace(/^https?:\/\//, '');
      return `${protocol}//${host}/ws/sensors/`;
    },
    ALERTS: () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = DJANGO_API_BASE.replace(/^https?:\/\//, '');
      return `${protocol}//${host}/ws/alerts/`;
    },
  },
} as const;

/**
 * Helper to build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Common query parameter helpers
 */
export const QUERY_HELPERS = {
  // Filter customers by phone
  customerByPhone: (phone: string) =>
    `${API_ENDPOINTS.CUSTOMERS.LIST}${buildQueryString({ phone })}`,

  // Filter sensor readings by room
  sensorsByRoom: (roomId: string, limit = 50) =>
    `${API_ENDPOINTS.SENSORS.READINGS}${buildQueryString({ room: roomId, limit })}`,

  // Filter bookings by date
  bookingsByDate: (date: string) =>
    `${API_ENDPOINTS.BOOKINGS.LIST}${buildQueryString({ date })}`,
} as const;
