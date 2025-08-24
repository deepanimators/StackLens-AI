export const SEVERITY_COLORS = {
  critical: 'hsl(0, 84%, 60%)',
  high: 'hsl(25, 95%, 53%)',
  medium: 'hsl(45, 93%, 47%)',
  low: 'hsl(142, 71%, 45%)',
} as const;

export const SEVERITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const;

export const ERROR_TYPES = {
  Memory: 'Memory',
  Database: 'Database',
  Network: 'Network',
  IO: 'IO',
  Security: 'Security',
  Runtime: 'Runtime',
  General: 'General',
} as const;

export const ANALYSIS_STATUS = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
} as const;

export const SUPPORTED_FILE_TYPES = [
  '.log',
  '.txt',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.csv',
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const PAGINATION_LIMITS = [10, 25, 50, 100] as const;

export const CHART_COLORS = {
  primary: 'hsl(207, 90%, 54%)',
  secondary: 'hsl(220, 13%, 18%)',
  success: 'hsl(142, 71%, 45%)',
  warning: 'hsl(25, 95%, 53%)',
  error: 'hsl(0, 84%, 60%)',
  info: 'hsl(207, 90%, 54%)',
} as const;

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  UPLOAD: '/upload',
  ALL_ERRORS: '/all-errors',
  ANALYSIS_HISTORY: '/analysis-history',
  AI_ANALYSIS: '/ai-analysis',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  LOGIN: '/login',
  REGISTER: '/register',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
  },
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
  },
  FILES: {
    UPLOAD: '/api/files/upload',
    LIST: '/api/files',
    ANALYZE: (id: number) => `/api/files/${id}/analyze`,
    ERRORS: (id: number) => `/api/files/${id}/errors`,
  },
  ERRORS: {
    LIST: '/api/errors',
    SUGGESTION: (id: number) => `/api/errors/${id}/suggestion`,
  },
  ANALYSIS: {
    HISTORY: '/api/analysis/history',
    DELETE: (id: number) => `/api/analysis/${id}`,
  },
  ML: {
    TRAIN: '/api/ml/train',
    STATUS: '/api/ml/status',
  },
  EXPORT: {
    ERRORS: '/api/export/errors',
  },
} as const;
