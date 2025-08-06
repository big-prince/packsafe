import * as vscode from 'vscode';

/**
 * Get the API base URL from configuration
 */
export function getApiBaseUrl(): string {
  return (
    vscode.workspace.getConfiguration('packsafe').get<string>('serverUrl') ||
    'http://localhost:3001'
  );
}

/**
 * Get the API key from configuration
 */
export function getApiKey(): string | undefined {
  return vscode.workspace.getConfiguration('packsafe').get<string>('apiKey');
}
