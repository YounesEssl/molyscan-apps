export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
};

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    refresh: '/auth/refresh',
  },
  products: {
    search: '/products/search',
    byBarcode: '/products/barcode',
    detail: (id: string) => `/products/${id}`,
  },
  scans: {
    list: '/scans',
    create: '/scans',
    detail: (id: string) => `/scans/${id}`,
  },
  chat: {
    conversations: '/chat/conversations',
    messages: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    send: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
  },
  workflows: {
    list: '/workflows',
    create: '/workflows',
    detail: (id: string) => `/workflows/${id}`,
    approve: (id: string) => `/workflows/${id}/approve`,
    reject: (id: string) => `/workflows/${id}/reject`,
  },
  exports: {
    generate: '/exports/generate',
    list: '/exports',
    download: (id: string) => `/exports/${id}/download`,
  },
  voiceNotes: {
    list: '/voice-notes',
    create: '/voice-notes',
    detail: (id: string) => `/voice-notes/${id}`,
  },
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },
} as const;
