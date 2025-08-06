#!/usr/bin/env node

/**
 * Script to validate the project structure and dependencies
 * This script:
 * 1. Checks if all required packages are present
 * 2. Validates package.json files for required dependencies
 * 3. Checks for required configuration files
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES = [
  'shared',
  'server',
  'client',
  'vscode-extension',
  'whatsapp-bot',
];

let errorCount = 0;
let warningCount = 0;

function checkPath(relativePath, type = 'file', required = true) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  const exists = fs.existsSync(fullPath);
  const isCorrectType = exists
    ? type === 'file'
      ? fs.statSync(fullPath).isFile()
      : fs.statSync(fullPath).isDirectory()
    : false;

  if (!exists || !isCorrectType) {
    if (required) {
      console.error(`❌ Missing ${type}: ${relativePath}`);
      errorCount++;
      return false;
    } else {
      console.warn(`⚠️ Missing optional ${type}: ${relativePath}`);
      warningCount++;
      return false;
    }
  }
  return true;
}

function checkPackageJson(pkgPath, requiredDeps = []) {
  const packageJsonPath = path.join(ROOT_DIR, pkgPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ Missing package.json in ${pkgPath}`);
    errorCount++;
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    for (const dep of requiredDeps) {
      if (!deps[dep]) {
        console.warn(`⚠️ Missing dependency ${dep} in ${pkgPath}`);
        warningCount++;
      }
    }
  } catch (error) {
    console.error(`❌ Error parsing package.json in ${pkgPath}:`, error);
    errorCount++;
  }
}

console.log('🔍 Validating project structure...\n');

// Check root configuration files
checkPath('package.json', 'file');
checkPath('tsconfig.json', 'file');
checkPath('.eslintrc.js', 'file', false);
checkPath('.prettierrc', 'file', false);
checkPath('.env.example', 'file');
checkPath('docker-compose.yml', 'file');
checkPath('.gitignore', 'file');

// Check packages
for (const pkg of PACKAGES) {
  const pkgPath = `packages/${pkg}`;
  console.log(`\n🔍 Checking ${pkgPath}...`);

  checkPath(pkgPath, 'directory');
  checkPath(`${pkgPath}/package.json`, 'file');
  checkPath(`${pkgPath}/tsconfig.json`, 'file');
  checkPath(`${pkgPath}/src`, 'directory');

  // Package-specific checks
  switch (pkg) {
    case 'server':
      checkPackageJson(pkgPath, [
        'express',
        'mongoose',
        'socket.io',
        'jsonwebtoken',
      ]);
      checkPath(`${pkgPath}/src/index.ts`, 'file');
      checkPath(`${pkgPath}/src/models`, 'directory');
      checkPath(`${pkgPath}/src/routes`, 'directory');
      break;
    case 'client':
      checkPackageJson(pkgPath, ['react', 'react-dom', 'tailwindcss']);
      checkPath(`${pkgPath}/src/index.tsx`, 'file');
      checkPath(`${pkgPath}/src/components`, 'directory');
      break;
    case 'vscode-extension':
      checkPackageJson(pkgPath, ['vscode']);
      checkPath(`${pkgPath}/src/extension.ts`, 'file');
      break;
    case 'shared':
      checkPath(`${pkgPath}/src/types`, 'directory');
      checkPath(`${pkgPath}/src/utils`, 'directory');
      break;
  }
}

console.log('\n📋 Validation summary:');
if (errorCount === 0 && warningCount === 0) {
  console.log('✅ All checks passed! Project structure is valid.');
} else {
  console.log(`❌ Found ${errorCount} errors and ${warningCount} warnings.`);
  if (errorCount > 0) {
    console.log('Please fix the errors before continuing.');
  }
}

process.exit(errorCount > 0 ? 1 : 0);
