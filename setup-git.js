
// This script sets up Git to use your GitHub token from Replit Secrets
import { execSync } from 'child_process';

// Get the GitHub token from Replit Secrets
const githubToken = process.env.GITHUB_TOKEN;

if (!githubToken) {
  console.error('❌ GitHub token not found in Secrets!');
  console.error('Please make sure you have a secret named GITHUB_TOKEN in your Replit Secrets.');
  process.exit(1);
}

try {
  // Configure Git to use the token for HTTPS authentication
  console.log('🔐 Setting up Git credentials with GitHub token...');
  
  // Set Git configuration to store credentials
  execSync('git config --global credential.helper store');
  
  // Create .git-credentials file with the token
  const gitCredentials = `https://oauth2:${githubToken}@github.com\n`;
  execSync(`echo "${gitCredentials}" > ~/.git-credentials`);
  
  // Set Git user information if not already set
  try {
    execSync('git config --get user.name');
  } catch (e) {
    execSync('git config --global user.name "Replit User"');
    console.log('✅ Set default Git user.name');
  }
  
  try {
    execSync('git config --get user.email');
  } catch (e) {
    execSync('git config --global user.email "user@replit.com"');
    console.log('✅ Set default Git user.email');
  }
  
  console.log('✅ Git credentials setup complete!');
  console.log('🚀 You can now use Git commands with your GitHub token.');
} catch (error) {
  console.error('❌ Error setting up Git credentials:', error.message);
  process.exit(1);
}
