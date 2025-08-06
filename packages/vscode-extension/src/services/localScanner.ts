import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { StatusBarManager } from './statusBarManager';

/**
 * Local scanner service for offline package scanning when GitHub API is rate limited
 */
export class LocalScanner {
  private statusBarManager?: StatusBarManager;

  constructor(statusBarManager?: StatusBarManager) {
    this.statusBarManager = statusBarManager;
  }

  /**
   * Run a local scan of a package.json file using preloaded data
   */
  public async scanFile(filePath: string): Promise<any> {
    try {
      // Get the document content
      const document = await vscode.workspace.openTextDocument(filePath);
      const packageJson = JSON.parse(document.getText());

      // Get project name from workspace
      let projectName = 'Unknown Project';
      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        const relativePath = vscode.workspace.asRelativePath(filePath);
        if (relativePath !== filePath) {
          const dirName = path.dirname(relativePath);
          projectName =
            dirName === '.'
              ? vscode.workspace.workspaceFolders[0].name
              : `${vscode.workspace.workspaceFolders[0].name}/${dirName}`;
        }
      }

      // Process dependencies
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      const totalDependencies =
        Object.keys(dependencies).length + Object.keys(devDependencies).length;

      // Using a hardcoded list of known outdated packages (this would be loaded from a local database in production)
      // The list is based on common packages that are often outdated
      const knownOutdatedPackages: Record<
        string,
        { current: string; latest: string }
      > = {
        axios: { current: '1.3.0', latest: '1.6.7' },
        lodash: { current: '4.17.20', latest: '4.17.21' },
        express: { current: '4.17.1', latest: '4.18.2' },
        moment: { current: '2.29.1', latest: '2.30.1' },
        react: { current: '17.0.2', latest: '18.2.0' },
        uuid: { current: '8.3.2', latest: '9.0.0' },
        typescript: { current: '4.5.5', latest: '5.3.3' },
      };

      // Check for outdated packages
      let outdatedCount = 0;
      const outdatedPackages: Record<string, any> = {};

      // Check regular dependencies
      for (const [name, version] of Object.entries<string>(dependencies)) {
        const cleanVersion = version.replace(/[\^~>=<]/g, '');
        if (
          knownOutdatedPackages[name] &&
          cleanVersion === knownOutdatedPackages[name].current
        ) {
          outdatedPackages[name] = {
            current: cleanVersion,
            latest: knownOutdatedPackages[name].latest,
            severity: 'medium',
          };
          outdatedCount++;
        }
      }

      // Check dev dependencies
      for (const [name, version] of Object.entries<string>(devDependencies)) {
        const cleanVersion = version.replace(/[\^~>=<]/g, '');
        if (
          knownOutdatedPackages[name] &&
          cleanVersion === knownOutdatedPackages[name].current
        ) {
          outdatedPackages[name] = {
            current: cleanVersion,
            latest: knownOutdatedPackages[name].latest,
            severity: 'low', // Dev dependencies typically have lower severity
          };
          outdatedCount++;
        }
      }

      // Update status bar
      if (this.statusBarManager) {
        this.statusBarManager.update(outdatedCount, 0);
      }

      // Log results
      Logger.info(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      );
      Logger.info(`📦 LOCAL SCAN RESULTS FOR: ${projectName}`);
      Logger.info(`🔍 Total Dependencies: ${totalDependencies}`);

      if (outdatedCount > 0) {
        Logger.info(`⚠️ Outdated Packages: ${outdatedCount}`);
        // Log details of outdated packages
        Object.entries(outdatedPackages).forEach(
          ([name, info]: [string, any]) => {
            Logger.info(
              `   - ${name}: ${info.current} → ${info.latest} (${info.severity} priority)`
            );
          }
        );
      } else {
        Logger.info('✅ All dependencies appear to be up-to-date!');
      }

      Logger.info(
        `ℹ️ Note: Vulnerability data is unavailable due to GitHub API rate limits`
      );
      Logger.info(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      );

      // Return results for UI updates
      return {
        summary: {
          total: totalDependencies,
          outdated: outdatedCount,
          vulnerable: 0, // We don't have vulnerability data in local mode
        },
        details: {
          dependencies: {
            outdated: outdatedPackages,
            vulnerable: {},
          },
        },
        warnings: {
          localScan: true,
          message: 'Scan performed with local data only due to API rate limit',
        },
      };
    } catch (error) {
      Logger.error(
        'Local scan failed',
        error instanceof Error ? error : new Error(String(error))
      );
      vscode.window.showErrorMessage(
        `PackSafe: Local scan failed - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw new Error(
        `Local scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
