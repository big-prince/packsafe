import axios from 'axios';
import { Logger } from '../utils/logger';

export interface NpmPackage {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  author?: {
    name: string;
    email?: string;
  };
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  license: string;
  downloads: {
    weekly: number;
    monthly: number;
  };
  lastPublish: string;
}

export interface SearchResult {
  packages: NpmPackage[];
  total: number;
  hasMore: boolean;
}

/**
 * Service for searching and retrieving npm package information
 */
export class NpmSearchService {
  private static readonly NPM_SEARCH_API =
    'https://registry.npmjs.org/-/v1/search';
  private static readonly NPM_DOWNLOADS_API = 'https://api.npmjs.org/downloads';
  private readonly cache = new Map<
    string,
    { result: SearchResult; timestamp: number }
  >();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Search for packages by query
   */
  async searchPackages(
    query: string,
    options: {
      size?: number;
      from?: number;
      quality?: number;
      popularity?: number;
      maintenance?: number;
    } = {}
  ): Promise<SearchResult> {
    if (!query.trim()) {
      return { packages: [], total: 0, hasMore: false };
    }

    const cacheKey = `${query}-${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }

    try {
      const params = {
        text: query,
        size: options.size || 20,
        from: options.from || 0,
        quality: options.quality || 0.65,
        popularity: options.popularity || 0.98,
        maintenance: options.maintenance || 0.5,
      };

      Logger.info(`Searching npm packages: ${query}`);

      const response = await axios.get(NpmSearchService.NPM_SEARCH_API, {
        params,
        timeout: 10000,
      });

      const packages: NpmPackage[] = await Promise.all(
        response.data.objects.map(async (pkg: any) => {
          const downloads = await this.getPackageDownloads(pkg.package.name);

          return {
            name: pkg.package.name,
            version: pkg.package.version,
            description: pkg.package.description || 'No description available',
            keywords: pkg.package.keywords || [],
            author: pkg.package.author,
            repository: pkg.package.repository,
            homepage: pkg.package.homepage,
            license: pkg.package.license || 'Unknown',
            downloads,
            lastPublish: pkg.package.date,
          };
        })
      );

      const result: SearchResult = {
        packages,
        total: response.data.total,
        hasMore: response.data.total > (options.from || 0) + packages.length,
      };

      // Cache the result
      this.cache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch (error) {
      Logger.error(
        'Failed to search npm packages:',
        error instanceof Error ? error : new Error(String(error))
      );
      return { packages: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get package download statistics
   */
  private async getPackageDownloads(
    packageName: string
  ): Promise<{ weekly: number; monthly: number }> {
    try {
      const [weeklyResponse, monthlyResponse] = await Promise.all([
        axios.get(
          `${NpmSearchService.NPM_DOWNLOADS_API}/point/last-week/${packageName}`,
          { timeout: 5000 }
        ),
        axios.get(
          `${NpmSearchService.NPM_DOWNLOADS_API}/point/last-month/${packageName}`,
          { timeout: 5000 }
        ),
      ]);

      return {
        weekly: weeklyResponse.data.downloads || 0,
        monthly: monthlyResponse.data.downloads || 0,
      };
    } catch (error) {
      // If downloads API fails, return zeros
      return { weekly: 0, monthly: 0 };
    }
  }

  /**
   * Get detailed package information
   */
  async getPackageDetails(packageName: string): Promise<NpmPackage | null> {
    try {
      const response = await axios.get(
        `https://registry.npmjs.org/${packageName}`,
        {
          timeout: 10000,
        }
      );

      const pkg = response.data;
      const latestVersion = pkg['dist-tags'].latest;
      const versionData = pkg.versions[latestVersion];
      const downloads = await this.getPackageDownloads(packageName);

      return {
        name: pkg.name,
        version: latestVersion,
        description: versionData.description || 'No description available',
        keywords: versionData.keywords || [],
        author: versionData.author,
        repository: versionData.repository,
        homepage: versionData.homepage,
        license: versionData.license || 'Unknown',
        downloads,
        lastPublish: pkg.time[latestVersion],
      };
    } catch (error) {
      Logger.error(
        `Failed to get package details for ${packageName}:`,
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
