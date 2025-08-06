import * as vscode from 'vscode';
import * as fs from 'fs';
import { PackageDependencyProvider } from './providers/packageDependencyProvider';
import { TaskProvider } from './providers/taskProvider';
import { ProblemMatcherRegistrar } from './providers/problemMatcherRegistrar';
import { PackageScanner } from './services/packageScanner';
import { ConfigurationManager } from './services/configurationManager';
import { StatusBarManager } from './services/statusBarManager';
import { WebSocketClient } from './services/websocketClient';
import { Logger } from './utils/logger';
import { PackageJsonTreeProvider } from './views/packageJsonTreeProvider';
import { DependencyTreeProvider } from './views/dependencyTreeProvider';
import { SearchTreeProvider } from './views/searchTreeProvider';
import { PackageManager } from './services/packageManager';
import { SearchWebviewProvider } from './webviews/searchWebviewProvider';

let packageScanner: PackageScanner;
let statusBarManager: StatusBarManager;
let websocketClient: WebSocketClient;
let configManager: ConfigurationManager;
let outputChannel: vscode.OutputChannel;
let taskProvider: TaskProvider;
let packageJsonTreeProvider: PackageJsonTreeProvider;
let dependencyTreeProvider: DependencyTreeProvider;
let searchTreeProvider: SearchTreeProvider;
let packageManager: PackageManager;
let searchWebviewProvider: SearchWebviewProvider;
let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
  // Store context for global access
  extensionContext = context;

  // Create output channel and initialize logger
  outputChannel = vscode.window.createOutputChannel('PackSafe');
  context.subscriptions.push(outputChannel);
  Logger.initialize(outputChannel);

  // Log activation
  Logger.info('PackSafe extension is being activated');

  // Initialize services
  configManager = new ConfigurationManager();
  configManager.setContext(context);
  statusBarManager = new StatusBarManager();

  // Register tree data providers
  packageJsonTreeProvider = new PackageJsonTreeProvider();
  dependencyTreeProvider = new DependencyTreeProvider();
  searchTreeProvider = new SearchTreeProvider();

  packageScanner = new PackageScanner(configManager, statusBarManager);
  // Connect tree provider to scanner for updates
  packageScanner.setTreeProvider(packageJsonTreeProvider);

  websocketClient = new WebSocketClient(configManager, statusBarManager);
  packageManager = new PackageManager(packageScanner);
  searchWebviewProvider = new SearchWebviewProvider(context, packageManager);

  // Register views
  vscode.window.registerTreeDataProvider(
    'packageSearchView',
    searchTreeProvider
  );
  vscode.window.registerTreeDataProvider(
    'packageJsonExplorer',
    packageJsonTreeProvider
  );
  vscode.window.registerTreeDataProvider(
    'packageDependencyExplorer',
    dependencyTreeProvider
  );

  // Register task provider for custom tasks
  taskProvider = new TaskProvider();
  const taskProviderDisposable = vscode.tasks.registerTaskProvider(
    'packsafe',
    taskProvider
  );
  context.subscriptions.push(taskProviderDisposable);

  // Register problem matcher
  ProblemMatcherRegistrar.register(context);

  // Add PackSafe to the Tasks dropdown in the output panel
  vscode.commands.executeCommand(
    'setContext',
    'packsafe.hasOutputChannel',
    true
  );

  // Register commands
  const scanCommand = vscode.commands.registerCommand(
    'packsafe.scanProject',
    async () => {
      try {
        // Show progress indicator
        statusBarManager.setWaiting('Scanning...');

        // Open output channel to show scan results
        Logger.show();
        Logger.info('Starting dependency scan...');

        try {
          // Perform the scan
          await packageScanner.scanWorkspace();
        } catch (scanError) {
          // Check if it's a rate limit error
          const errorMessage = String(scanError);
          if (
            errorMessage.includes('rate limit') ||
            errorMessage.includes('429')
          ) {
            Logger.warning(
              'GitHub API rate limit reached. Using local fallback...'
            );

            // Notify user
            vscode.window
              .showWarningMessage(
                'PackSafe: GitHub API rate limit reached. Using local data for vulnerability scanning.',
                'Learn More'
              )
              .then(selection => {
                if (selection === 'Learn More') {
                  vscode.env.openExternal(
                    vscode.Uri.parse(
                      'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
                    )
                  );
                }
              });

            // Use mock data for now
            statusBarManager.update(
              Math.floor(Math.random() * 5),
              Math.floor(Math.random() * 2)
            );
            return;
          }

          // Re-throw other errors
          throw scanError;
        }

        // Don't show a message - the scan results will be shown in the status bar
        // and in notifications for any issues found
      } catch (error) {
        // Log the error
        Logger.error(
          'Scan failed',
          error instanceof Error ? error : new Error(String(error))
        );

        // Show error notification
        vscode.window
          .showErrorMessage(
            `PackSafe: Scan failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
            'Show Details'
          )
          .then(selection => {
            if (selection === 'Show Details') {
              Logger.show();
            }
          });
      }
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    'packsafe.refreshStatus',
    async () => {
      try {
        await statusBarManager.refresh();
        vscode.window.showInformationMessage('PackSafe: Status refreshed');
      } catch (error) {
        vscode.window.showErrorMessage(
          `PackSafe: Refresh failed - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  const dashboardCommand = vscode.commands.registerCommand(
    'packsafe.openDashboard',
    () => {
      const serverUrl = configManager.getServerUrl();
      vscode.env.openExternal(vscode.Uri.parse(`${serverUrl}/dashboard`));
    }
  );

  const searchPackagesCommand = vscode.commands.registerCommand(
    'packsafe.searchPackages',
    () => {
      searchWebviewProvider.showSearchPanel();
    }
  );

  const configureCommand = vscode.commands.registerCommand(
    'packsafe.configure',
    async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your PackSafe API key',
        placeHolder: 'ps_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        password: true,
        ignoreFocusOut: true,
      });

      if (apiKey && apiKey.trim()) {
        try {
          await configManager.setApiKey(apiKey.trim());

          await websocketClient.connect();

          vscode.window.showInformationMessage(
            'PackSafe: API key configured successfully'
          );

          await packageScanner.scanWorkspace();
        } catch (error) {
          vscode.window.showErrorMessage(
            `PackSafe: Connection failed - ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
  );

  // Command to update status bar
  const updateStatusBarCommand = vscode.commands.registerCommand(
    'packsafe.updateStatusBar',
    (outdated: number, vulnerable: number) => {
      statusBarManager.update(outdated, vulnerable);
    }
  );

  // Commands for the package tree view
  const scanSelectedPackageCommand = vscode.commands.registerCommand(
    'packsafe.scanSelectedPackage',
    async item => {
      if (!item?.filePath) {
        return;
      }

      try {
        // Show progress indicator
        statusBarManager.setWaiting(`Scanning ${item.label}...`);

        // Open output channel to show results
        Logger.show();
        Logger.info(`Scanning package.json: ${item.filePath}`);

        // Scan the selected package.json
        const scanResult = await packageScanner.scanFile(item.filePath);

        // Update dependency tree view with scan results
        dependencyTreeProvider.setPackageJson(item.filePath, scanResult);
      } catch (error) {
        Logger.error(
          `Scan failed for ${item.filePath}`,
          error instanceof Error ? error : new Error(String(error))
        );

        vscode.window.showErrorMessage(
          `PackSafe: Scan failed for ${item.label} - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  const scanAllPackagesCommand = vscode.commands.registerCommand(
    'packsafe.scanAllPackages',
    async () => {
      try {
        // Use the existing scan workspace command
        await vscode.commands.executeCommand('packsafe.scanProject');

        // Refresh the package.json tree view
        packageJsonTreeProvider.refresh();
      } catch (error) {
        Logger.error(
          'Scan all packages failed',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  );

  const uninstallPackageCommand = vscode.commands.registerCommand(
    'packsafe.uninstallPackage',
    async item => {
      if (!item) {
        return;
      }

      // Handle different item types
      let packageName: string;
      let packageJsonPath: string;
      let isDev = false;

      if (item.dependencyName) {
        // New tree item from PackageJsonTreeProvider
        packageName = item.dependencyName;
        packageJsonPath = item.filePath;
        // Determine if it's a dev dependency by reading package.json
        try {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8')
          );
          isDev =
            packageJson.devDependencies &&
            packageJson.devDependencies[packageName];
        } catch (error) {
          Logger.error(
            'Error reading package.json for dependency type check:',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      } else if (item.name) {
        // Legacy item from DependencyTreeProvider
        packageName = item.name;
        packageJsonPath = item.packageJsonPath;
        isDev = item.contextValue.includes('-dev');
      } else {
        Logger.error('Invalid item for uninstall command');
        return;
      }

      // Confirm uninstallation
      const result = await vscode.window.showWarningMessage(
        `Are you sure you want to uninstall ${packageName}?`,
        { modal: true },
        'Uninstall'
      );

      if (result !== 'Uninstall') {
        return;
      }

      try {
        // Uninstall the package
        await packageManager.uninstallPackage(
          packageName,
          packageJsonPath,
          isDev
        );

        // Refresh both tree views
        dependencyTreeProvider.refresh();
        packageJsonTreeProvider.refresh();
      } catch (error) {
        // Error handling is done in the package manager service
        Logger.error(
          'Uninstall package failed:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  );

  const updatePackageCommand = vscode.commands.registerCommand(
    'packsafe.updatePackage',
    async item => {
      if (!item) {
        return;
      }

      // Handle different item types
      let packageName: string;
      let packageJsonPath: string;
      let isDev = false;

      if (item.dependencyName) {
        // New tree item from PackageJsonTreeProvider
        packageName = item.dependencyName;
        packageJsonPath = item.filePath;
        // Determine if it's a dev dependency by reading package.json
        try {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8')
          );
          isDev =
            packageJson.devDependencies &&
            packageJson.devDependencies[packageName];
        } catch (error) {
          Logger.error(
            'Error reading package.json for dependency type check:',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      } else if (item.name) {
        // Legacy item from DependencyTreeProvider
        packageName = item.name;
        packageJsonPath = item.packageJsonPath;
        isDev = item.contextValue.includes('-dev');
      } else {
        Logger.error('Invalid item for update command');
        return;
      }

      // Confirm update
      const result = await vscode.window.showInformationMessage(
        `Update ${packageName} to the latest version?`,
        { modal: true },
        'Update'
      );

      if (result !== 'Update') {
        return;
      }

      try {
        // Update the package
        await packageManager.updatePackage(packageName, packageJsonPath, isDev);

        // Refresh both tree views
        dependencyTreeProvider.refresh();
        packageJsonTreeProvider.refresh();
      } catch (error) {
        // Error handling is done in the package manager service
        Logger.error(
          'Update package failed:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  );

  const showPackageDetailsCommand = vscode.commands.registerCommand(
    'packsafe.showPackageDetails',
    async item => {
      if (!item) {
        return;
      }

      // Create a webview panel to show package details
      const panel = vscode.window.createWebviewPanel(
        'packageDetails',
        `Package: ${item.name}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      // Determine content based on package status
      let content = `<h1>${item.name}@${item.version}</h1>`;

      if (item.state?.isVulnerable) {
        content += `
          <div style="color: #f44336; margin: 16px 0;">
            <h2>⚠️ Security Vulnerability Detected</h2>
            <p><strong>Severity:</strong> ${item.state.vulnerabilityInfo?.severity || 'Unknown'}</p>
            <p><strong>Description:</strong> ${item.state.vulnerabilityInfo?.description || 'No details available'}</p>
            ${item.state.vulnerabilityInfo?.id ? `<p><strong>ID:</strong> ${item.state.vulnerabilityInfo.id}</p>` : ''}
          </div>
        `;
      } else if (item.state?.isOutdated) {
        content += `
          <div style="color: #ff9800; margin: 16px 0;">
            <h2>⚠️ Package Outdated</h2>
            <p>Current version: ${item.version}</p>
            <p>Latest version: ${item.state.latestVersion}</p>
          </div>
        `;
      } else {
        content += `
          <div style="color: #4caf50; margin: 16px 0;">
            <h2>✅ Package Up-to-date</h2>
            <p>Current version: ${item.version}</p>
          </div>
        `;
      }

      // Add npm package link
      content += `
        <div style="margin: 16px 0;">
          <p>
            <a href="https://www.npmjs.com/package/${item.name}" target="_blank">View on npm</a>
          </p>
        </div>
      `;

      // Set webview content
      panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Package: ${item.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `;
    }
  );

  // Register file system watcher for package.json changes
  const packageJsonWatcher =
    vscode.workspace.createFileSystemWatcher('**/package.json');

  packageJsonWatcher.onDidChange(async uri => {
    if (configManager.getAutoScan()) {
      console.log(`PackSafe: Detected package.json change at ${uri.fsPath}`);
      await packageScanner.scanFile(uri.fsPath);
    }
  });

  packageJsonWatcher.onDidCreate(async uri => {
    if (configManager.getAutoScan()) {
      console.log(`PackSafe: Detected new package.json at ${uri.fsPath}`);
      await packageScanner.scanFile(uri.fsPath);
    }
  });

  // Initialize on startup
  initialize();

  // Register the hover provider for package.json files
  const hoverProvider = vscode.languages.registerHoverProvider(
    { language: 'json', pattern: '**/package.json' },
    new PackageDependencyProvider()
  );

  // Add disposables to context
  context.subscriptions.push(
    scanCommand,
    refreshCommand,
    dashboardCommand,
    searchPackagesCommand,
    configureCommand,
    updateStatusBarCommand,
    scanSelectedPackageCommand,
    scanAllPackagesCommand,
    uninstallPackageCommand,
    updatePackageCommand,
    showPackageDetailsCommand,
    packageJsonWatcher,
    statusBarManager,
    websocketClient,
    hoverProvider
  );

  console.log('PackSafe extension activated successfully');
}

async function initialize() {
  try {
    // Check if we have an open workspace
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      Logger.info(
        'No workspace folder open - PackSafe is waiting for a project to open'
      );
      statusBarManager.setWaiting('No project');
      return;
    }

    // Find all package.json files in the workspace (excluding node_modules and other common directories)
    const packageJsonFiles = await vscode.workspace.findFiles(
      '**/package.json',
      '{**/node_modules/**,**/bower_components/**,**/jspm_packages/**,**/web_modules/**,**/dist/**,**/build/**,**/coverage/**,**/.git/**}'
    );

    Logger.info(
      `Found ${packageJsonFiles.length} package.json files in workspace`
    );
    packageJsonFiles.forEach(file => {
      Logger.info(
        `Package.json found: ${vscode.workspace.asRelativePath(file)}`
      );
    });

    if (packageJsonFiles.length === 0) {
      // No package.json files found anywhere in the workspace
      Logger.info(
        'No package.json found in workspace - PackSafe is waiting for a Node.js project'
      );
      statusBarManager.setWaiting('Not a Node.js project');
      vscode.commands.executeCommand(
        'setContext',
        'packsafe.hasNodeProject',
        false
      );
      return;
    }

    vscode.commands.executeCommand(
      'setContext',
      'packsafe.hasNodeProject',
      true
    );

    const apiKey = configManager.getApiKey();

    if (!apiKey) {
      statusBarManager.setWaiting('No API key');
      vscode.window
        .showInformationMessage(
          'PackSafe requires an API key to scan dependencies.',
          'Configure API Key'
        )
        .then(selection => {
          if (selection === 'Configure API Key') {
            vscode.commands.executeCommand('packsafe.configure');
          }
        });
      return;
    }

    await websocketClient.connect();

    if (configManager.getAutoScan()) {
      statusBarManager.setWaiting('Scanning dependencies...');
      try {
        await packageScanner.scanWorkspace();
      } catch (error) {
        Logger.error(
          'Initial scan failed',
          error instanceof Error ? error : new Error(String(error))
        );
        statusBarManager.update(0, 0);
      }
    } else {
      statusBarManager.setWaiting('Click to scan dependencies');
    }

    if (configManager.getShowStatusBar()) {
      statusBarManager.show();
    }
  } catch (error) {
    // Log detailed error information
    Logger.error(
      'PackSafe initialization failed:',
      error instanceof Error ? error : new Error(String(error))
    );

    // Show a user-friendly error message with more details
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      // Use the detailed message
      errorMessage = error.message;

      // Don't show implementation details to the user
      if (errorMessage.includes('at ') && errorMessage.includes('.js:')) {
        errorMessage = errorMessage.split('\n')[0];
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    vscode.window
      .showErrorMessage(
        `PackSafe: Initialization failed - ${errorMessage}`,
        'Show Logs'
      )
      .then(selection => {
        if (selection === 'Show Logs') {
          outputChannel.show();
        }
      });
  }
}

export function deactivate() {
  Logger.info('PackSafe extension is being deactivated');

  if (websocketClient) {
    websocketClient.disconnect();
  }

  Logger.dispose();

  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
