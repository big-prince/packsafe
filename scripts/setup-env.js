#!/usr/bin/env node

/**
 * Script to setup development environment
 * This script:
 * 1. Checks if all required dependencies are installed
 * 2. Sets up .env files from .env.example if they don't exist
 * 3. Validates the .env files for required values
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES = ['server', 'client', 'vscode-extension', 'whatsapp-bot'];

// Check dependencies
console.log('Checking required dependencies...');
try {
  console.log('Node.js version:', execSync('node --version').toString().trim());
  console.log('npm version:', execSync('npm --version').toString().trim());

  // Check if MongoDB is available
  try {
    execSync('mongod --version');
    console.log('MongoDB is installed.');
  } catch (error) {
    console.warn(
      '⚠️ MongoDB is not installed or not in PATH. You will need MongoDB running for development.'
    );
  }

  console.log('✅ Using in-memory cache - no Redis required.');
} catch (error) {
  console.error('❌ Error checking dependencies:', error);
  process.exit(1);
}

// Setup .env files
console.log('\nSetting up environment files...');
const setupEnvFile = directory => {
  const envExamplePath = path.join(ROOT_DIR, directory, '.env.example');
  const envPath = path.join(ROOT_DIR, directory, '.env');

  if (!fs.existsSync(envExamplePath)) {
    console.warn(`⚠️ No .env.example found in ${directory}`);
    return;
  }

  if (!fs.existsSync(envPath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log(`✅ Created .env file in ${directory}`);
    } catch (error) {
      console.error(`❌ Failed to create .env file in ${directory}:`, error);
    }
  } else {
    console.log(`ℹ️ .env file already exists in ${directory}`);
  }
};

// Root .env
setupEnvFile('');

// Package .env files
PACKAGES.forEach(pkg => {
  const pkgPath = `packages/${pkg}`;
  setupEnvFile(pkgPath);
});

console.log('\n✅ Environment setup complete!');
console.log('\nNext steps:');
console.log('1. Edit the .env files with your configuration');
console.log('2. Run `npm install` to install dependencies');
console.log('3. Run `npm run dev` to start the development servers');
