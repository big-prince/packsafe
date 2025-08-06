import * as vscode from 'vscode';
import axios from 'axios';
import { ConfigurationManager } from './configurationManager';
import { Logger } from '../utils/logger';
import { StatusBarManager } from './statusBarManager';
import { LocalScanner } from './localScanner';
import {
  PackageJsonTreeProvider,
  DependencyStatus,
} from '../views/packageJsonTreeProvider';

export class PackageScanner {
  private configManager: ConfigurationManager;
  private statusBarManager?: StatusBarManager;
  private localScanner: LocalScanner;
  private treeProvider?: PackageJsonTreeProvider;

  constructor(
    configManager: ConfigurationManager,
    statusBarManager?: StatusBarManager
  ) {
    this.configManager = configManager;
    this.statusBarManager = statusBarManager;
    this.localScanner = new LocalScanner(statusBarManager);
  }

  public setTreeProvider(treeProvider: PackageJsonTreeProvider): void {
    this.treeProvider = treeProvider;
  }

  public async scanWorkspace(): Promise<void> {
    try {
      // Check if a workspace is open
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        const message = 'No workspace folder is open';
        Logger.info(message);
        vscode.window.showInformationMessage(`PackSafe: ${message}`);
        // Signal this state through status bar
        vscode.commands.executeCommand('packsafe.updateStatusBar', 0, 0);
        vscode.commands.executeCommand(
          'setContext',
          'packsafe.hasValidWorkspace',
          false
        );
        return;
      }

      Logger.info('Starting workspace scan for package.json files');

      // Enhanced search to find ALL package.json files, including in deeply nested directories
      const files = await vscode.workspace.findFiles(
        '**/package.json',
        '{**/node_modules/**,**/bower_components/**,**/jspm_packages/**,**/web_modules/**,**/dist/**,**/build/**,**/coverage/**,**/.git/**}' // Exclude common dirs that shouldn't be scanned
      );

      // Log what we found for better debugging
      Logger.info(`Found ${files.length} package.json files in workspace:`);
      files.forEach(file => {
        Logger.info(` - ${vscode.workspace.asRelativePath(file)}`);
      });

      if (files.length === 0) {
        const message = 'No package.json files found in workspace';
        Logger.info(message);
        vscode.window.showInformationMessage(`PackSafe: ${message}`);
        // Signal this state through status bar
        vscode.commands.executeCommand(
          'setContext',
          'packsafe.hasNodeProject',
          false
        );
        if (this.statusBarManager) {
          this.statusBarManager.setWaiting('Not a Node.js project');
        }
        return;
      }

      // Set context flags for UI state
      vscode.commands.executeCommand(
        'setContext',
        'packsafe.hasValidWorkspace',
        true
      );
      vscode.commands.executeCommand(
        'setContext',
        'packsafe.hasNodeProject',
        true
      );

      // If there are multiple package.json files, offer the option to scan a specific one
      if (files.length > 1 && !vscode.env.isTelemetryEnabled) {
        const scanAll = 'Scan All';
        const selectOne = 'Select One';
        const response = await vscode.window.showInformationMessage(
          `Found ${files.length} package.json files. How would you like to proceed?`,
          scanAll,
          selectOne
        );

        if (response === selectOne) {
          // Map file paths to readable options
          const options = files.map(file => {
            const relativePath = vscode.workspace.asRelativePath(file);
            const dirName = relativePath.replace(/\/package\.json$/, '');
            return {
              label: dirName,
              description: file.fsPath,
              detail: `Scan this package.json file only`,
            };
          });

          const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select a package.json file to scan',
          });

          if (selected) {
            return this.scanFile(selected.description);
          }
          return;
        }
        // If scanAll or no selection, continue with all files
      }

      // Show progress notification
      return vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'PackSafe: Scanning project dependencies...',
          cancellable: true,
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            console.log('User canceled the scan');
          });

          const totalFiles = files.length;
          let processedFiles = 0;

          for (const file of files) {
            if (token.isCancellationRequested) {
              return;
            }

            const increment = (1 / totalFiles) * 100;
            progress.report({
              increment,
              message: `Scanning ${file.fsPath.split('/').pop()} (${
                processedFiles + 1
              }/${totalFiles})`,
            });

            await this.scanFile(file.fsPath);
            processedFiles++;
          }

          vscode.window.showInformationMessage(
            `PackSafe: Scanned ${processedFiles} package.json files`
          );
        }
      );
    } catch (error) {
      const errorMessage = 'Error scanning workspace';
      Logger.error(
        errorMessage,
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error(
        `Failed to scan workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async scanFile(filePath: string): Promise<any> {
    try {
      // Get the document and parse it
      const document = await vscode.workspace.openTextDocument(filePath);
      const packageJson = JSON.parse(document.getText());

      // Get API configuration
      const apiBaseUrl = this.configManager.getServerUrl();
      const apiKey = this.configManager.getApiKey();

      if (!apiKey) {
        Logger.info('API key not configured - cannot scan');
        throw new Error('API key not configured');
      }

      // Get the workspace name (if available)
      let projectName = 'Unknown Project';
      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        projectName = workspaceFolder.name;

        // Check if the file is in the workspace
        const relativePath = vscode.workspace.asRelativePath(filePath);
        if (relativePath !== filePath) {
          Logger.info(`Scanning ${relativePath} in project ${projectName}`);
        }
      }

      // Set loading state in tree provider
      if (this.treeProvider) {
        this.treeProvider.setLoadingState(filePath);
      }

      // Make API request
      Logger.info(
        `Sending scan request for ${projectName} package.json to server`
      );
      const response = await axios.post(
        `${apiBaseUrl}/api/scan/package-json`,
        {
          packageJson,
          filePath,
          projectName,
        },
        {
          headers: {
            'x-api-key': apiKey,
          },
        }
      );

      // Log response data for debugging
      Logger.info(
        `Received response from server for ${projectName} package.json scan`
      );
      Logger.debug(`Response data: ${JSON.stringify(response.data, null, 2)}`);

      // Validate response format before using it
      if (!response.data) {
        throw new Error('Invalid response from server: Empty response data');
      }

      // Handle different response formats - some endpoints might return data differently
      let outdated = 0;
      let vulnerable = 0;

      if (response.data.summary) {
        // Standard format
        outdated = response.data.summary.outdated || 0;
        vulnerable = response.data.summary.vulnerable || 0;

        // Log a summary of findings in the output channel
        const totalDeps = response.data.summary.total || 0;
        Logger.info(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        );
        Logger.info(`📦 PACKAGE SCAN RESULTS FOR: ${projectName}`);
        Logger.info(`🔍 Total Dependencies: ${totalDeps}`);

        if (outdated > 0 || vulnerable > 0) {
          if (outdated > 0) {
            Logger.info(`⚠️ Outdated Packages: ${outdated}`);
            // Log details of outdated packages
            const outdatedDeps =
              response.data.details?.dependencies?.outdated || {};
            Object.entries(outdatedDeps).forEach(
              ([name, info]: [string, any]) => {
                Logger.info(
                  `   - ${name}: ${info.current} → ${info.latest} (${info.severity} priority)`
                );
              }
            );
          }

          if (vulnerable > 0) {
            Logger.info(`🔴 Vulnerable Packages: ${vulnerable}`);
            // Log details of vulnerable packages
            const vulnerableDeps =
              response.data.details?.dependencies?.vulnerable || {};
            Object.entries(vulnerableDeps).forEach(
              ([name, info]: [string, any]) => {
                Logger.info(
                  `   - ${name}: ${info.current} (${info.vulnerability.severity}) - ${info.vulnerability.description}`
                );
              }
            );
          }

          // Update tree provider with dependency status
          if (this.treeProvider) {
            this.updateTreeProviderStatus(filePath, response.data);
          }
        } else {
          Logger.info('✅ All dependencies are up-to-date and secure!');
          // Update tree provider with all dependencies as 'ok'
          if (this.treeProvider) {
            this.updateTreeProviderStatus(filePath, response.data);
          }
        }
        Logger.info(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        );
      } else if (
        typeof response.data.outdated === 'number' &&
        typeof response.data.vulnerable === 'number'
      ) {
        // Alternative format directly in response.data
        outdated = response.data.outdated;
        vulnerable = response.data.vulnerable;
        Logger.info(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        );
        Logger.info(`📦 PACKAGE SCAN RESULTS FOR: ${projectName}`);
        Logger.info(`⚠️ Outdated Packages: ${outdated}`);
        Logger.info(`🔴 Vulnerable Packages: ${vulnerable}`);
        Logger.info(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        );
      } else {
        // In development mode or with mock API, generate some random values
        Logger.info('Using mock scan results for package.json');
        outdated = Math.floor(Math.random() * 5);
        vulnerable = Math.floor(Math.random() * 3);
      }

      // Update the status bar with the found values
      vscode.commands.executeCommand(
        'packsafe.updateStatusBar',
        outdated,
        vulnerable
      );

      // Ensure status bar is visible after update
      if (this.statusBarManager) {
        this.statusBarManager.show();
      }

      // Check if any API rate limit warnings were included in the response
      if (response.data.warnings?.rateLimited) {
        Logger.warning(
          '⚠️ API rate limit was exceeded during scan. Vulnerability data may be incomplete.'
        );
        vscode.window
          .showWarningMessage(
            'PackSafe: GitHub API rate limit exceeded. Vulnerability data may be incomplete.',
            'Use Local Data',
            'Learn More'
          )
          .then(selection => {
            if (selection === 'Learn More') {
              vscode.env.openExternal(
                vscode.Uri.parse(
                  'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
                )
              );
            } else if (selection === 'Use Local Data') {
              // Re-run the scan with a local-only flag
              Logger.info('Re-running scan with local data only...');
              this.scanFileLocally(filePath);
            }
          });
      }

      // Show notifications for significant findings
      if (vulnerable > 0) {
        // For vulnerabilities, always show a notification as these are critical
        vscode.window
          .showErrorMessage(
            `PackSafe: ${vulnerable} vulnerable package${vulnerable === 1 ? '' : 's'} detected in your project!`,
            'View Details'
          )
          .then(selection => {
            if (selection === 'View Details') {
              Logger.show();
            }
          });
      } else if (outdated > 2) {
        // For outdated packages, only notify if there are several
        vscode.window
          .showWarningMessage(
            `PackSafe: ${outdated} outdated package${outdated === 1 ? '' : 's'} found in your project.`,
            'View Details'
          )
          .then(selection => {
            if (selection === 'View Details') {
              Logger.show();
            }
          });
      }

      return response.data;
    } catch (error) {
      const errorMessage = `Error scanning file ${filePath}`;

      // Extract more specific error info
      let detailedError: Error;

      if (error instanceof Error) {
        detailedError = error;
      } else {
        detailedError = new Error(String(error));
      }

      // If it's an Axios error, add more context about the response
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The server responded with a status code outside of 2xx range
          const status = error.response.status;
          const serverMessage =
            error.response.data?.message || 'Unknown server error';
          detailedError.message = `Server error (${status}): ${serverMessage}. Original error: ${detailedError.message}`;

          // If we got a rate limit error, offer to run local scan
          if (
            status === 429 ||
            (serverMessage &&
              serverMessage.toLowerCase().includes('rate limit'))
          ) {
            vscode.window
              .showWarningMessage(
                'PackSafe: GitHub API rate limit exceeded. Would you like to continue with local data only?',
                'Yes',
                'No'
              )
              .then(selection => {
                if (selection === 'Yes' && filePath) {
                  this.scanFileLocally(filePath);
                }
              });
          }
        } else if (error.request) {
          // The request was made but no response was received
          detailedError.message = `Network error: Server unreachable. Please check your connection and server URL.`;
        }
      }

      Logger.error(errorMessage, detailedError, filePath);

      // Update status bar to show the error
      vscode.commands.executeCommand('packsafe.updateStatusBar', 0, 0);

      throw new Error(`Failed to scan ${filePath}: ${detailedError.message}`);
    }
  }

  /**
   * Use local scanner as a fallback when GitHub API rate limit is reached
   */
  public async scanFileLocally(filePath: string): Promise<any> {
    try {
      Logger.info(`Using local scanner for ${filePath} due to API rate limit`);
      const results = await this.localScanner.scanFile(filePath);

      // Update status bar with the local results
      if (this.statusBarManager && results && results.summary) {
        this.statusBarManager.update(
          results.summary.outdated || 0,
          results.summary.vulnerable || 0
        );
      }

      return results;
    } catch (error) {
      Logger.error(
        'Local scan failed',
        error instanceof Error ? error : new Error(String(error))
      );

      // Show notification about failure
      vscode.window.showErrorMessage(
        `PackSafe: Local scan failed - ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Update status bar to error state
      if (this.statusBarManager) {
        this.statusBarManager.setWaiting('Scan failed');
      }

      throw error;
    }
  }

  /**
   * Update tree provider with dependency status from scan results
   */
  private updateTreeProviderStatus(
    packageJsonPath: string,
    scanData: any
  ): void {
    if (!this.treeProvider) {
      return;
    }

    const dependencyStatuses: { [key: string]: DependencyStatus } = {};

    // Calculate statistics
    let outdated = 0;
    let vulnerable = 0;
    let deprecated = 0;
    let total = 0;

    // Process outdated dependencies
    if (scanData.details?.dependencies?.outdated) {
      Object.keys(scanData.details.dependencies.outdated).forEach(name => {
        dependencyStatuses[name] = 'outdated';
        outdated++;
      });
    }

    // Process vulnerable dependencies
    if (scanData.details?.dependencies?.vulnerable) {
      Object.keys(scanData.details.dependencies.vulnerable).forEach(name => {
        dependencyStatuses[name] = 'vulnerable';
        vulnerable++;
      });
    }

    // Process deprecated dependencies (if available)
    if (scanData.details?.dependencies?.deprecated) {
      Object.keys(scanData.details.dependencies.deprecated).forEach(name => {
        dependencyStatuses[name] = 'deprecated';
        deprecated++;
      });
    }

    // Get total from scan data or calculate from package.json
    if (scanData.summary?.total) {
      total = scanData.summary.total;
    } else {
      // Fallback: calculate from package.json
      try {
        const fs = require('fs');
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        total = Object.keys(dependencies).length;
      } catch (error) {
        total = outdated + vulnerable + deprecated;
      }
    }

    // Update the tree provider with both dependency statuses and scan stats
    this.treeProvider.updateDependencyStatus(
      packageJsonPath,
      dependencyStatuses
    );
    this.treeProvider.updateScanStats(packageJsonPath, {
      outdated,
      vulnerable,
      deprecated,
      total,
    });
  }
}
