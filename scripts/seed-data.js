#!/usr/bin/env node

/**
 * Seed script for development data
 * This script populates the database with sample data for development
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const readline = require('readline');

// Connection URL
const mongoURI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/packsafe';

// Sample data
const users = [
  {
    email: 'admin@example.com',
    password: hashPassword('adminpassword'),
    name: 'Admin User',
    role: 'admin',
  },
  {
    email: 'user@example.com',
    password: hashPassword('userpassword'),
    name: 'Regular User',
    role: 'user',
  },
];

const projects = [
  {
    name: 'Sample Web App',
    description: 'A demo React application',
    packageJsonPath: '/path/to/package.json',
    ownerId: null, // Will be set during seeding
  },
  {
    name: 'API Service',
    description: 'Node.js REST API',
    packageJsonPath: '/path/to/api/package.json',
    ownerId: null, // Will be set during seeding
  },
];

const packages = [
  {
    name: 'react',
    version: '18.2.0',
    description: 'React is a JavaScript library for building user interfaces.',
    latestVersion: '18.2.0',
    author: 'Facebook',
    license: 'MIT',
    deprecated: false,
    homepage: 'https://reactjs.org',
  },
  {
    name: 'express',
    version: '4.18.2',
    description: 'Fast, unopinionated, minimalist web framework',
    latestVersion: '4.18.2',
    author: 'TJ Holowaychuk',
    license: 'MIT',
    deprecated: false,
    homepage: 'http://expressjs.com/',
  },
  {
    name: 'lodash',
    version: '4.17.20',
    description: 'Lodash modular utilities.',
    latestVersion: '4.17.21',
    author: 'John-David Dalton',
    license: 'MIT',
    deprecated: false,
    homepage: 'https://lodash.com/',
  },
];

const vulnerabilities = [
  {
    packageName: 'lodash',
    affectedVersions: '<=4.17.20',
    fixedVersion: '4.17.21',
    severity: 'high',
    description: 'Prototype Pollution in lodash',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-23337'],
    cveId: 'CVE-2021-23337',
    publishedAt: new Date('2021-02-15'),
  },
];

// Utility functions
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return { salt, hash };
}

// Confirm with user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  'This will seed the database with sample data. Are you sure? (y/n) ',
  async answer => {
    if (answer.toLowerCase() === 'y') {
      try {
        // Connect to the database
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // Load models (adjust paths as needed)
        const { User } = require('../packages/server/src/models/User');
        const { Project } = require('../packages/server/src/models/Project');
        const { Package } = require('../packages/server/src/models/Package');
        const {
          Vulnerability,
        } = require('../packages/server/src/models/Vulnerability');

        // Clear existing data
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Project.deleteMany({});
        await Package.deleteMany({});
        await Vulnerability.deleteMany({});

        // Insert users
        console.log('Creating users...');
        const createdUsers = await User.insertMany(users);

        // Set owner IDs for projects
        projects[0].ownerId = createdUsers[0]._id;
        projects[1].ownerId = createdUsers[1]._id;

        // Insert projects
        console.log('Creating projects...');
        const createdProjects = await Project.insertMany(projects);

        // Insert packages
        console.log('Creating packages...');
        const createdPackages = await Package.insertMany(packages);

        // Insert vulnerabilities
        console.log('Creating vulnerabilities...');
        await Vulnerability.insertMany(vulnerabilities);

        // Add packages to projects
        console.log('Adding packages to projects...');
        await Project.findByIdAndUpdate(createdProjects[0]._id, {
          $push: {
            dependencies: {
              package: createdPackages[0]._id,
              version: '18.2.0',
              isDev: false,
            },
            dependencies: {
              package: createdPackages[2]._id,
              version: '4.17.20',
              isDev: false,
            },
          },
        });

        await Project.findByIdAndUpdate(createdProjects[1]._id, {
          $push: {
            dependencies: {
              package: createdPackages[1]._id,
              version: '4.18.2',
              isDev: false,
            },
          },
        });

        console.log('Seed data created successfully!');
        console.log('\nSample Credentials:');
        console.log('Admin: admin@example.com / adminpassword');
        console.log('User: user@example.com / userpassword');
      } catch (error) {
        console.error('Error seeding database:', error);
      } finally {
        await mongoose.disconnect();
        rl.close();
      }
    } else {
      console.log('Seed operation cancelled.');
      rl.close();
    }
  }
);
