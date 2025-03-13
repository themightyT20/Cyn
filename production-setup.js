// Production setup script for Railway deployment
// Ensures the correct directory structure and copies necessary files

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Running production setup...');

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`📁 Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

// Simple recursive directory copy function
function copyDir(src, dest) {
  try {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        ensureDirectoryExists(destPath);
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    return true;
  } catch (err) {
    console.error(`❌ Error copying directory from ${src} to ${dest}:`, err.message);
    return false;
  }
}

// Function to list all files in a directory (for debugging)
function listFiles(dir, indent = '') {
  if (!fs.existsSync(dir)) {
    console.log(`${indent}📂 Directory does not exist: ${dir}`);
    return;
  }
  
  console.log(`${indent}📂 ${dir}`);
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    if (file.isDirectory()) {
      listFiles(path.join(dir, file.name), `${indent}  `);
    } else {
      console.log(`${indent}  📄 ${file.name}`);
    }
  }
}

// Check our environment
const isRailway = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_SERVICE_ID;
const isProd = process.env.NODE_ENV === 'production';

console.log(`🌐 Environment: ${isProd ? 'Production' : 'Development'}`);
console.log(`🚂 Railway detected: ${isRailway ? 'Yes' : 'No'}`);

// Get the application root and public directories
const appRoot = __dirname;
const publicDir = path.resolve(appRoot, 'public');
const distDir = path.resolve(appRoot, 'dist');
const distPublicDir = path.resolve(distDir, 'public');

// Only run in production or on Railway
if (isProd || isRailway) {
  console.log('🔨 Setting up production environment...');
  
  // Make sure dist directory exists
  ensureDirectoryExists(distDir);
  
  // Make sure uploads directory exists
  const uploadsDir = path.resolve(appRoot, 'uploads');
  ensureDirectoryExists(uploadsDir);
  
  // Make sure training data directories exist
  const trainingDataDir = path.resolve(appRoot, 'training-data');
  ensureDirectoryExists(trainingDataDir);
  
  const voiceSamplesDir = path.resolve(trainingDataDir, 'voice-samples');
  ensureDirectoryExists(voiceSamplesDir);
  
  // Also ensure these directories exist in dist
  const distTrainingDataDir = path.resolve(distDir, 'training-data');
  ensureDirectoryExists(distTrainingDataDir);
  
  const distVoiceSamplesDir = path.resolve(distTrainingDataDir, 'voice-samples');
  ensureDirectoryExists(distVoiceSamplesDir);
  
  // Create public directory in dist if it doesn't exist
  const createdPublic = ensureDirectoryExists(distPublicDir);
  
  // Copy public files if they exist
  if (fs.existsSync(publicDir)) {
    console.log(`📋 Copying files from ${publicDir} to ${distPublicDir}`);
    const copySuccess = copyDir(publicDir, distPublicDir);
    
    if (copySuccess) {
      console.log('✅ Public files copied successfully');
    } else {
      console.warn('⚠️ Failed to copy some public files');
    }
  } else {
    console.warn(`⚠️ Public directory ${publicDir} not found - skipping copy`);
  }
  
  // Copy training data files if they exist
  if (fs.existsSync(trainingDataDir)) {
    console.log(`📋 Copying training data from ${trainingDataDir} to ${distTrainingDataDir}`);
    const copyTrainingSuccess = copyDir(trainingDataDir, distTrainingDataDir);
    
    if (copyTrainingSuccess) {
      console.log('✅ Training data copied successfully');
    } else {
      console.warn('⚠️ Failed to copy some training data files');
    }
  } else {
    console.warn(`⚠️ Training data directory ${trainingDataDir} not found - skipping copy`);
  }
  
  // Copy cyn-training-data.json if it exists
  const cynTrainingDataPath = path.resolve(appRoot, 'cyn-training-data.json');
  const distCynTrainingDataPath = path.resolve(distDir, 'cyn-training-data.json');
  const serverDistDir = path.resolve(distDir, 'server');
  
  // Ensure server directory exists
  ensureDirectoryExists(serverDistDir);
  
  if (fs.existsSync(cynTrainingDataPath)) {
    try {
      fs.copyFileSync(cynTrainingDataPath, distCynTrainingDataPath);
      console.log('✅ Copied cyn-training-data.json successfully');
    } catch (err) {
      console.warn('⚠️ Failed to copy cyn-training-data.json:', err.message);
    }
  } else {
    console.warn('⚠️ cyn-training-data.json not found - skipping copy');
  }
  
  // List the directory structure for debugging
  console.log('📊 Final directory structure:');
  listFiles(distDir);
  
  // Make sure dist/uploads directory exists and is writable
  const distUploadsDir = path.resolve(distDir, 'uploads');
  ensureDirectoryExists(distUploadsDir);
  
  const distUploadVoicesDir = path.resolve(distUploadsDir, 'voice-samples');
  ensureDirectoryExists(distUploadVoicesDir);
  
  // Fix any potential permissions issues
  try {
    console.log('🔒 Setting permissions...');
    execSync(`chmod -R 755 ${distDir}`);
    execSync(`chmod -R 777 ${distUploadsDir}`); // Make uploads writable
    console.log('✅ Permissions set successfully');
  } catch (err) {
    console.warn('⚠️ Failed to set permissions:', err.message);
  }
  
  console.log('✅ Production setup complete');
} else {
  console.log('ℹ️ Skipping production setup in development environment');
}