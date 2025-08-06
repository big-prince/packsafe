import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private outdatedCount: number = 0;
  private vulnerableCount: number = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'packsafe.scanProject';
    this.statusBarItem.tooltip = 'Click to scan project dependencies';
    this.update(0, 0);
  }

  /**
   * Update the status bar with new information
   */
  public update(outdatedCount: number, vulnerableCount: number): void {
    this.outdatedCount = outdatedCount;
    this.vulnerableCount = vulnerableCount;

    if (vulnerableCount > 0) {
      this.statusBarItem.text = `$(shield) $(alert) ${vulnerableCount} Vulnerabilities`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground'
      );
      this.statusBarItem.color = new vscode.ThemeColor(
        'statusBarItem.errorForeground'
      );
      this.statusBarItem.tooltip = `${vulnerableCount} vulnerable packages detected! Click to view details.`;
      this.statusBarItem.command = 'packsafe.openDashboard';
    } else if (outdatedCount > 0) {
      this.statusBarItem.text = `$(shield) $(warning) ${outdatedCount} Outdated`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
      this.statusBarItem.color = new vscode.ThemeColor(
        'statusBarItem.warningForeground'
      );
      this.statusBarItem.tooltip = `${outdatedCount} outdated packages detected. Click to view details.`;
      this.statusBarItem.command = 'packsafe.openDashboard';
    } else {
      this.statusBarItem.text = `$(shield) $(check) Dependencies OK`;
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.color = new vscode.ThemeColor(
        'statusBarItem.foreground'
      );
      this.statusBarItem.tooltip =
        'All dependencies are up-to-date and secure. Click to scan again.';
      this.statusBarItem.command = 'packsafe.scanProject';
    }

    // Ensure the status bar item is visible
    this.statusBarItem.show();
  }

  /**
   * Refresh the status from the server
   */
  public async refresh(): Promise<void> {
    // In a real implementation, we'd pull the latest status from the server
    // For now, we'll just update with the existing values
    this.update(this.outdatedCount, this.vulnerableCount);
  }

  /**
   * Show the status bar item
   */
  public show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide the status bar item
   */
  public hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Set the status bar to a waiting state with a message
   * @param message The message to display
   */
  public setWaiting(message: string): void {
    this.statusBarItem.text = `$(shield) $(loading~spin) ${message}`;
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.color = new vscode.ThemeColor(
      'statusBarItem.foreground'
    );
    this.statusBarItem.tooltip = message;
    this.statusBarItem.show();
  }

  /**
   * Dispose the status bar item
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
