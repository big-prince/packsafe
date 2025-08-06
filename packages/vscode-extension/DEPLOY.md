# PackSafe VS Code Extension - Marketplace Deployment

## Prerequisites

1. **Visual Studio Code Extension Manager (vsce)**

   ```bash
   npm install -g vsce
   ```

2. **Azure DevOps Personal Access Token**
   - Go to https://dev.azure.com
   - Create a Personal Access Token with "Marketplace > Manage" scope
   - Save the token securely

## Deployment Steps

### 1. Prepare Extension

```bash
cd packages/vscode-extension
npm run compile
```

### 2. Update Production Settings

Update `src/services/configurationManager.ts` to use production API URL:

```typescript
private getDefaultServerUrl(): string {
  return 'https://your-render-service.onrender.com';
}
```

### 3. Package Extension

```bash
vsce package
```

This creates a `.vsix` file you can test locally:

```bash
code --install-extension packsafe-vscode-1.0.0.vsix
```

### 4. Publish to Marketplace

```bash
vsce publish -p <your-access-token>
```

Or publish with interactive login:

```bash
vsce publish
```

## Publisher Setup

If you haven't set up a publisher:

1. Create a publisher at https://marketplace.visualstudio.com/manage
2. Update `package.json` publisher field to match your publisher ID
3. Verify ownership via Azure DevOps

## Post-Deployment

1. Your extension will be available at:
   `https://marketplace.visualstudio.com/items?itemName=YOUR_PUBLISHER.packsafe-vscode`

2. Users can install via:
   - VS Code Extensions view
   - Command: `ext install YOUR_PUBLISHER.packsafe-vscode`

## Version Updates

For future updates:

```bash
vsce publish patch  # 1.0.0 -> 1.0.1
vsce publish minor  # 1.0.0 -> 1.1.0
vsce publish major  # 1.0.0 -> 2.0.0
```
