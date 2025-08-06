# PackSafe VS Code Extension

[![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/v/packsafe.packsafe-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=packsafe.packsafe-vscode)
[![Downloads](https://img.shields.io/vscode-marketplace/d/packsafe.packsafe-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=packsafe.packsafe-vscode)
[![Rating](https://img.shields.io/vscode-marketplace/r/packsafe.packsafe-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=packsafe.packsafe-vscode)

**Real-time dependency health monitoring for Node.js projects** - Scan, monitor, and manage your npm dependencies directly from VS Code with advanced security vulnerability detection and package management capabilities.

![PackSafe Demo](https://raw.githubusercontent.com/YOUR_USERNAME/packsafe/main/packages/vscode-extension/images/demo.gif)

## ✨ Key Features

### 🔍 **Real-time Dependency Scanning**

- Automatically scans `package.json` files for outdated and vulnerable dependencies
- Real-time status updates in VS Code status bar
- Support for monorepos and multi-package projects
- Works with npm, yarn, and pnpm

### 🛡️ **Advanced Security Monitoring**

- Detects known security vulnerabilities using multiple security databases
- Provides detailed vulnerability information with severity levels
- Shows CVE identifiers and remediation suggestions
- Real-time security alerts with actionable notifications

### 📦 **Smart Package Management**

- One-click package uninstallation directly from VS Code
- Automatic dependency tree updates after changes
- Package manager detection (npm/yarn/pnpm)
- Bulk dependency updates and management

### 📊 **Rich Visual Interface**

- Dedicated Activity Bar view for easy access
- Tree view of all package.json files in your workspace
- Color-coded dependency status indicators
- Detailed package information tooltips

## 🚀 Quick Start

### Installation

1. **From VS Code Marketplace**: Search for "PackSafe" in the Extensions view (`Ctrl+Shift+X`)
2. **Command Line**: `code --install-extension packsafe.packsafe-vscode`
3. **Manual**: Download `.vsix` from [releases](https://github.com/YOUR_USERNAME/packsafe/releases)

### First Setup

1. **Open a Node.js project** with a `package.json` file
2. **Configure API settings** (optional - works offline too):
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run `PackSafe: Configure API Settings`
   - Enter your PackSafe API key for enhanced features
3. **Start scanning**: Click the shield icon in the Activity Bar

## 📖 Usage Guide

### Activity Bar Integration

Click the **🛡️ PackSafe** icon in the Activity Bar to access:

- **📦 Package Files**: Browse all `package.json` files in your workspace
- **🔍 Dependencies**: View detailed dependency information for selected packages
- **🔍 Search & Install**: Search and install new packages directly from VS Code

### Status Bar Monitoring

The status bar shows real-time information:

- **📦 12 ⚠️ 3 🔴 1**: 12 total deps, 3 outdated, 1 vulnerable
- Click to open the PackSafe view for detailed information

### Keyboard Shortcuts

| Shortcut                               | Action               |
| -------------------------------------- | -------------------- |
| `Ctrl+Shift+P` → `PackSafe: Scan`      | Scan current project |
| `Ctrl+Shift+P` → `PackSafe: Configure` | Open settings        |
| `Ctrl+Shift+P` → `PackSafe: Dashboard` | Open web dashboard   |

### Context Menu Actions

Right-click on any dependency to:

- View detailed package information
- Uninstall package
- Check for updates
- View security vulnerabilities

## ⚙️ Configuration

### Extension Settings

Access via `File > Preferences > Settings` → search "PackSafe":

```json
{
  "packsafe.serverUrl": "https://your-packsafe-api.com",
  "packsafe.apiKey": "your-api-key",
  "packsafe.autoScan": true,
  "packsafe.scanOnStartup": true,
  "packsafe.enableNotifications": true,
  "packsafe.updateInterval": 300000
}
```

### API Configuration

For enhanced features, configure your PackSafe API:

1. **Register** at [PackSafe Dashboard](https://your-packsafe-app.netlify.app)
2. **Generate API Key** from your dashboard
3. **Configure in VS Code**: `PackSafe: Configure API Settings`

## 🔧 Advanced Features

### Multi-Package Support

PackSafe automatically detects and manages:

- Monorepo structures
- Client/server project setups
- Nested package.json files
- Workspace configurations

### Offline Mode

Works completely offline with:

- Local npm registry checks
- Cached vulnerability data
- Basic dependency analysis
- Package management features

### Integration with CI/CD

Export scan results for CI/CD integration:

- JSON reports for automated processing
- JUnit XML format for test results
- SARIF format for security analysis

## 🎯 Use Cases

### For Developers

- **Daily Workflow**: Monitor dependencies while coding
- **Security Audits**: Regular vulnerability scanning
- **Dependency Updates**: Keep packages up-to-date
- **Project Health**: Visual dependency status

### For Teams

- **Code Reviews**: Check dependency changes
- **Security Compliance**: Ensure secure dependencies
- **Project Standards**: Maintain consistent packages
- **Technical Debt**: Track outdated dependencies

## 📸 Screenshots

### Main Interface

![Main Interface](images/main-interface.png)

### Dependency Details

![Dependency Details](images/dependency-details.png)

### Security Alerts

![Security Alerts](images/security-alerts.png)

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/packsafe.git
cd packsafe/packages/vscode-extension
npm install
npm run compile
code .
```

Press `F5` to launch Extension Development Host.

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/YOUR_USERNAME/packsafe/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/YOUR_USERNAME/packsafe/discussions)
- **Documentation**: [Wiki](https://github.com/YOUR_USERNAME/packsafe/wiki)

## 📝 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🌟 Related Projects

- **[PackSafe Dashboard](https://your-packsafe-app.netlify.app)**: Web interface for advanced analytics
- **[PackSafe CLI](https://www.npmjs.com/package/@packsafe/cli)**: Command-line tool for CI/CD integration

---

**Made with ❤️ by the PackSafe team** | [Website](https://your-packsafe-app.netlify.app) | [Documentation](https://github.com/YOUR_USERNAME/packsafe/wiki)

### Commands

PackSafe adds several commands to VS Code:

- `PackSafe: Scan Project Dependencies` - Scan all package.json files in your workspace
- `PackSafe: Scan Selected Package` - Scan a specific package.json file
- `PackSafe: Uninstall Package` - Uninstall a dependency from your project
- `PackSafe: Show Package Details` - View detailed information about a package

### Status Bar

The PackSafe status bar item shows:

- ✅ "Dependencies OK" (green) - All dependencies are up-to-date and secure
- ⚠️ "X Outdated" (yellow) - Some packages need updating
- 🔴 "X Vulnerabilities" (red) - Security vulnerabilities detected
- 🔄 "Scanning..." (spinner) - Scan in progress

## Configuration

PackSafe can be configured through VS Code settings:

- `packsafe.serverUrl`: URL of the PackSafe server
- `packsafe.apiKey`: API key for authentication
- `packsafe.autoScan`: Automatically scan when package.json changes
- `packsafe.showStatusBar`: Show PackSafe status in status bar
- `packsafe.notifications`: Show vulnerability notifications

## License

This project is licensed under the MIT License - see the LICENSE file for details.
