import * as vscode from 'vscode';
import axios from 'axios';
import { ConfigurationManager } from '../services/configurationManager';

export async function scanPackageJson(uri?: vscode.Uri): Promise<void> {
  const configManager = new ConfigurationManager();
  try {
    // Get the package.json file
    let packageJsonFile: vscode.Uri | undefined;

    if (uri) {
      packageJsonFile = uri;
    } else {
      const files = await vscode.workspace.findFiles(
        '**/package.json',
        '**/node_modules/**'
      );
      if (files.length === 0) {
        vscode.window.showWarningMessage(
          'No package.json file found in workspace'
        );
        return;
      }
      packageJsonFile = files[0];
    }

    // Read the package.json file
    const document = await vscode.workspace.openTextDocument(packageJsonFile);
    const packageJson = JSON.parse(document.getText());

    // Show progress notification
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'PackSafe: Scanning dependencies...',
        cancellable: false,
      },
      async progress => {
        progress.report({ increment: 0 });

        // Prepare API request
        const apiBaseUrl = configManager.getServerUrl();
        const apiKey = configManager.getApiKey();

        if (!apiKey) {
          vscode.window.showErrorMessage(
            'PackSafe API key not configured. Please set it in the extension settings.'
          );
          return;
        }

        try {
          progress.report({
            increment: 50,
            message: 'Analyzing dependencies...',
          });

          // Make API request
          const response = await axios.post(
            `${apiBaseUrl}/api/scan/package-json`,
            {
              packageJson,
              projectPath: vscode.workspace.name || 'Unknown Project',
            },
            {
              headers: {
                'x-api-key': apiKey,
              },
            }
          );

          progress.report({ increment: 100, message: 'Scan complete!' });

          // Update status bar
          const { outdated, vulnerable } = response.data.summary;
          vscode.commands.executeCommand(
            'packsafe.updateStatusBar',
            outdated,
            vulnerable
          );

          // Show result
          vscode.window.showInformationMessage(
            `PackSafe scan complete: ${outdated} outdated, ${vulnerable} vulnerable packages`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `PackSafe scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `PackSafe: Error reading package.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
