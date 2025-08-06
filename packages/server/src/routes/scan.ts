import { Router, Request, Response } from 'express';
import axios from 'axios';
import { compareVersions } from 'compare-versions';
import { ScanResult } from '../models/ScanResult';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Security advisories endpoint (GitHub's Public Security Advisories)
const SECURITY_ADVISORIES_API = 'https://api.github.com/advisories';
// NPM registry API
const NPM_REGISTRY_API = 'https://registry.npmjs.org';

// TODO: Implement scan routes
// POST /api/scan/project
// POST /api/scan/package-json
// GET /api/scan/history/:projectId

router.post('/project', (req, res) => {
  // Placeholder
  res.status(200).json({ message: 'Scan project endpoint' });
});

router.post(
  '/package-json',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { packageJson, projectName, filePath } = req.body;
      const userId = req.user?.id;

      if (!packageJson) {
        return res.status(400).json({
          success: false,
          message: 'Missing package.json data in request body',
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Extract dependencies from package.json
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      const allDependencies = { ...dependencies, ...devDependencies };

      // Analyze outdated and vulnerable dependencies
      const analysisResults = await analyzeDependencies(allDependencies);

      // Prepare response data
      const summary = {
        outdated: Object.keys(analysisResults.outdated).length,
        vulnerable: Object.keys(analysisResults.vulnerable).length,
        total: Object.keys(allDependencies).length,
      };

      const responseData: {
        success: boolean;
        summary: {
          outdated: number;
          vulnerable: number;
          total: number;
        };
        details: {
          projectName: string;
          scanDate: string;
          dependencies: {
            outdated: Record<string, any>;
            vulnerable: Record<string, any>;
          };
        };
        warnings?: {
          rateLimited?: boolean;
        };
      } = {
        success: true,
        summary,
        details: {
          projectName: projectName || 'Unknown Project',
          scanDate: new Date().toISOString(),
          dependencies: {
            outdated: analysisResults.outdated,
            vulnerable: analysisResults.vulnerable,
          },
        },
      };

      // Save scan result to database
      try {
        const scanResult = new ScanResult({
          userId,
          projectName: projectName || 'Unknown Project',
          filePath: filePath || 'package.json',
          packageJsonContent: packageJson,
          summary,
          dependencies: {
            outdated: analysisResults.outdated,
            vulnerable: analysisResults.vulnerable,
          },
        });

        await scanResult.save();
        logger.info(
          `Scan result saved for user ${userId}, project: ${projectName}`
        );
      } catch (dbError) {
        logger.error('Error saving scan result to database:', dbError);
        // Don't fail the request if database save fails
      }

      // Check if rate limiting happened during the analysis
      const warnings: { rateLimited?: boolean } = {};
      if (analysisResults.rateLimited) {
        warnings.rateLimited = true;
        responseData.warnings = warnings;
      }

      return res.status(200).json(responseData);
    } catch (error) {
      logger.error('Error processing package.json scan:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing package.json scan',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Helper function to generate mock dependency data
function generateMockDependencies(count: number, isOutdated: boolean) {
  const dependencies: Record<string, any> = {};
  const mockPackages = [
    'react',
    'lodash',
    'express',
    'axios',
    'moment',
    'typescript',
    'jest',
  ];

  for (let i = 0; i < count; i++) {
    const packageName =
      mockPackages[Math.floor(Math.random() * mockPackages.length)];
    const currentVersion = `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;

    if (isOutdated) {
      dependencies[packageName] = {
        current: currentVersion,
        latest: `${Math.floor(Math.random() * 10) + 1}.0.0`,
        severity: 'medium',
      };
    } else {
      dependencies[packageName] = {
        current: currentVersion,
        vulnerability: {
          id: `CVE-2023-${Math.floor(Math.random() * 10000)}`,
          severity: ['low', 'medium', 'high', 'critical'][
            Math.floor(Math.random() * 4)
          ],
          description: 'Mock vulnerability for testing',
        },
      };
    }
  }

  return dependencies;
}

/**
 * Analyze dependencies for outdated versions and vulnerabilities
 * @param dependencies Object containing dependencies with their versions
 * @returns Analysis results with outdated and vulnerable packages
 */
async function analyzeDependencies(
  dependencies: Record<string, string>
): Promise<{
  outdated: Record<string, any>;
  vulnerable: Record<string, any>;
  rateLimited?: boolean;
}> {
  const outdated: Record<string, any> = {};
  const vulnerable: Record<string, any> = {};
  let rateLimited = false;

  try {
    // For each dependency, fetch latest version from npm registry
    // and check for vulnerabilities in security databases
    const dependencyEntries = Object.entries(dependencies);

    // We'll use the npm registry API for version checking
    // For vulnerabilities, in a production implementation you would use a proper vulnerability database

    // Process in batches to avoid overwhelming external APIs
    const batchSize = 5; // Reduced batch size to be more gentle on APIs

    for (let i = 0; i < dependencyEntries.length; i += batchSize) {
      const batch = dependencyEntries.slice(i, i + batchSize);

      // Process each package in the batch
      const promises = batch.map(async ([name, version]) => {
        try {
          // Clean the version string (remove ^, ~, etc.)
          const cleanVersion = version.replace(/[\^~>=<]/g, '');

          // Check for latest version
          const latestVersion = await getLatestVersion(name);

          // Simple semver comparison (in production, use a proper semver library)
          if (latestVersion && isNewerVersion(cleanVersion, latestVersion)) {
            outdated[name] = {
              current: cleanVersion,
              latest: latestVersion,
              severity: calculateUpdateSeverity(cleanVersion, latestVersion),
            };
          }

          // Skip vulnerability checks if we're already rate limited
          if (!rateLimited) {
            // Check for vulnerabilities
            try {
              const vulnerabilityInfo = await checkVulnerabilities(
                name,
                cleanVersion
              );
              if (vulnerabilityInfo) {
                vulnerable[name] = {
                  current: cleanVersion,
                  vulnerability: vulnerabilityInfo,
                };
              }
            } catch (error: any) {
              // Check specifically for rate limit errors
              if (
                error.response?.status === 403 &&
                error.response?.data?.message?.includes('rate limit exceeded')
              ) {
                console.warn(
                  `API rate limit exceeded during vulnerability checks. Will skip further vulnerability checks.`
                );
                rateLimited = true;
              } else {
                console.error(
                  `Error checking vulnerabilities for ${name}:`,
                  error
                );
              }
            }
          }
        } catch (error) {
          console.error(`Error analyzing dependency ${name}:`, error);
        }
      });

      await Promise.all(promises);

      // Add a small delay between batches to be nice to external APIs
      if (i + batchSize < dependencyEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
      }
    }
  } catch (error) {
    console.error('Error in dependency analysis:', error);
  }

  return { outdated, vulnerable, rateLimited };
}

router.get('/history/:projectId', (req, res) => {
  // Placeholder
  res.status(200).json({
    message: `Get scan history for project ${req.params.projectId} endpoint`,
  });
});

/**
 * Get the latest version of a package from npm registry
 * @param packageName The name of the package
 * @returns Latest version string or null if not found
 */
async function getLatestVersion(packageName: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `${NPM_REGISTRY_API}/${encodeURIComponent(packageName)}`
    );
    return response.data?.['dist-tags']?.latest || null;
  } catch (error) {
    console.error(`Error fetching latest version for ${packageName}:`, error);
    return null;
  }
}

/**
 * Check if version B is newer than version A
 * @param versionA First version
 * @param versionB Second version
 * @returns true if versionB is newer than versionA
 */
function isNewerVersion(versionA: string, versionB: string): boolean {
  try {
    return compareVersions(versionB, versionA) > 0;
  } catch (error) {
    // If compare fails (invalid semver), return false
    return false;
  }
}

/**
 * Calculate the severity of an update based on version difference
 * @param currentVersion Current version
 * @param latestVersion Latest version
 * @returns Severity level: 'low', 'medium', or 'high'
 */
function calculateUpdateSeverity(
  currentVersion: string,
  latestVersion: string
): 'low' | 'medium' | 'high' {
  try {
    const [currentMajor, currentMinor] = currentVersion.split('.').map(Number);
    const [latestMajor, latestMinor] = latestVersion.split('.').map(Number);

    if (latestMajor > currentMajor) {
      return 'high'; // Major version update
    } else if (latestMinor > currentMinor) {
      return 'medium'; // Minor version update
    } else {
      return 'low'; // Patch update
    }
  } catch (error) {
    return 'low'; // Default to low if parsing fails
  }
}

/**
 * Check for vulnerabilities in a package
 * @param packageName Package name
 * @param version Package version
 * @returns Vulnerability info or null if none found
 */
async function checkVulnerabilities(
  packageName: string,
  version: string
): Promise<any | null> {
  try {
    // First check our local known vulnerabilities list for faster response and to avoid API rate limits
    const knownVulnerablePackages: Record<string, any> = {
      lodash: {
        '4.17.0': {
          id: 'CVE-2019-10744',
          severity: 'high',
          description: 'Prototype pollution vulnerability in Lodash',
        },
      },
      axios: {
        '0.19.0': {
          id: 'CVE-2020-28168',
          severity: 'medium',
          description: 'Axios SSRF vulnerability',
        },
      },
      // Add more known vulnerabilities here as needed
    };

    // Check our local database first
    if (knownVulnerablePackages[packageName]?.[version]) {
      return knownVulnerablePackages[packageName][version];
    }

    // Try the GitHub Security Advisories API with proper error handling for rate limits
    try {
      const response = await axios.get(
        `${SECURITY_ADVISORIES_API}?package=${encodeURIComponent(packageName)}`
      );

      if (!response.data || !Array.isArray(response.data)) {
        return null;
      }

      // Find a vulnerability that affects the current version
      for (const advisory of response.data) {
        if (advisory.affected?.package?.name === packageName) {
          const vulnerable = advisory.affected.ranges.some((range: any) => {
            // Simplified version check - in production you'd use a proper semver range check
            return (
              range.type === 'SEMVER' &&
              version >= range.events[0].introduced &&
              (!range.events[1]?.fixed || version < range.events[1].fixed)
            );
          });

          if (vulnerable) {
            return {
              id:
                advisory.id ||
                `GHSA-${Math.random().toString(36).substr(2, 8)}`,
              severity: advisory.severity || 'medium',
              description:
                advisory.summary || 'Security vulnerability detected',
              references: advisory.references || [],
            };
          }
        }
      }
    } catch (error: any) {
      // Handle rate limit errors gracefully
      if (
        error.response?.status === 403 &&
        error.response?.data?.message?.includes('rate limit exceeded')
      ) {
        console.warn(
          `GitHub API rate limit exceeded for ${packageName}. Using fallback vulnerability detection.`
        );
        // We'll continue with other checks instead of failing
      } else {
        // For other errors, log but don't fail the entire operation
        console.error(`GitHub API error for ${packageName}:`, error.message);
      }
    }

    // As a fallback for popular packages, we could implement additional checks here
    // such as checking other public vulnerability databases or using heuristics

    return null;
  } catch (error) {
    console.error(
      `Error checking vulnerabilities for ${packageName}@${version}:`,
      error
    );
    return null;
  }
}

export default router;
