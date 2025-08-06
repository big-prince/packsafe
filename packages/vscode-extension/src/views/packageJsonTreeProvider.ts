import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export type DependencyStatus =
  | 'outdated'
  | 'vulnerable'
  | 'deprecated'
  | 'ok'
  | 'loading';

export class PackageJsonTreeItem extends vscode.TreeItem {
  constructor(
    public readonly filePath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType:
      | 'folder'
      | 'packageJson'
      | 'details'
      | 'dependencies'
      | 'dependency' = 'folder',
    public readonly dependencyName?: string,
    public readonly dependencyVersion?: string,
    public readonly dependencyStatus?: DependencyStatus,
    public readonly scanStats?: {
      outdated: number;
      vulnerable: number;
      deprecated: number;
      total: number;
    }
  ) {
    super(
      itemType === 'folder'
        ? path.basename(filePath)
        : itemType === 'details'
          ? 'Details'
          : itemType === 'dependencies'
            ? 'Dependencies'
            : itemType === 'dependency'
              ? `${dependencyName}@${dependencyVersion}`
              : 'package.json',
      collapsibleState
    );

    this.tooltip = this.createTooltip();
    this.contextValue = this.createContextValue();
    this.iconPath = this.createIcon();
    this.description = this.createDescription();
  }

  private createTooltip(): string {
    switch (this.itemType) {
      case 'folder':
        return this.filePath;
      case 'packageJson':
        return this.filePath;
      case 'details':
        return 'Scan statistics and details';
      case 'dependencies':
        return 'Project dependencies';
      case 'dependency':
        return this.createDependencyTooltip();
      default:
        return this.filePath;
    }
  }

  private createDependencyTooltip(): string {
    if (!this.dependencyName || !this.dependencyStatus) return '';

    switch (this.dependencyStatus) {
      case 'loading':
        return `${this.dependencyName} - scanning...`;
      case 'outdated':
        return `${this.dependencyName} is outdated and should be updated`;
      case 'vulnerable':
        return `${this.dependencyName} has known security vulnerabilities`;
      case 'deprecated':
        return `${this.dependencyName} is deprecated and should be replaced`;
      case 'ok':
        return `${this.dependencyName} is up to date`;
      default:
        return `${this.dependencyName}`;
    }
  }

  private createContextValue(): string {
    switch (this.itemType) {
      case 'folder':
        return 'packageFolder';
      case 'packageJson':
        return 'packageJson';
      case 'details':
        return 'details';
      case 'dependencies':
        return 'dependencies';
      case 'dependency':
        // Check if this is a real dependency or a detail statistic
        if (
          this.dependencyName &&
          (this.dependencyName === 'Total Dependencies' ||
            this.dependencyName === 'Outdated' ||
            this.dependencyName === 'Vulnerable' ||
            this.dependencyName === 'Deprecated' ||
            this.dependencyName === 'Up to Date' ||
            this.dependencyName === 'Scan not completed')
        ) {
          return 'detailItem';
        }
        return 'dependency';
      default:
        return 'unknown';
    }
  }

  private createIcon(): vscode.ThemeIcon {
    switch (this.itemType) {
      case 'folder':
        return new vscode.ThemeIcon('folder');
      case 'packageJson':
        return new vscode.ThemeIcon('package');
      case 'details':
        return new vscode.ThemeIcon('info');
      case 'dependencies':
        return new vscode.ThemeIcon('library');
      case 'dependency':
        return this.createDependencyIcon();
      default:
        return new vscode.ThemeIcon('file');
    }
  }

  private createDependencyIcon(): vscode.ThemeIcon {
    // Show loading spinner only when actually loading
    if (this.dependencyStatus === 'loading') {
      return new vscode.ThemeIcon(
        'loading~spin',
        new vscode.ThemeColor('charts.blue')
      );
    }

    // For all other statuses, just show a simple package icon
    return new vscode.ThemeIcon('package');
  }

