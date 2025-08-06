import * as vscode from 'vscode';

export class SearchTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType:
      | 'searchInput'
      | 'searchButton'
      | 'placeholder' = 'placeholder'
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.contextValue = itemType;

    if (itemType === 'searchInput') {
      this.command = {
        command: 'packsafe.focusSearchInput',
        title: 'Focus Search Input',
      };
    } else if (itemType === 'searchButton') {
      this.command = {
        command: 'packsafe.searchPackages',
        title: 'Open Search Panel',
      };
    }
  }
}

export class SearchTreeProvider
  implements vscode.TreeDataProvider<SearchTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    SearchTreeItem | undefined | null | void
  > = new vscode.EventEmitter<SearchTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    SearchTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SearchTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SearchTreeItem): Promise<SearchTreeItem[]> {
    if (!element) {
      // Return the search interface items
      return [
        new SearchTreeItem('🔍 Search & Install Packages', 'searchButton'),
        new SearchTreeItem('', 'placeholder'),
        new SearchTreeItem(
          'Click above to search npm packages and install them directly to your project',
          'placeholder'
        ),
      ];
    }
    return [];
  }
}
