import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export interface ProgressStep {
  message: string;
  increment?: number; // percentage to increment (0-100)
  duration?: number; // estimated duration in ms for this step
}

export interface ProgressOperation {
  title: string;
  steps: ProgressStep[];
  cancellable?: boolean;
  location?: vscode.ProgressLocation;
}

export class EnhancedProgressManager {
  private static instance: EnhancedProgressManager;
  private activeOperations = new Map<string, vscode.CancellationTokenSource>();

  public static getInstance(): EnhancedProgressManager {
    if (!EnhancedProgressManager.instance) {
      EnhancedProgressManager.instance = new EnhancedProgressManager();
    }
    return EnhancedProgressManager.instance;
  }

  /**
   * Execute an operation with enhanced progress feedback
   */
  public async withEnhancedProgress<T>(
    operation: ProgressOperation,
    executor: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Promise<T>
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const cancellationTokenSource = new vscode.CancellationTokenSource();

    this.activeOperations.set(operationId, cancellationTokenSource);

    try {
      return await vscode.window.withProgress(
        {
          location: operation.location || vscode.ProgressLocation.Notification,
          title: operation.title,
          cancellable: operation.cancellable || false,
        },
        async (progress, token) => {
          // Link the provided token with our cancellation token
          const combinedToken = this.createCombinedToken(
            token,
            cancellationTokenSource.token
          );

          // Create enhanced progress reporter
          const enhancedProgress = this.createEnhancedProgress(
            progress,
            operation.steps
          );

          try {
            const result = await executor(enhancedProgress, combinedToken);
            return result;
          } catch (error) {
            Logger.error(`Progress operation failed: ${error}`);
            throw error;
          }
        }
      );
    } finally {
      this.activeOperations.delete(operationId);
      cancellationTokenSource.dispose();
    }
  }

  /**
   * Show a step-by-step progress for package operations
   */
  public async withPackageProgress<T>(
    packageName: string,
    operation: 'install' | 'uninstall' | 'update',
    packageManager: 'npm' | 'yarn' | 'pnpm',
    executor: (
      updateStep: (step: string, progress?: number) => void,
      token: vscode.CancellationToken
    ) => Promise<T>
  ): Promise<T> {
    const operationSteps = this.getPackageOperationSteps(
      operation,
      packageManager,
      packageName
    );

    return this.withEnhancedProgress(
      {
        title: operationSteps.title,
        steps: operationSteps.steps,
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
      },
      async (progress, token) => {
        let currentStepIndex = 0;
        let currentProgress = 0;

        const updateStep = (step: string, progressIncrement?: number) => {
          const increment =
            progressIncrement || 100 / operationSteps.steps.length;
          currentProgress += increment;

          progress.report({
            message: step,
            increment: increment,
          });

          currentStepIndex++;
          Logger.info(
            `📦 ${operationSteps.title}: ${step} (${currentProgress.toFixed(1)}%)`
          );
        };

        return executor(updateStep, token);
      }
    );
  }

  /**
   * Show progress for scanning operations
   */
  public async withScanProgress<T>(
    projectPath: string,
    executor: (
      updateStep: (step: string, progress?: number) => void,
      token: vscode.CancellationToken
    ) => Promise<T>
  ): Promise<T> {
    const projectName = projectPath.split('/').pop() || 'project';

    return this.withEnhancedProgress(
      {
        title: `🔍 Scanning ${projectName}`,
        steps: [
          { message: 'Reading package.json...', increment: 20 },
          { message: 'Analyzing dependencies...', increment: 30 },
          { message: 'Checking for vulnerabilities...', increment: 25 },
          { message: 'Checking for updates...', increment: 20 },
          { message: 'Finalizing report...', increment: 5 },
        ],
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
      },
      async (progress, token) => {
        let currentProgress = 0;

        const updateStep = (step: string, progressIncrement?: number) => {
          const increment = progressIncrement || 20;
          currentProgress += increment;

          progress.report({
            message: step,
            increment: increment,
          });

          Logger.info(`🔍 Scanning: ${step} (${currentProgress.toFixed(1)}%)`);
        };

        return executor(updateStep, token);
      }
    );
  }

