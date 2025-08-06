import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PackageScanner } from './packageScanner';

const execAsync = promisify(exec);

/**
 * Service to handle package installation and uninstallation
 */
export class PackageManager {
  constructor(private packageScanner: PackageScanner) {}

  /**
   * Install a new package to a project
   */
  public async installPackage(
    packageName: string,
    packageJsonPath: string,
    isDev: boolean,
    version?: string
  ): Promise<void> {
    try {
      const workingDir = path.dirname(packageJsonPath);
      const packageManager = await this.detectPackageManager(workingDir);
      const devFlag = isDev ? ' --save-dev' : ' --save';
      const packageToInstall = version
        ? `${packageName}@${version}`
        : packageName;

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Installing ${packageName}...`,
          cancellable: false,
        },
        async progress => {
          try {
            Logger.info(
              `Installing ${packageToInstall} in ${workingDir} using ${packageManager}`
            );

            progress.report({ message: 'Running install command...' });

            // Build the install command based on package manager
            let command: string;
            switch (packageManager) {
              case 'yarn':
                command = `yarn add ${packageToInstall}${isDev ? ' --dev' : ''}`;
                break;
              case 'pnpm':
                command = `pnpm add ${packageToInstall}${devFlag}`;
                break;
              case 'npm':
              default:
                command = `npm install ${packageToInstall}${devFlag}`;
                break;
            }

            // Execute the install command
            const { stdout, stderr } = await execAsync(command, {
              cwd: workingDir,
            });

            // Only treat stderr as error if it doesn't contain common warnings
            if (
              stderr &&
              !stderr.includes('npm WARN') &&
              !stderr.includes('yarn install') &&
              !stderr.includes('warning') &&
              !stderr.toLowerCase().includes('deprecated')
            ) {
              throw new Error(stderr);
            }

            Logger.info(`Successfully installed ${packageName}`);
            Logger.info(stdout);

            // Scan the project again to update the dependency tree
            progress.report({ message: 'Updating dependencies...' });
            await this.packageScanner.scanFile(packageJsonPath);

            vscode.window.showInformationMessage(
              `Successfully installed ${packageName}`
            );
          } catch (error) {
            const errorMessage = `Failed to install ${packageName}: ${error instanceof Error ? error.message : String(error)}`;
            Logger.error(errorMessage);
            vscode.window.showErrorMessage(errorMessage);
            throw error;
          }
        }
      );
    } catch (error) {
      Logger.error(
        `Install error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Uninstall a package from a project
   */
  public async uninstallPackage(
    packageName: string,
    packageJsonPath: string,
    isDev: boolean
  ): Promise<void> {
    try {
      const workingDir = path.dirname(packageJsonPath);
      const packageManager = await this.detectPackageManager(workingDir);
      const devFlag = isDev ? ' --save-dev' : ' --save';

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Uninstalling ${packageName}...`,
          cancellable: false,
        },
        async progress => {
          try {
            Logger.info(
              `Uninstalling ${packageName} from ${workingDir} using ${packageManager}`
            );

            progress.report({ message: 'Running uninstall command...' });

            // Build the uninstall command based on package manager
            let command: string;
            switch (packageManager) {
              case 'yarn':
                command = `yarn remove ${packageName}`;
                break;
              case 'pnpm':
                command = `pnpm remove ${packageName}${devFlag}`;
                break;
              case 'npm':
              default:
                command = `npm uninstall ${packageName}${devFlag}`;
                break;
            }

            // Execute the uninstall command
            const { stdout, stderr } = await execAsync(command, {
              cwd: workingDir,
            });

            // Only treat stderr as error if it doesn't contain common warnings
            if (
              stderr &&
              !stderr.includes('npm WARN') &&
              !stderr.includes('yarn install') &&
              !stderr.includes('warning') &&
              !stderr.toLowerCase().includes('deprecated')
            ) {
              throw new Error(stderr);
            }

            Logger.info(`Successfully uninstalled ${packageName}`);
            Logger.info(stdout);

            // Scan the project again to update the dependency tree
            progress.report({ message: 'Updating dependencies...' });
            await this.packageScanner.scanFile(packageJsonPath);

            vscode.window.showInformationMessage(
              `Successfully uninstalled ${packageName}`
            );
          } catch (error) {
            const errorMessage = `Failed to uninstall ${packageName}: ${error instanceof Error ? error.message : String(error)}`;
            Logger.error(errorMessage);
            vscode.window.showErrorMessage(errorMessage);
            throw error;
          }
        }
      );
    } catch (error) {
      Logger.error(
        `Uninstall error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Update a package to its latest version
   */
  public async updatePackage(
    packageName: string,
    packageJsonPath: string,
    isDev: boolean
  ): Promise<void> {
    try {
      const workingDir = path.dirname(packageJsonPath);
      const packageManager = await this.detectPackageManager(workingDir);
      const devFlag = isDev ? ' --save-dev' : ' --save';

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Updating ${packageName}...`,
          cancellable: false,
        },
        async progress => {
          try {
            Logger.info(
              `Updating ${packageName} in ${workingDir} using ${packageManager}`
            );

            progress.report({ message: 'Running update command...' });

            // Build the update command based on package manager
            let command: string;
            switch (packageManager) {
              case 'yarn':
                command = `yarn upgrade ${packageName}`;
                break;
              case 'pnpm':
                command = `pnpm update ${packageName}`;
                break;
              case 'npm':
              default:
                command = `npm install ${packageName}@latest${devFlag}`;
                break;
            }

            // Execute the update command
            const { stdout, stderr } = await execAsync(command, {
              cwd: workingDir,
            });

            // Only treat stderr as error if it doesn't contain common warnings
            if (
              stderr &&
              !stderr.includes('npm WARN') &&
              !stderr.includes('yarn install') &&
              !stderr.includes('warning') &&
              !stderr.toLowerCase().includes('deprecated')
            ) {
              throw new Error(stderr);
            }

            Logger.info(`Successfully updated ${packageName}`);
            Logger.info(stdout);

            // Scan the project again to update the dependency tree
            progress.report({ message: 'Updating dependencies...' });
            await this.packageScanner.scanFile(packageJsonPath);

            vscode.window.showInformationMessage(
              `Successfully updated ${packageName} to the latest version`
            );
          } catch (error) {
            const errorMessage = `Failed to update ${packageName}: ${error instanceof Error ? error.message : String(error)}`;
            Logger.error(errorMessage);
            vscode.window.showErrorMessage(errorMessage);
            throw error;
          }
        }
      );
    } catch (error) {
      Logger.error(
        `Update error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Detect which package manager is being used in a project
   */
  private async detectPackageManager(
    projectDir: string
  ): Promise<'npm' | 'yarn' | 'pnpm'> {
    try {
      // Look for lockfiles to determine the package manager
      const { stdout: files } = await execAsync('dir /b', { cwd: projectDir });

      if (files.includes('yarn.lock')) {
        return 'yarn';
      } else if (files.includes('pnpm-lock.yaml')) {
        return 'pnpm';
      } else {
        // Default to npm
        return 'npm';
      }
    } catch (error) {
      // If detection fails, default to npm
      return 'npm';
    }
  }
}
