import * as vscode from 'vscode';
import axios from 'axios';
import { StatusBarManager } from './statusBarManager';
import { ConfigurationManager } from './configurationManager';
import { Logger } from '../utils/logger';

export class WebSocketClient implements vscode.Disposable {
  private configManager: ConfigurationManager;
  private statusBarManager: StatusBarManager;
  private pollInterval: NodeJS.Timeout | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'error' =
    'disconnected';
  private readonly POLL_INTERVAL_MS = 30000; // Poll every 30 seconds

  constructor(
    configManager: ConfigurationManager,
    statusBarManager: StatusBarManager
  ) {
    this.configManager = configManager;
    this.statusBarManager = statusBarManager;
  }

  /**
   * Connect to the server by starting the polling interval
   */
  public async connect(): Promise<void> {
    // Stop any existing polling
    this.disconnect();

    try {
      Logger.info('Connecting to update service...');
      this.statusBarManager.setWaiting('Connecting...');

      // Try to connect once to validate configuration
      await this.checkForUpdates();

      // Start regular polling
      this.pollInterval = setInterval(() => {
        this.checkForUpdates().catch(error => {
          Logger.error(
            'Error polling for updates',
            error instanceof Error ? error : new Error(String(error))
          );
          this.setConnectionStatus('error');
        });
      }, this.POLL_INTERVAL_MS);

      this.setConnectionStatus('connected');
      Logger.info(
        'Started polling for updates every ' +
          this.POLL_INTERVAL_MS / 1000 +
          ' seconds'
      );
    } catch (error) {
      Logger.error(
        'Failed to connect to update service',
        error instanceof Error ? error : new Error(String(error))
      );
      this.setConnectionStatus('error');

      // Preserve the original error message for better debugging
      if (error instanceof Error) {
        // Don't wrap the error message in another "Failed to connect" if it's already detailed
        if (
          error.message.includes('error:') ||
          error.message.includes('failed:') ||
          error.message.includes('Error:') ||
          error.message.includes('Failed:')
        ) {
          throw error; // Just rethrow the original error with its detailed message
        } else {
          throw new Error(`Failed to connect: ${error.message}`);
        }
      } else {
        throw new Error(`Failed to connect: ${String(error)}`);
      }
    }
  }

  /**
   * Disconnect from the server by stopping the polling interval
   */
  public disconnect(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.setConnectionStatus('disconnected');
      Logger.info('Stopped polling for updates');
    }
  }

  /**
   * Check if we have a valid workspace with package.json
   * @returns Object with validation results
   */
  private async validateWorkspace(): Promise<{
    valid: boolean;
    workspaceName?: string;
    reason?: string;
  }> {
    // Check if we have an open workspace
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      Logger.info('No workspace folder open - PackSafe monitoring is paused');
      this.statusBarManager.setWaiting('No project');
      return { valid: false, reason: 'No workspace folder is open' };
    }

    // Get the primary workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const workspaceName = workspaceFolder.name;

    // Search for package.json files recursively in the workspace
    try {
      const packageJsonFiles = await vscode.workspace.findFiles(
        '**/package.json',
        '**/node_modules/**'
      );

      if (packageJsonFiles.length === 0) {
        const reason = `No package.json found in workspace "${workspaceName}"`;
        Logger.info(`${reason} - PackSafe monitoring is paused`);
        this.statusBarManager.setWaiting('Not a Node.js project');
        return { valid: false, reason };
      }

      Logger.debug(
        `Found ${packageJsonFiles.length} package.json files in workspace`
      );
      return { valid: true, workspaceName };
    } catch (error) {
      const reason = `Error searching for package.json files: ${error instanceof Error ? error.message : String(error)}`;
      Logger.error(reason);
      this.statusBarManager.setWaiting('Search error');
      return { valid: false, reason };
    }
  }

  private async checkForUpdates(): Promise<void> {
    const apiKey = this.configManager.getApiKey();
    const serverUrl = this.configManager.getServerUrl();

    if (!apiKey) {
      this.statusBarManager.setWaiting('No API key');
      throw new Error('API key not configured');
    }

    try {
      const { valid, workspaceName, reason } = await this.validateWorkspace();
      if (!valid) {
        Logger.error(
          'Error checking for valid workspace:',
          reason ? new Error(reason) : undefined
        );
        throw new Error(reason || 'Invalid workspace');
      }

      // Now we know we have a valid workspace with a package.json file
      Logger.debug(`Checking status for project: ${workspaceName}`);

      try {
        this.statusBarManager.setWaiting('Connecting...');

        const response = await axios.get(
          `${serverUrl}/api/projects/${workspaceName}/status`,
          {
            headers: {
              'x-api-key': apiKey,
            },
          }
        );

        const { outdated, vulnerable } = response.data;

        // Update the status bar with the new information
        vscode.commands.executeCommand(
          'packsafe.updateStatusBar',
          outdated,
          vulnerable
        );

        // Show notification if there are vulnerable packages and notifications are enabled
        if (vulnerable > 0 && this.configManager.getNotifications()) {
          vscode.window
            .showWarningMessage(
              `PackSafe: ${vulnerable} vulnerable packages detected in your project`,
              'Scan Now'
            )
            .then(selection => {
              if (selection === 'Scan Now') {
                vscode.commands.executeCommand('packsafe.scanProject');
              }
            });
        }
      } catch (error) {
        // Log the detailed error for debugging
        Logger.error(
          'Error checking for updates:',
          error instanceof Error ? error : new Error(String(error))
        );

        // Check for specific error types
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            // Authentication error
            this.statusBarManager.setWaiting('Authentication needed');
            throw new Error(
              `Authentication failed (401): ${error.message}. Please check your API key.`
            );
          } else if (error.response) {
            // Server responded with an error status
            const status = error.response.status;
            const serverMessage =
              error.response.data?.message || 'Unknown server error';
            this.statusBarManager.setWaiting(`Server error (${status})`);
            throw new Error(`Server error (${status}): ${serverMessage}`);
          } else if (error.request) {
            // Request was made but no response received (network issue)
            this.statusBarManager.setWaiting('Network error');
            throw new Error(
              `Network error: Server unreachable. Please check your connection and server URL.`
            );
          } else {
            // Something else went wrong in request setup
            this.statusBarManager.setWaiting('Request error');
            throw new Error(`Request setup error: ${error.message}`);
          }
        } else {
          // For non-Axios errors
          this.statusBarManager.setWaiting('Connection error');
          if (error instanceof Error) {
            throw new Error(`Connection error: ${error.message}`);
          } else {
            throw new Error(`Connection error: ${String(error)}`);
          }
        }
      }
    } catch (error) {
      Logger.error(
        'Error validating workspace:',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Set the connection status and update UI accordingly
   */
  private setConnectionStatus(
    status: 'connected' | 'disconnected' | 'error'
  ): void {
    this.connectionStatus = status;

    // Update the status bar based on connection status
    if (status === 'error') {
      this.statusBarManager.setWaiting('Connection error');

      if (this.configManager.getNotifications()) {
        vscode.window
          .showErrorMessage(
            'PackSafe: Connection to server failed. Check your API key and server URL.',
            'Configure'
          )
          .then(selection => {
            if (selection === 'Configure') {
              vscode.commands.executeCommand('packsafe.configure');
            }
          });
      }
    } else if (status === 'disconnected') {
      this.statusBarManager.setWaiting('Disconnected');
    }
  }

  /**
   * Dispose the resources used by this client
   */
  public dispose(): void {
    this.disconnect();
  }
}
