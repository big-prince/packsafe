import * as vscode from 'vscode';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
}

export class Logger {
  private static _outputChannel: vscode.OutputChannel;
  private static _logLevel: LogLevel = LogLevel.INFO;
  private static _workspaceRoot: string = '';

  static initialize(outputChannel: vscode.OutputChannel): void {
    Logger._outputChannel = outputChannel;

    // Get workspace root if available
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      Logger._workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
  }

  static setLogLevel(level: LogLevel): void {
    Logger._logLevel = level;
  }

  /**
   * Show the output channel
   */
  static show(): void {
    if (Logger._outputChannel) {
      Logger._outputChannel.show();
    }
  }

  /**
   * Hide the output channel
   */
  static hide(): void {
    if (Logger._outputChannel) {
      Logger._outputChannel.hide();
    }
  }

  static debug(message: string): void {
    if (Logger._logLevel <= LogLevel.DEBUG) {
      Logger._log('DEBUG', message);
    }
  }

  static info(message: string): void {
    if (Logger._logLevel <= LogLevel.INFO) {
      Logger._log('INFO', message);
    }
  }

  static warning(
    message: string,
    filePath?: string,
    line?: number,
    column?: number
  ): void {
    if (Logger._logLevel <= LogLevel.WARNING) {
      Logger._log('WARNING', message, filePath, line, column);
    }
  }

  static error(
    message: string,
    error?: Error,
    filePath?: string,
    line?: number,
    column?: number
  ): void {
    if (Logger._logLevel <= LogLevel.ERROR) {
      Logger._log('ERROR', message, filePath, line, column);

      if (error) {
        Logger._outputChannel.appendLine(`Error details: ${error.message}`);
        if (error.stack) {
          Logger._outputChannel.appendLine(`Stack trace: ${error.stack}`);
        }
      }
    }
  }

  private static _log(
    level: string,
    message: string,
    filePath?: string,
    line?: number,
    column?: number
  ): void {
    if (!Logger._outputChannel) {
      console.log(`[${level}] ${message}`);
      return;
    }

    const timestamp = new Date().toISOString();

    // Basic log entry
    let logMessage = `[${level} ${timestamp}] ${message}`;

    // For warnings and errors, format as problem matcher compatible output if file info is provided
    if ((level === 'WARNING' || level === 'ERROR') && filePath) {
      // Make path relative to workspace if possible
      let relativePath = filePath;
      if (Logger._workspaceRoot && filePath.startsWith(Logger._workspaceRoot)) {
        relativePath = path.relative(Logger._workspaceRoot, filePath);
      }

      // Format that can be picked up by standard problem matchers
      logMessage = `${relativePath}(${line || 1},${column || 1}): ${level.toLowerCase()}: ${message}`;
    }

    Logger._outputChannel.appendLine(logMessage);

    // Also log to console
    if (level === 'ERROR') {
      console.error(message);
    } else if (level === 'WARNING') {
      console.warn(message);
    } else {
      console.log(message);
    }
  }

  static dispose(): void {
    if (Logger._outputChannel) {
      Logger._outputChannel.dispose();
    }
  }
}
