import * as vscode from 'vscode';

export class ConfigurationManager {
  private readonly CONFIG_SECTION = 'packsafe';
  private readonly API_KEY_STORAGE_KEY = 'packsafe.apiKey';
  private readonly SERVER_URL_SETTING = 'serverUrl';
  private readonly AUTO_SCAN_SETTING = 'autoScan';
  private readonly SHOW_STATUS_BAR_SETTING = 'showStatusBar';
  private readonly NOTIFICATIONS_SETTING = 'notifications';
  private context: vscode.ExtensionContext | undefined;

  /**
   * Set the extension context for persistent storage
   */
  public setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * Get the configured API key from global state
   */
  public getApiKey(): string | undefined {
    if (this.context) {
      return this.context.globalState.get<string>(this.API_KEY_STORAGE_KEY);
    }
    return undefined;
  }

  /**
   * Set the API key in global state for persistence
   */
  public async setApiKey(apiKey: string): Promise<void> {
    if (this.context) {
      await this.context.globalState.update(this.API_KEY_STORAGE_KEY, apiKey);
    }
  }

  /**
   * Get the configured server URL
   */
  public getServerUrl(): string {
    return (
      vscode.workspace
        .getConfiguration(this.CONFIG_SECTION)
        .get<string>(this.SERVER_URL_SETTING) || 'http://localhost:3001'
    );
  }

  /**
   * Check if auto scan is enabled
   */
  public getAutoScan(): boolean {
    return vscode.workspace
      .getConfiguration(this.CONFIG_SECTION)
      .get<boolean>(this.AUTO_SCAN_SETTING, true);
  }

  /**
   * Check if status bar should be shown
   */
  public getShowStatusBar(): boolean {
    return vscode.workspace
      .getConfiguration(this.CONFIG_SECTION)
      .get<boolean>(this.SHOW_STATUS_BAR_SETTING, true);
  }

  /**
   * Check if notifications are enabled
   */
  public getNotifications(): boolean {
    return vscode.workspace
      .getConfiguration(this.CONFIG_SECTION)
      .get<boolean>(this.NOTIFICATIONS_SETTING, true);
  }
}
