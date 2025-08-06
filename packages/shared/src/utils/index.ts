import { VULNERABILITY_SCORES, VULNERABILITY_SEVERITY } from '../constants';
import type { VulnerabilityInfo, PackageInfo } from '../types';

// Node.js globals
declare const setTimeout: any;
declare const clearTimeout: any;

/**
 * Validates if a string is a valid semantic version
 */
export function isValidSemVer(version: string): boolean {
  const semVerRegex =
    /^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/;
  return semVerRegex.test(version);
}

/**
 * Compares two semantic versions
 * @param a First version
 * @param b Second version
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareSemVer(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart < bPart) return -1;
    if (aPart > bPart) return 1;
  }

  return 0;
}

/**
 * Checks if a package version is outdated
 */
export function isPackageOutdated(current: string, latest: string): boolean {
  if (!isValidSemVer(current) || !isValidSemVer(latest)) {
    return false;
  }
  return compareSemVer(current, latest) < 0;
}

/**
 * Sorts vulnerabilities by severity (critical first)
 */
export function sortVulnerabilitiesBySeverity(
  vulnerabilities: VulnerabilityInfo[]
): VulnerabilityInfo[] {
  return vulnerabilities.sort((a, b) => {
    const scoreA = VULNERABILITY_SCORES[a.severity];
    const scoreB = VULNERABILITY_SCORES[b.severity];
    return scoreB - scoreA; // Descending order (critical first)
  });
}

/**
 * Filters vulnerabilities by minimum severity level
 */
export function filterVulnerabilitiesBySeverity(
  vulnerabilities: VulnerabilityInfo[],
  minSeverity: 'low' | 'moderate' | 'high' | 'critical'
): VulnerabilityInfo[] {
  const minScore = VULNERABILITY_SCORES[minSeverity];
  return vulnerabilities.filter(
    vuln => VULNERABILITY_SCORES[vuln.severity] >= minScore
  );
}

/**
 * Groups packages by their status (outdated, vulnerable, up-to-date)
 */
export function groupPackagesByStatus(packages: PackageInfo[]): {
  outdated: PackageInfo[];
  vulnerable: PackageInfo[];
  upToDate: PackageInfo[];
} {
  return packages.reduce(
    (groups, pkg) => {
      if (pkg.hasVulnerabilities) {
        groups.vulnerable.push(pkg);
      } else if (pkg.isOutdated) {
        groups.outdated.push(pkg);
      } else {
        groups.upToDate.push(pkg);
      }
      return groups;
    },
    { outdated: [], vulnerable: [], upToDate: [] } as {
      outdated: PackageInfo[];
      vulnerable: PackageInfo[];
      upToDate: PackageInfo[];
    }
  );
}

/**
 * Calculates package health score (0-100)
 */
export function calculatePackageHealthScore(packages: PackageInfo[]): number {
  if (packages.length === 0) return 100;

  const totalPackages = packages.length;
  const vulnerablePackages = packages.filter(
    pkg => pkg.hasVulnerabilities
  ).length;
  const outdatedPackages = packages.filter(
    pkg => pkg.isOutdated && !pkg.hasVulnerabilities
  ).length;

  // Vulnerable packages have more impact on score than outdated ones
  const vulnerabilityPenalty = vulnerablePackages * 10;
  const outdatedPenalty = outdatedPackages * 5;

  const score = Math.max(0, 100 - (vulnerabilityPenalty + outdatedPenalty));
  return Math.round(score);
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(1)} ${sizes[i]}`;
}

/**
 * Formats date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDate(d);
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: any;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Creates a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely parses JSON with fallback
 */
export function safeJsonParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Generates a random string of specified length
 */
export function generateRandomString(length: number = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}
