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
  
  // Create public directory in dist if it doesn't exist
  const createdPublic = ensureDirectoryExists(distPublicDir);
  
  // Copy public files if they exist
  if (fs.existsSync(publicDir)) {
    console.log(`📋 Copying files from ${publicDir} to ${distPublicDir}`);
    const copySuccess = copyDir(publicDir, distPublicDir);
    
    if (copySuccess) {
      console.log('✅ Files copied successfully');
    } else {
      console.warn('⚠️ Failed to copy some files');
    }
  } else {
    console.warn(`⚠️ Public directory ${publicDir} not found - skipping copy`);
  }
  
  // List the directory structure for debugging
  console.log('📊 Final directory structure:');
  listFiles(distDir);
  
  // Fix any potential permissions issues
  try {
    console.log('🔒 Setting permissions...');
    execSync(`chmod -R 755 ${distDir}`);
    console.log('✅ Permissions set successfully');
  } catch (err) {
    console.warn('⚠️ Failed to set permissions:', err.message);
  }
  
  console.log('✅ Production setup complete');
} else {
  console.log('ℹ️ Skipping production setup in development environment');
}