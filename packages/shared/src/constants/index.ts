// API endpoints
export const API_ENDPOINTS = {
  PROJECTS: '/api/projects',
  PACKAGES: '/api/packages',
  SCAN: '/api/scan',
  VULNERABILITIES: '/api/vulnerabilities',
  LICENSES: '/api/licenses',
  AUTH: '/api/auth',
  USERS: '/api/users',
  WHATSAPP: '/api/whatsapp',
} as const;

// WebSocket events
export const WS_EVENTS = {
  SCAN_UPDATE: 'scan_update',
  VULNERABILITY_ALERT: 'vulnerability_alert',
  PROJECT_UPDATE: 'project_update',
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
} as const;

// Vulnerability severity levels
export const VULNERABILITY_SEVERITY = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Vulnerability severity scores (for sorting)
export const VULNERABILITY_SCORES = {
  [VULNERABILITY_SEVERITY.LOW]: 1,
  [VULNERABILITY_SEVERITY.MODERATE]: 2,
  [VULNERABILITY_SEVERITY.HIGH]: 3,
  [VULNERABILITY_SEVERITY.CRITICAL]: 4,
} as const;

// License types
export const LICENSE_TYPES = {
  PERMISSIVE: 'permissive',
  COPYLEFT: 'copyleft',
  PROPRIETARY: 'proprietary',
} as const;

// Common permissive licenses
export const PERMISSIVE_LICENSES = [
  'MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'ISC',
] as const;

// Copyleft licenses
export const COPYLEFT_LICENSES = [
  'GPL-2.0',
  'GPL-3.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'AGPL-3.0',
] as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Cache keys
export const CACHE_KEYS = {
  PACKAGE_INFO: 'package_info',
  VULNERABILITY_DATA: 'vuln_data',
  LICENSE_INFO: 'license_info',
  NPM_REGISTRY: 'npm_registry',
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  PACKAGE_INFO: 3600, // 1 hour
  VULNERABILITY_DATA: 1800, // 30 minutes
  LICENSE_INFO: 86400, // 24 hours
  NPM_REGISTRY: 7200, // 2 hours
} as const;

// Default pagination
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// WhatsApp command prefixes
export const WHATSAPP_COMMANDS = {
  UPGRADE: '/upgrade',
  STATUS: '/status',
  SCAN: '/scan',
  HELP: '/help',
  SUBSCRIBE: '/subscribe',
  UNSUBSCRIBE: '/unsubscribe',
} as const;

// File patterns for package.json detection
export const PACKAGE_JSON_PATTERNS = [
  '**/package.json',
  '!**/node_modules/**/package.json',
] as const;

// Supported package managers
export const PACKAGE_MANAGERS = {
  NPM: 'npm',
  YARN: 'yarn',
  PNPM: 'pnpm',
} as const;
