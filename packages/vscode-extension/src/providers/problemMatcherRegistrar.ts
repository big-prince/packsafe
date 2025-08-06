import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * Helper class to document the problem matcher format used by PackSafe
 *
 * Note: Problem matchers can only be registered via the package.json,
 * not programmatically through the VS Code API. This class exists
 * for documentation purposes and to provide utility methods.
 */
export class ProblemMatcherRegistrar {
  /**
   * Initialize and provide information about the problem matcher pattern
   */
  public static register(context: vscode.ExtensionContext): void {
    Logger.info('PackSafe problem matcher is defined in package.json');
    Logger.info('Format used: filepath(line,column): severity: message');

    // Register a command that will log a test error in the proper format
    const testErrorCommand = vscode.commands.registerCommand(
      'packsafe.testProblemMatcher',
      () => {
        const testFile = 'example/path/file.js';
        const line = 10;
        const column = 5;
        const message = 'This is a test error for the problem matcher';

        // Log in format that matches our problem matcher
        Logger.error(message, undefined, testFile, line, column);

        vscode.window.showInformationMessage(
          'Test error logged. Check the PackSafe output channel.'
        );
      }
    );

    context.subscriptions.push(testErrorCommand);
  }
}