  /**
   * Cancel all active operations
   */
  public cancelAllOperations(): void {
    for (const [operationId, tokenSource] of this.activeOperations) {
      tokenSource.cancel();
      Logger.info(`Cancelled operation: ${operationId}`);
    }
    this.activeOperations.clear();
  }

  /**
   * Cancel a specific operation
   */
  public cancelOperation(operationId: string): void {
    const tokenSource = this.activeOperations.get(operationId);
    if (tokenSource) {
      tokenSource.cancel();
      this.activeOperations.delete(operationId);
      Logger.info(`Cancelled operation: ${operationId}`);
    }
  }

  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createCombinedToken(
    token1: vscode.CancellationToken,
    token2: vscode.CancellationToken
  ): vscode.CancellationToken {
    const combinedTokenSource = new vscode.CancellationTokenSource();

    token1.onCancellationRequested(() => combinedTokenSource.cancel());
    token2.onCancellationRequested(() => combinedTokenSource.cancel());

    return combinedTokenSource.token;
  }

  private createEnhancedProgress(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    steps: ProgressStep[]
  ) {
    let currentStepIndex = 0;

    return {
      report: (value: { message?: string; increment?: number }) => {
        // Add emoji and enhanced formatting
        const emoji = this.getProgressEmoji(currentStepIndex, steps.length);
        const formattedMessage = value.message
          ? `${emoji} ${value.message}`
          : undefined;

        progress.report({
          message: formattedMessage,
          increment: value.increment,
        });

        if (value.increment) {
          currentStepIndex++;
        }
      },
    };
  }

  private getProgressEmoji(currentStep: number, totalSteps: number): string {
    const progress = currentStep / totalSteps;

    if (progress === 0) return '🚀';
    if (progress < 0.25) return '⚡';
    if (progress < 0.5) return '🔄';
    if (progress < 0.75) return '⚙️';
    if (progress < 1) return '🎯';
    return '✅';
  }

  private getPackageOperationSteps(
    operation: 'install' | 'uninstall' | 'update',
    packageManager: 'npm' | 'yarn' | 'pnpm',
    packageName: string
  ) {
    const managerEmoji = {
      npm: '📦',
      yarn: '🧶',
      pnpm: '📦',
    };

    const operationEmoji = {
      install: '⬇️',
      uninstall: '🗑️',
      update: '⬆️',
    };

    const baseTitle = `${managerEmoji[packageManager]} ${operationEmoji[operation]} ${operation}ing ${packageName}`;

    switch (operation) {
      case 'install':
        return {
          title: baseTitle,
          steps: [
            { message: 'Preparing installation...', increment: 10 },
            { message: 'Resolving dependencies...', increment: 20 },
            { message: 'Downloading packages...', increment: 40 },
            { message: 'Installing dependencies...', increment: 20 },
            { message: 'Updating project files...', increment: 10 },
          ],
        };

      case 'uninstall':
        return {
          title: baseTitle,
          steps: [
            { message: 'Preparing removal...', increment: 15 },
            { message: 'Removing package...', increment: 50 },
            { message: 'Cleaning up dependencies...', increment: 25 },
            { message: 'Updating project files...', increment: 10 },
          ],
        };

      case 'update':
        return {
          title: baseTitle,
          steps: [
            { message: 'Checking current version...', increment: 10 },
            { message: 'Finding latest version...', increment: 15 },
            { message: 'Downloading update...', increment: 40 },
            { message: 'Installing update...', increment: 25 },
            { message: 'Updating project files...', increment: 10 },
          ],
        };

      default:
        return {
          title: baseTitle,
          steps: [
            { message: 'Processing...', increment: 50 },
            { message: 'Finalizing...', increment: 50 },
          ],
        };
    }
  }
}
