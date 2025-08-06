#!/usr/bin/env node

/**
 * Script to check and configure Tailwind CSS
 * This script:
 * 1. Checks if Tailwind CSS is properly configured in the client package
 * 2. Updates or creates the necessary configuration files if needed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLIENT_DIR = path.resolve(__dirname, '../packages/client');
const TAILWIND_CONFIG_PATH = path.join(CLIENT_DIR, 'tailwind.config.js');
const POSTCSS_CONFIG_PATH = path.join(CLIENT_DIR, 'postcss.config.js');

// Check if the client directory exists
if (!fs.existsSync(CLIENT_DIR)) {
  console.error(`❌ Client directory not found at ${CLIENT_DIR}`);
  process.exit(1);
}

// Check if package.json exists and has Tailwind dependencies
const packageJsonPath = path.join(CLIENT_DIR, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error(`❌ package.json not found in ${CLIENT_DIR}`);
  process.exit(1);
}

// Read and parse package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error('❌ Error parsing package.json:', error);
  process.exit(1);
}

// Check for Tailwind dependencies
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
const hasTailwind = !!dependencies.tailwindcss;
const hasPostCSS = !!dependencies.postcss;
const hasAutoprefixer = !!dependencies.autoprefixer;

console.log('Checking Tailwind CSS configuration...');
console.log(`- tailwindcss: ${hasTailwind ? '✅' : '❌'}`);
console.log(`- postcss: ${hasPostCSS ? '✅' : '❌'}`);
console.log(`- autoprefixer: ${hasAutoprefixer ? '✅' : '❌'}`);

// Install missing dependencies if needed
if (!hasTailwind || !hasPostCSS || !hasAutoprefixer) {
  console.log('\nInstalling missing dependencies...');
  try {
    const missingDeps = [];
    if (!hasTailwind) missingDeps.push('tailwindcss');
    if (!hasPostCSS) missingDeps.push('postcss');
    if (!hasAutoprefixer) missingDeps.push('autoprefixer');

    execSync(
      `cd ${CLIENT_DIR} && npm install --save-dev ${missingDeps.join(' ')}`,
      {
        stdio: 'inherit',
      }
    );
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Error installing dependencies:', error);
    process.exit(1);
  }
}

// Check/create Tailwind config
if (!fs.existsSync(TAILWIND_CONFIG_PATH)) {
  console.log('\nCreating tailwind.config.js...');
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 15px 0 rgba(0, 0, 0, 0.05)',
        'medium': '0 4px 20px 0 rgba(0, 0, 0, 0.1)',
        'hard': '0 8px 30px 0 rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
`;

  try {
    fs.writeFileSync(TAILWIND_CONFIG_PATH, tailwindConfig);
    console.log('✅ tailwind.config.js created successfully');
  } catch (error) {
    console.error('❌ Error creating tailwind.config.js:', error);
    process.exit(1);
  }
} else {
  console.log('✅ tailwind.config.js already exists');
}

// Check/create PostCSS config
if (!fs.existsSync(POSTCSS_CONFIG_PATH)) {
  console.log('\nCreating postcss.config.js...');
  const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

  try {
    fs.writeFileSync(POSTCSS_CONFIG_PATH, postcssConfig);
    console.log('✅ postcss.config.js created successfully');
  } catch (error) {
    console.error('❌ Error creating postcss.config.js:', error);
    process.exit(1);
  }
} else {
  console.log('✅ postcss.config.js already exists');
}

// Check for index.css file with Tailwind imports
const indexCssPath = path.join(CLIENT_DIR, 'src/index.css');
if (fs.existsSync(indexCssPath)) {
  const cssContent = fs.readFileSync(indexCssPath, 'utf8');
  if (!cssContent.includes('@tailwind')) {
    console.log('\nUpdating index.css with Tailwind imports...');
    const tailwindImports = `@tailwind base;
@tailwind components;
@tailwind utilities;

${cssContent}`;

    try {
      fs.writeFileSync(indexCssPath, tailwindImports);
      console.log('✅ index.css updated with Tailwind imports');
    } catch (error) {
      console.error('❌ Error updating index.css:', error);
    }
  } else {
    console.log('✅ index.css already has Tailwind imports');
  }
} else {
  console.log('\nCreating index.css with Tailwind imports...');
  const tailwindCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
@layer components {
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors;
  }
  
  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700;
  }
  
  .btn-secondary {
    @apply bg-secondary-600 text-white hover:bg-secondary-700;
  }
  
  .btn-danger {
    @apply bg-danger-600 text-white hover:bg-danger-700;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-soft p-6;
  }
  
  .input {
    @apply px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  }
}`;

  try {
    fs.writeFileSync(indexCssPath, tailwindCss);
    console.log('✅ index.css created with Tailwind imports');
  } catch (error) {
    console.error('❌ Error creating index.css:', error);
  }
}

console.log('\n✅ Tailwind CSS configuration complete!');
console.log('\nNext steps:');
console.log('1. Make sure to import the CSS file in your main component');
console.log('2. Run `npm run dev:client` to start the development server');
