import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Tree item representing a dependency in a package.json file
 */
export class DependencyTreeItem extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly version: string,
    public readonly packageType: 'dependencies' | 'devDependencies',
    public readonly packageJsonPath: string,
    public readonly state?: {
      isOutdated?: boolean;
      isVulnerable?: boolean;
      latestVersion?: string;
      vulnerabilityInfo?: any;
    }
  ) {
    super(name, vscode.TreeItemCollapsibleState.None);

    this.tooltip = `${name}@${version}`;
    this.description = version;
    this.contextValue = 'dependency';

    // Set icon based on dependency status
    if (state?.isVulnerable) {
      this.iconPath = new vscode.ThemeIcon('error');
      this.description = `${version} (vulnerable)`;
    } else if (state?.isOutdated) {
      this.iconPath = new vscode.ThemeIcon('warning');
      this.description = `${version} → ${state.latestVersion}`;
    } else {
      this.iconPath = new vscode.ThemeIcon('verified');
    }

    // Add the package type (dev or regular) to the context value
    this.contextValue += packageType === 'devDependencies' ? '-dev' : '-prod';

    // Add command to show delete button when hovering over dependency
    this.command = {
      command: 'packsafe.showPackageDetails',
      title: 'Show Package Details',
      arguments: [this],
    };
  }
}

/**
 * Tree data provider for dependencies in a package.json file
 */
export class DependencyTreeProvider
  implements vscode.TreeDataProvider<DependencyTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    DependencyTreeItem | undefined | null | void
  > = new vscode.EventEmitter<DependencyTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    DependencyTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private _selectedPackageJson: string | undefined;
  private _scanResults: any = {};

  constructor() {
    // Watch for package.json changes
    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/package.json',
      false,
      false,
      false
    );
    watcher.onDidChange(uri => {
      if (uri.fsPath === this._selectedPackageJson) {
        this.refresh();
      }
    });
  }

  /**
   * Set the currently selected package.json file
   */
  public setPackageJson(packageJsonPath: string, scanResults?: any): void {
    this._selectedPackageJson = packageJsonPath;
    if (scanResults) {
      this._scanResults = scanResults;
    }
    vscode.commands.executeCommand(
      'setContext',
      'packsafe.packageSelected',
      true
    );
    this.refresh();
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public updateScanResults(scanResults: any): void {
    this._scanResults = scanResults;
    this.refresh();
  }

  getTreeItem(element: DependencyTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: DependencyTreeItem
  ): Promise<DependencyTreeItem[]> {
    if (
      !this._selectedPackageJson ||
      !fs.existsSync(this._selectedPackageJson)
    ) {
      return [];
    }

    try {
      const fileContent = fs.readFileSync(this._selectedPackageJson, 'utf8');
      const packageJson = JSON.parse(fileContent);
      const dependencies: DependencyTreeItem[] = [];

      // Process regular dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries<string>(
          packageJson.dependencies
        )) {
          dependencies.push(
            this.createDependencyTreeItem(name, version, 'dependencies')
          );
        }
      }

      // Process dev dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries<string>(
          packageJson.devDependencies
        )) {
          dependencies.push(
            this.createDependencyTreeItem(name, version, 'devDependencies')
          );
        }
      }

      // Sort dependencies alphabetically
      return dependencies.sort((a, b) =>
        a.label!.toString().localeCompare(b.label!.toString())
      );
    } catch (error) {
      console.error('Error parsing package.json:', error);
      return [];
    }
  }

  /**
   * Create a dependency tree item with status information
   */
  private createDependencyTreeItem(
    name: string,
    version: string,
    packageType: 'dependencies' | 'devDependencies'
  ): DependencyTreeItem {
    // Clean version string (remove ^, ~, etc.)
    const cleanVersion = version.replace(/[\^~>=<]/g, '');

    // Check if we have scan results for this dependency
    const state: any = {};

    if (this._scanResults?.details?.dependencies) {
      // Check if outdated
      if (this._scanResults.details.dependencies.outdated?.[name]) {
        const outdatedInfo =
          this._scanResults.details.dependencies.outdated[name];
        state.isOutdated = true;
        state.latestVersion = outdatedInfo.latest;
      }

      // Check if vulnerable
      if (this._scanResults.details.dependencies.vulnerable?.[name]) {
        const vulnerableInfo =
          this._scanResults.details.dependencies.vulnerable[name];
        state.isVulnerable = true;
        state.vulnerabilityInfo = vulnerableInfo.vulnerability;
      }
    }

    return new DependencyTreeItem(
      name,
      cleanVersion,
      packageType,
      this._selectedPackageJson || '',
      state
    );
  }
}
