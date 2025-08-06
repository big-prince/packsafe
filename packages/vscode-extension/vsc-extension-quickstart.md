# PackSafe VS Code Extension

## Development Setup

### Prerequisites

- Node.js v18+ and npm
- Visual Studio Code
- PackSafe server running locally or remotely

### Getting Started

1. Clone the repository
2. Navigate to the extension directory:
   ```
   cd packsafe/packages/vscode-extension
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Copy the `.env.example` file to `.env` and configure it:
   ```
   cp .env.example .env
   ```
5. Open the extension in VS Code:
   ```
   code .
   ```

### Development Workflow

1. Run the watch task to compile the extension:
   ```
   npm run watch
   ```
2. Press F5 to launch a new VS Code window with the extension loaded
3. Make changes to the code
4. Reload the extension window to see your changes (Ctrl+R or Cmd+R)
5. Debug the extension by setting breakpoints in the code

### Testing the Extension

1. Run the tests:
   ```
   npm run test
   ```

### Packaging the Extension

1. Install the vsce tool globally:
   ```
   npm install -g @vscode/vsce
   ```
2. Package the extension:
   ```
   vsce package
   ```

## Extension Features

### Commands

- `Scan Project Dependencies`: Manually scan the current project for vulnerabilities
- `Refresh Status`: Refresh the status of dependencies
- `Open Dashboard`: Open the PackSafe web dashboard
- `Configure API Key`: Set up your PackSafe API key

### Status Bar

The extension adds a status item to the VS Code status bar, showing:

- 🟢 Healthy: No vulnerabilities detected
- 🟠 Warning: Minor vulnerabilities detected
- 🔴 Critical: Major vulnerabilities detected

### Hover Information

Hover over package names in package.json to see:

- Current version
- Latest version
- License information
- Known vulnerabilities

### Notifications

The extension can show notifications when:

- New vulnerabilities are detected
- Updates are available for packages
- License compliance issues are found

## Extension Settings

- `packsafe.apiKey`: API key for PackSafe service
- `packsafe.serverUrl`: PackSafe server URL
- `packsafe.autoScan`: Automatically scan dependencies when package.json changes
- `packsafe.showStatusBar`: Show PackSafe status in status bar
- `packsafe.notifications`: Show vulnerability notifications
