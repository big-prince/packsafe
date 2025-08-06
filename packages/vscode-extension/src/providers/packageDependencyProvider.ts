import * as vscode from 'vscode';
import axios from 'axios';
import { ConfigurationManager } from '../services/configurationManager';

export class PackageDependencyProvider implements vscode.HoverProvider {
  private configManager: ConfigurationManager;

  constructor() {
    this.configManager = new ConfigurationManager();
  }
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    // Only provide hover for package.json files
    if (!document.fileName.endsWith('package.json')) {
      return undefined;
    }

    try {
      const packageJson = JSON.parse(document.getText());

      // Check if we're hovering over a dependency
      const line = document.lineAt(position.line).text;
      const matches = /"([^"]+)"\s*:\s*"([^"]+)"/.exec(line);

      if (!matches) {
        return undefined;
      }

      const [, packageName, packageVersion] = matches;

      // Check if this is a dependency
      const isDependency =
        (packageJson.dependencies && packageJson.dependencies[packageName]) ||
        (packageJson.devDependencies &&
          packageJson.devDependencies[packageName]);

      if (!isDependency) {
        return undefined;
      }

      // Get package info from API
      const apiBaseUrl = this.configManager.getServerUrl();
      const apiKey = this.configManager.getApiKey();

      if (!apiKey) {
        return new vscode.Hover(
          'PackSafe API key not configured. Please set it in the extension settings.'
        );
      }

      try {
        const response = await axios.get(
          `${apiBaseUrl}/api/packages/${packageName}`,
          {
            headers: {
              'x-api-key': apiKey,
            },
          }
        );

        const packageInfo = response.data;

        // Build hover message
        const hoverContent = new vscode.MarkdownString();

        hoverContent.appendMarkdown(`### ${packageName}@${packageVersion}\n\n`);

        if (packageInfo.latestVersion) {
          hoverContent.appendMarkdown(
            `**Latest version:** ${packageInfo.latestVersion}\n\n`
          );
        }

        if (packageInfo.isOutdated) {
          hoverContent.appendMarkdown(
            `⚠️ **Outdated** - Consider upgrading to latest version\n\n`
          );
        }

        if (packageInfo.hasVulnerabilities) {
          hoverContent.appendMarkdown(
            `🔴 **Vulnerable** - ${packageInfo.vulnerabilityCount} known vulnerabilities\n\n`
          );
        }

        if (packageInfo.license) {
          hoverContent.appendMarkdown(
            `**License:** ${packageInfo.license}\n\n`
          );
        }

        if (packageInfo.description) {
          hoverContent.appendMarkdown(
            `**Description:** ${packageInfo.description}\n\n`
          );
        }

        hoverContent.appendMarkdown(
          `[View on npm](https://www.npmjs.com/package/${packageName})`
        );

        return new vscode.Hover(hoverContent);
      } catch (error) {
        return new vscode.Hover(
          `Error fetching package info: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } catch (error) {
      return undefined;
    }
  }
}
