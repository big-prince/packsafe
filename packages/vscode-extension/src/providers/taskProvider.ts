import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export class TaskProvider implements vscode.TaskProvider {
  private static readonly PackSafeType = 'packsafe';
  private tasks: vscode.Task[] = [];

  constructor() {
    this.refreshTasks();
  }

  public refreshTasks() {
    Logger.info('Refreshing PackSafe tasks');
    this.tasks = this.getTasks();
  }

  public provideTasks(): vscode.ProviderResult<vscode.Task[]> {
    return this.tasks;
  }

  public resolveTask(_task: vscode.Task): vscode.ProviderResult<vscode.Task> {
    const definition = _task.definition as PackSafeTaskDefinition;
    return this.getTask(definition.command, definition.label);
  }

  private getTasks(): vscode.Task[] {
    const result: vscode.Task[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders?.length) {
      return result;
    }

    // Create scan task
    result.push(this.getTask('scanProject', 'Scan Project Dependencies'));

    // Create update task
    result.push(this.getTask('refreshStatus', 'Refresh Status'));

    return result;
  }

  private getTask(command: string, label: string): vscode.Task {
    if (!vscode.workspace.workspaceFolders?.length) {
      throw new Error('No workspace folders found');
    }

    const definition: PackSafeTaskDefinition = {
      type: TaskProvider.PackSafeType,
      command: command,
      label: label,
    };

    // Create an actual command execution that triggers our VS Code command
    const execution = new vscode.ShellExecution(
      `echo "Running PackSafe task: ${label}" && code --command "packsafe.${command}"`
    );

    const task = new vscode.Task(
      definition,
      vscode.workspace.workspaceFolders[0],
      label,
      'PackSafe',
      execution,
      ['$packsafe']
    );

    task.isBackground = false;
    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      panel: vscode.TaskPanelKind.Dedicated,
      echo: true,
      focus: true,
      showReuseMessage: true,
    };

    return task;
  }
}

interface PackSafeTaskDefinition extends vscode.TaskDefinition {
  command: string;
  label: string;
}
