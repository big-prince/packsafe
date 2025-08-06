// Package-related types
export interface PackageInfo {
  name: string;
  version: string;
  latestVersion?: string;
  isOutdated: boolean;
  hasVulnerabilities: boolean;
  vulnerabilityCount: number;
  license?: string;
  description?: string;
  homepage?: string;
  repository?: string;
}

export interface VulnerabilityInfo {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  package: string;
  version: string;
  fixedIn?: string;
  cwe?: string[];
  cvss?: number;
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  packageCount: number;
  outdatedCount: number;
  vulnerabilityCount: number;
  lastScanned: Date;
  framework?: string;
  nodeVersion?: string;
}

export interface ScanResult {
  projectId: string;
  packages: PackageInfo[];
  vulnerabilities: VulnerabilityInfo[];
  summary: {
    total: number;
    outdated: number;
    vulnerable: number;
  };
  scanTime: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'scan_update' | 'vulnerability_alert' | 'project_update';
  payload: any;
  timestamp: Date;
}

// User and authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  apiKey?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    whatsapp: boolean;
    desktop: boolean;
  };
  thresholds: {
    vulnerabilitySeverity: 'low' | 'moderate' | 'high' | 'critical';
    outdatedDays: number;
  };
}

// License-related types
export interface LicenseInfo {
  name: string;
  type: 'permissive' | 'copyleft' | 'proprietary';
  compatibility: string[];
  restrictions: string[];
  permissions: string[];
}

export interface LicenseCheck {
  package: string;
  license: string;
  compatible: boolean;
  conflicts: string[];
  warnings: string[];
}

// WhatsApp-related types
export interface WhatsAppMessage {
  from: string;
  body: string;
  timestamp: Date;
  type: 'text' | 'command';
}

export interface WhatsAppCommand {
  command: string;
  args: string[];
  userId: string;
}

// Dashboard chart data types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalPackages: number;
  totalVulnerabilities: number;
  totalOutdated: number;
  trendsData: {
    vulnerabilities: ChartDataPoint[];
    outdated: ChartDataPoint[];
    scans: ChartDataPoint[];
  };
}
