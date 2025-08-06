import * as vscode from 'vscode';
import { NpmSearchService, NpmPackage } from '../services/npmSearchService';
import { PackageManager } from '../services/packageManager';
import { Logger } from '../utils/logger';

export class SearchWebviewProvider {
  private webviewPanel: vscode.WebviewPanel | undefined;
  private npmSearchService: NpmSearchService;
  private packageManager: PackageManager;

  constructor(
    private context: vscode.ExtensionContext,
    packageManager: PackageManager
  ) {
    this.npmSearchService = new NpmSearchService();
    this.packageManager = packageManager;
  }

  /**
   * Show the search webview panel
   */
  public showSearchPanel(): void {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      return;
    }

    this.webviewPanel = vscode.window.createWebviewPanel(
      'packageSearch',
      'Search & Install Packages',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      }
    );

    // Set webview properties
    this.webviewPanel.webview.html = this.getWebviewContent();

    // Handle messages from webview
    this.webviewPanel.webview.onDidReceiveMessage(
      message => this.handleWebviewMessage(message),
      undefined,
      this.context.subscriptions
    );

    // Clean up when panel is closed
    this.webviewPanel.onDidDispose(
      () => {
        this.webviewPanel = undefined;
      },
      null,
      this.context.subscriptions
    );
  }

  /**
   * Handle messages from the webview
   */
  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'search':
        await this.handleSearch(message.query, message.options);
        break;
      case 'install':
        await this.handleInstall(message.packageName, message.isDev);
        break;
      case 'getPackageDetails':
        await this.handleGetPackageDetails(message.packageName);
        break;
    }
  }

  /**
   * Handle package search
   */
  private async handleSearch(query: string, options: any): Promise<void> {
    try {
      const result = await this.npmSearchService.searchPackages(query, options);
      this.webviewPanel?.webview.postMessage({
        type: 'searchResults',
        data: result,
      });
    } catch (error) {
      Logger.error(
        'Search failed:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.webviewPanel?.webview.postMessage({
        type: 'searchError',
        error: 'Failed to search packages. Please try again.',
      });
    }
  }

  /**
   * Handle package installation
   */
  private async handleInstall(
    packageName: string,
    isDev: boolean
  ): Promise<void> {
    try {
      // Find the current package.json to install to
      const packageJsonPath = await this.findPackageJsonPath();
      if (!packageJsonPath) {
        vscode.window.showErrorMessage(
          'No package.json found in the current workspace'
        );
        return;
      }

      await this.packageManager.installPackage(
        packageName,
        packageJsonPath,
        isDev
      );

      this.webviewPanel?.webview.postMessage({
        type: 'installSuccess',
        packageName,
      });
    } catch (error) {
      Logger.error(
        'Install failed:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.webviewPanel?.webview.postMessage({
        type: 'installError',
        packageName,
        error: 'Failed to install package. Please try again.',
      });
    }
  }

  /**
   * Handle getting package details
   */
  private async handleGetPackageDetails(packageName: string): Promise<void> {
    try {
      const details =
        await this.npmSearchService.getPackageDetails(packageName);
      this.webviewPanel?.webview.postMessage({
        type: 'packageDetails',
        data: details,
      });
    } catch (error) {
      Logger.error(
        'Failed to get package details:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.webviewPanel?.webview.postMessage({
        type: 'packageDetailsError',
        error: 'Failed to load package details.',
      });
    }
  }

  /**
   * Find a package.json file in the workspace
   */
  private async findPackageJsonPath(): Promise<string | null> {
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      return null;
    }

    const packageJsonFiles = await vscode.workspace.findFiles(
      '**/package.json',
      '{**/node_modules/**,**/bower_components/**,**/jspm_packages/**,**/web_modules/**,**/dist/**,**/build/**,**/coverage/**,**/.git/**}',
      1
    );

    return packageJsonFiles.length > 0 ? packageJsonFiles[0].fsPath : null;
  }

  /**
   * Generate the webview HTML content
   */
  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Search & Install Packages</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .search-header {
            padding: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
          }

          .search-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--vscode-foreground);
          }

          .search-box {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .search-input-container {
            position: relative;
            width: 100%;
          }

          .search-input {
            width: 100%;
            padding: 12px 40px 12px 16px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 6px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }

          .search-input:focus {
            border-color: var(--vscode-focusBorder);
          }

          .search-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
          }

          .search-icon {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--vscode-descriptionForeground);
          }

          .search-btn {
            width: 100%;
            padding: 12px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
          }

          .search-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }

          .search-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .search-options {
            display: flex;
            gap: 16px;
            align-items: center;
            margin-top: 8px;
          }

          .checkbox-container {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .checkbox-container input[type="checkbox"] {
            margin: 0;
          }

          .checkbox-container label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
          }

          .results-section {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
          }

          .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
          }

          .package-card {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            background: var(--vscode-panel-background);
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .package-card:hover {
            border-color: var(--vscode-focusBorder);
          }

          .package-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
          }

          .package-info {
            flex: 1;
          }

          .package-name {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 4px;
          }

          .package-version {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            font-family: var(--vscode-editor-font-family);
          }

          .package-description {
            color: var(--vscode-descriptionForeground);
            margin: 12px 0;
            line-height: 1.5;
            font-size: 13px;
          }

          .package-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 12px;
          }

          .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .package-actions {
            display: flex;
            gap: 8px;
          }

          .install-btn {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: background-color 0.2s;
          }

          .install-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }

          .install-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .install-dev-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }

          .install-dev-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }

          .keywords {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
          }

          .keyword {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 500;
          }

          .no-results {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
          }

          .no-results-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
          }

          .no-results-title {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 8px;
          }

          .no-results-description {
            font-size: 13px;
            opacity: 0.7;
          }

          .error {
            color: var(--vscode-errorForeground);
            text-align: center;
            padding: 20px;
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 6px;
            margin: 20px;
          }

          .welcome-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
          }

          .welcome-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.4;
          }

          .welcome-title {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
          }

          .welcome-description {
            font-size: 14px;
            line-height: 1.5;
            opacity: 0.8;
            max-width: 400px;
            margin: 0 auto;
          }

          /* Scrollbar styling */
          .results-section::-webkit-scrollbar {
            width: 8px;
          }

          .results-section::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
          }

          .results-section::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 4px;
          }

          .results-section::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="search-header">
          <div class="search-title">Search & Install Packages</div>
          
          <div class="search-box">
            <div class="search-input-container">
              <input 
                type="text" 
                class="search-input" 
                placeholder="Search packages to install directly to your project..."
                id="searchInput"
              />
              <span class="search-icon">🔍</span>
            </div>
            
            <button class="search-btn" id="searchBtn">
              Search npm Registry
            </button>
            
            <div class="search-options">
              <div class="checkbox-container">
                <input type="checkbox" id="qualityFilter" checked>
                <label for="qualityFilter">High Quality Only</label>
              </div>
              <div class="checkbox-container">
                <input type="checkbox" id="popularityFilter" checked>
                <label for="popularityFilter">Popular Packages</label>
              </div>
            </div>
          </div>
        </div>

        <div class="results-section">
          <div id="resultsContainer">
            <div class="welcome-state">
              <div class="welcome-icon">📦</div>
              <div class="welcome-title">Search & Install npm Packages</div>
              <div class="welcome-description">
                Type a package name above to search the npm registry and install packages directly to your project with automatic package manager detection.
              </div>
            </div>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          let searchTimeout;
          
          const searchInput = document.getElementById('searchInput');
          const searchBtn = document.getElementById('searchBtn');
          const resultsContainer = document.getElementById('resultsContainer');

          // Auto-search on input with debounce
          searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = searchInput.value.trim();
            
            if (query.length === 0) {
              showWelcomeState();
              return;
            }
            
            if (query.length > 2) {
              searchTimeout = setTimeout(() => {
                performSearch(query);
              }, 500);
            }
          });

          // Search on button click
          searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
              performSearch(query);
            }
          });

          // Search on Enter key
          searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              const query = searchInput.value.trim();
              if (query) {
                performSearch(query);
              }
            }
          });

          function showWelcomeState() {
            resultsContainer.innerHTML = \`
              <div class="welcome-state">
                <div class="welcome-icon">📦</div>
                <div class="welcome-title">Search & Install npm Packages</div>
                <div class="welcome-description">
                  Type a package name above to search the npm registry and install packages directly to your project with automatic package manager detection.
                </div>
              </div>
            \`;
          }

          function performSearch(query) {
            resultsContainer.innerHTML = '<div class="loading">🔍 Searching npm registry...</div>';
            searchBtn.disabled = true;
            searchBtn.textContent = 'Searching...';
            
            const options = {
              quality: document.getElementById('qualityFilter').checked ? 0.65 : 0,
              popularity: document.getElementById('popularityFilter').checked ? 0.98 : 0,
            };

            vscode.postMessage({
              type: 'search',
              query: query,
              options: options
            });
          }

          function installPackage(packageName, isDev) {
            vscode.postMessage({
              type: 'install',
              packageName: packageName,
              isDev: isDev
            });

            // Disable install buttons for this package
            const buttons = document.querySelectorAll(\`[data-package="\${packageName}"]\`);
            buttons.forEach(btn => {
              btn.disabled = true;
              btn.textContent = isDev ? 'Installing as dev...' : 'Installing...';
            });
          }

          function renderResults(results) {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search npm Registry';
            
            if (results.packages.length === 0) {
              resultsContainer.innerHTML = \`
                <div class="no-results">
                  <div class="no-results-icon">📭</div>
                  <div class="no-results-title">No packages found</div>
                  <div class="no-results-description">Try a different search term or check your spelling</div>
                </div>
              \`;
              return;
            }

            const html = results.packages.map(pkg => \`
              <div class="package-card">
                <div class="package-header">
                  <div class="package-info">
                    <div class="package-name">\${pkg.name}</div>
                    <div class="package-version">v\${pkg.version}</div>
                  </div>
                </div>
                
                <div class="package-description">\${pkg.description}</div>
                
                <div class="package-meta">
                  <div class="meta-item">
                    <span>📦</span>
                    <span>\${pkg.downloads.weekly.toLocaleString()} weekly downloads</span>
                  </div>
                  <div class="meta-item">
                    <span>📅</span>
                    <span>Updated \${new Date(pkg.lastPublish).toLocaleDateString()}</span>
                  </div>
                  \${pkg.license ? \`
                    <div class="meta-item">
                      <span>⚖️</span>
                      <span>\${pkg.license}</span>
                    </div>
                  \` : ''}
                </div>

                <div class="package-actions">
                  <button 
                    class="install-btn" 
                    data-package="\${pkg.name}"
                    onclick="installPackage('\${pkg.name}', false)"
                  >
                    Install
                  </button>
                  <button 
                    class="install-btn install-dev-btn" 
                    data-package="\${pkg.name}"
                    onclick="installPackage('\${pkg.name}', true)"
                  >
                    Install as Dev
                  </button>
                </div>

                \${pkg.keywords.length > 0 ? \`
                  <div class="keywords">
                    \${pkg.keywords.slice(0, 6).map(keyword => \`<span class="keyword">\${keyword}</span>\`).join('')}
                  </div>
                \` : ''}
              </div>
            \`).join('');

            resultsContainer.innerHTML = html;
          }

          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
              case 'searchResults':
                renderResults(message.data);
                break;
              case 'searchError':
                searchBtn.disabled = false;
                searchBtn.textContent = 'Search npm Registry';
                resultsContainer.innerHTML = \`<div class="error">❌ \${message.error}</div>\`;
                break;
              case 'installSuccess':
                // Re-enable buttons and show success
                const successButtons = document.querySelectorAll(\`[data-package="\${message.packageName}"]\`);
                successButtons.forEach((btn, index) => {
                  btn.disabled = false;
                  btn.textContent = index === 0 ? 'Install' : 'Install as Dev';
                  btn.style.background = 'var(--vscode-testing-iconPassed)';
                  btn.textContent = index === 0 ? '✓ Installed' : '✓ Installed as Dev';
                  
                  setTimeout(() => {
                    btn.style.background = '';
                    btn.textContent = index === 0 ? 'Install' : 'Install as Dev';
                  }, 2000);
                });
                break;
              case 'installError':
                // Re-enable buttons
                const errorButtons = document.querySelectorAll(\`[data-package="\${message.packageName}"]\`);
                errorButtons.forEach((btn, index) => {
                  btn.disabled = false;
                  btn.textContent = index === 0 ? 'Install' : 'Install as Dev';
                });
                break;
            }
          });

          // Focus search input when panel is shown
          searchInput.focus();
        </script>
      </body>
      </html>
    `;
  }
}