  private createDescription(): string {
    if (this.itemType === 'packageJson') {
      try {
        const packageJson = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        return `${Object.keys(dependencies).length} packages`;
      } catch (error) {
        return 'Error reading file';
      }
    } else if (this.itemType === 'details' && this.scanStats) {
      const { outdated, vulnerable, deprecated, total } = this.scanStats;
      const issues = outdated + vulnerable + deprecated;
      return issues > 0 ? `${issues} issues found` : 'All packages healthy';
    }
    return '';
  }
}

export class PackageJsonTreeProvider
  implements vscode.TreeDataProvider<PackageJsonTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    PackageJsonTreeItem | undefined | null | void
  > = new vscode.EventEmitter<PackageJsonTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    PackageJsonTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  // Cache for dependency status from scan results
  private dependencyStatusCache = new Map<
    string,
    Map<string, DependencyStatus>
  >();

  // Cache for scan statistics
  private scanStatsCache = new Map<
    string,
    { outdated: number; vulnerable: number; deprecated: number; total: number }
  >();

  constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/package.json',
      false,
      false,
      false
    );
    watcher.onDidCreate(() => this.refresh());
    watcher.onDidChange(() => this.refresh());
    watcher.onDidDelete(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Update dependency status from scan results
   */
  updateDependencyStatus(
    packageJsonPath: string,
    dependencies: { [key: string]: DependencyStatus }
  ): void {
    const statusMap = new Map<string, DependencyStatus>();
    for (const [name, status] of Object.entries(dependencies)) {
      statusMap.set(name, status);
    }
    this.dependencyStatusCache.set(packageJsonPath, statusMap);
    this.refresh();
  }

  /**
   * Update scan statistics for a package.json file
   */
  updateScanStats(
    packageJsonPath: string,
    stats: {
      outdated: number;
      vulnerable: number;
      deprecated: number;
      total: number;
    }
  ): void {
    this.scanStatsCache.set(packageJsonPath, stats);
    this.refresh();
  }

  /**
   * Set loading state for dependencies
   */
  setLoadingState(packageJsonPath: string): void {
    // Get all dependencies from package.json and set them to loading
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const loadingMap = new Map<string, DependencyStatus>();
      for (const name of Object.keys(dependencies)) {
        loadingMap.set(name, 'loading');
      }
      this.dependencyStatusCache.set(packageJsonPath, loadingMap);
      this.refresh();
    } catch (error) {
      // If we can't read the file, just refresh
      this.refresh();
    }
  }

  getTreeItem(element: PackageJsonTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: PackageJsonTreeItem
  ): Promise<PackageJsonTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    } else if (element.contextValue === 'packageFolder') {
      return this.getPackageJsonInFolder(element.filePath);
    } else if (element.contextValue === 'packageJson') {
      return this.getPackageJsonChildren(element.filePath);
    } else if (element.contextValue === 'details') {
      return this.getDetailsChildren(element.filePath);
    } else if (element.contextValue === 'dependencies') {
      return this.getDependencyList(element.filePath);
    }
    return [];
  }

  private async getRootItems(): Promise<PackageJsonTreeItem[]> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }

    const packageJsonFiles = await vscode.workspace.findFiles(
      '**/package.json',
      '{**/node_modules/**,**/bower_components/**,**/jspm_packages/**,**/web_modules/**,**/dist/**,**/build/**,**/coverage/**,**/.git/**}'
    );

    if (packageJsonFiles.length === 0) {
      return [];
    }

    const folderMap = new Map<string, vscode.Uri[]>();

    packageJsonFiles.forEach(uri => {
      const folderPath = path.dirname(uri.fsPath);
      if (!folderMap.has(folderPath)) {
        folderMap.set(folderPath, []);
      }
      folderMap.get(folderPath)!.push(uri);
    });

    const folders: PackageJsonTreeItem[] = [];

    folderMap.forEach((files, folderPath) => {
      folders.push(
        new PackageJsonTreeItem(
          folderPath,
          vscode.TreeItemCollapsibleState.Collapsed,
          'folder'
        )
      );
    });

    return folders.sort((a, b) =>
      path.basename(a.filePath).localeCompare(path.basename(b.filePath))
    );
  }

  private async getPackageJsonInFolder(
    folderPath: string
  ): Promise<PackageJsonTreeItem[]> {
    const packageJsonPath = path.join(folderPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      return [
        new PackageJsonTreeItem(
          packageJsonPath,
          vscode.TreeItemCollapsibleState.Collapsed,
          'packageJson'
        ),
      ];
    }

    return [];
  }

  private async getPackageJsonChildren(
    packageJsonPath: string
  ): Promise<PackageJsonTreeItem[]> {
    const children: PackageJsonTreeItem[] = [];

    // Add Details section
    const scanStats = this.scanStatsCache.get(packageJsonPath);
    children.push(
      new PackageJsonTreeItem(
        packageJsonPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        'details',
        undefined,
        undefined,
        undefined,
        scanStats
      )
    );

    // Add Dependencies section
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (Object.keys(dependencies).length > 0) {
        children.push(
          new PackageJsonTreeItem(
            packageJsonPath,
            vscode.TreeItemCollapsibleState.Collapsed,
            'dependencies'
          )
        );
      }
    } catch (error) {
      // If can't read file, still show dependencies section
      children.push(
        new PackageJsonTreeItem(
          packageJsonPath,
          vscode.TreeItemCollapsibleState.Collapsed,
          'dependencies'
        )
      );
    }

    return children;
  }

  private async getDetailsChildren(
    packageJsonPath: string
  ): Promise<PackageJsonTreeItem[]> {
    const scanStats = this.scanStatsCache.get(packageJsonPath);
    if (!scanStats) {
      return [
        new PackageJsonTreeItem(
          packageJsonPath,
          vscode.TreeItemCollapsibleState.None,
          'dependency',
          'Scan not completed',
          '',
          'loading'
        ),
      ];
    }

    const details: PackageJsonTreeItem[] = [];

    details.push(
      new PackageJsonTreeItem(
        packageJsonPath,
        vscode.TreeItemCollapsibleState.None,
        'dependency',
        'Total Dependencies',
        scanStats.total.toString()
      )
    );

    if (scanStats.outdated > 0) {
      details.push(
        new PackageJsonTreeItem(
          packageJsonPath,
          vscode.TreeItemCollapsibleState.None,
          'dependency',
          'Outdated',
          scanStats.outdated.toString()
        )
      );
    }

    if (scanStats.vulnerable > 0) {
      details.push(
        new PackageJsonTreeItem(
          packageJsonPath,
          vscode.TreeItemCollapsibleState.None,
          'dependency',
          'Vulnerable',
          scanStats.vulnerable.toString()
        )
      );
    }

    if (scanStats.deprecated > 0) {
      details.push(
        new PackageJsonTreeItem(
          packageJsonPath,
          vscode.TreeItemCollapsibleState.None,
          'dependency',
          'Deprecated',
          scanStats.deprecated.toString()
        )
      );
    }

    const healthy =
      scanStats.total -
      scanStats.outdated -
      scanStats.vulnerable -
      scanStats.deprecated;
    if (healthy > 0) {
      details.push(
        new PackageJsonTreeItem(
          packageJsonPath,
          vscode.TreeItemCollapsibleState.None,
          'dependency',
          'Up to Date',
          healthy.toString()
        )
      );
    }

    return details;
  }

  private async getDependencyList(
    packageJsonPath: string
  ): Promise<PackageJsonTreeItem[]> {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const dependencyItems: PackageJsonTreeItem[] = [];

      for (const [name, version] of Object.entries(dependencies)) {
        const status = this.getDependencyStatus(
          packageJsonPath,
          name,
          version as string
        );
        dependencyItems.push(
          new PackageJsonTreeItem(
            packageJsonPath,
            vscode.TreeItemCollapsibleState.None,
            'dependency',
            name,
            version as string,
            status
          )
        );
      }

      return dependencyItems.sort((a, b) =>
        a.dependencyName!.localeCompare(b.dependencyName!)
      );
    } catch (error) {
      return [];
    }
  }

  private getDependencyStatus(
    packageJsonPath: string,
    name: string,
    version: string
  ): DependencyStatus {
    // Check cache first
    const statusMap = this.dependencyStatusCache.get(packageJsonPath);
    if (statusMap && statusMap.has(name)) {
      return statusMap.get(name)!;
    }

    // Default to 'ok' if no scan results available
    return 'ok';
  }
}
