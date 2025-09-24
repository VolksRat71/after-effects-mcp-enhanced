// install-bridge.js
// Script to install the After Effects MCP Bridge to the ScriptUI Panels folder
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import sudo from 'sudo-prompt';

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves After Effects installation paths based on the operating system
 */
function resolveAfterEffectsPaths() {
  const platform = process.platform;

  if (platform === 'win32') {
    return resolveWindowsPaths();
  } else if (platform === 'darwin') {
    return resolveMacOSPaths();
  } else {
    throw new Error(`Unsupported platform: ${platform}. Only Windows and macOS are supported.`);
  }
}

/**
 * Resolves After Effects paths on Windows
 */
function resolveWindowsPaths() {
  const possiblePaths = [
    'C:\\Program Files\\Adobe\\Adobe After Effects 2025',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2024',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2023',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2022',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2021',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2020',
    'C:\\Program Files (x86)\\Adobe\\Adobe After Effects CS6',
    'C:\\Program Files (x86)\\Adobe\\Adobe After Effects CC'
  ];

  for (const aePath of possiblePaths) {
    const exePath = path.join(aePath, 'Support Files', 'AfterFX.exe');
    if (fs.existsSync(exePath)) {
      return {
        appPath: aePath,
        scriptsFolder: path.join(aePath, 'Support Files', 'Scripts'),
        scriptUIFolder: path.join(aePath, 'Support Files', 'Scripts', 'ScriptUI Panels')
      };
    }
  }

  // Check environment variable
  const adobePath = process.env.ADOBE_AFTER_EFFECTS_PATH;
  if (adobePath && fs.existsSync(path.join(adobePath, 'Support Files', 'AfterFX.exe'))) {
    return {
      appPath: adobePath,
      scriptsFolder: path.join(adobePath, 'Support Files', 'Scripts'),
      scriptUIFolder: path.join(adobePath, 'Support Files', 'Scripts', 'ScriptUI Panels')
    };
  }

  return null;
}

/**
 * Resolves After Effects paths on macOS
 */
function resolveMacOSPaths() {
  // On macOS, scripts should be installed in the application's Scripts folder
  // not the user's Documents folder for better reliability

  // Try standard application locations
  const possibleAppPaths = [
    '/Applications/Adobe After Effects 2025',
    '/Applications/Adobe After Effects 2024',
    '/Applications/Adobe After Effects 2023',
    '/Applications/Adobe After Effects 2022',
    '/Applications/Adobe After Effects 2021',
    '/Applications/Adobe After Effects 2020'
  ];

  for (const appPath of possibleAppPaths) {
    // Check if the app directory exists (not the .app bundle)
    if (fs.existsSync(appPath)) {
      // Check for Scripts folder in the application directory
      const scriptsFolder = path.join(appPath, 'Scripts');
      const scriptUIFolder = path.join(scriptsFolder, 'ScriptUI Panels');

      if (fs.existsSync(scriptsFolder)) {
        return {
          appPath: appPath,
          scriptsFolder: scriptsFolder,
          scriptUIFolder: scriptUIFolder
        };
      }
    }
  }

  return null;
}

/**
 * Copies file with appropriate permissions
 */
async function copyFileWithPermissions(source, destination) {
  const platform = process.platform;

  try {
    // Create directory if it doesn't exist
    const destDir = path.dirname(destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (platform === 'win32') {
      // On Windows, try PowerShell with elevated privileges
      const command = `
        Start-Process PowerShell -Verb RunAs -ArgumentList "-Command Copy-Item -Path '${source.replace(/\\/g, '\\\\')}' -Destination '${destination.replace(/\\/g, '\\\\')}' -Force"
      `;

      try {
        execSync(`powershell -Command "${command}"`, { stdio: 'inherit' });
        return true;
      } catch (error) {
        // Fallback to regular copy
        console.log('Admin elevation cancelled or failed, trying regular copy...');
        fs.copyFileSync(source, destination);
        return true;
      }
    } else if (platform === 'darwin') {
      // On macOS, the application Scripts folder needs admin permissions
      console.log('\n🔐 macOS requires administrator privileges to install to After Effects.');
      console.log('   A native password prompt will appear...\n');

      return new Promise((resolve) => {
        const destDir = path.dirname(destination);

        // Create command to make directory and copy file
        const command = `mkdir -p "${destDir}" && cp -f "${source}" "${destination}" && chmod 644 "${destination}"`;

        const options = {
          name: 'After Effects MCP Bridge Installer',
          // icns parameter is optional, will use default if not found
        };

        sudo.exec(command, options, (error, stdout, stderr) => {
          if (error) {
            if (error.message.includes('User did not grant permission') || error.message.includes('cancelled')) {
              console.log('\n❌ Installation cancelled by user.');
              console.log('\nTo install manually or retry:');
              console.log(`  sudo npm run install-bridge`);
              console.log('\nOr manually copy the file:');
              console.log(`  sudo cp "${source}" "${destination}"`);
              resolve(false);
            } else {
              console.error('\n❌ Installation failed:', error.message);
              console.log('\nAlternative installation methods:');
              console.log('1. Run with sudo:');
              console.log(`   sudo npm run install-bridge`);
              console.log('\n2. Manual copy with sudo:');
              console.log(`   sudo cp "${source}" "${destination}"`);
              console.log('\n3. Use Finder:');
              console.log('   - Navigate to the source file');
              console.log('   - Copy it manually to the After Effects Scripts folder');
              resolve(false);
            }
          } else {
            console.log('✅ Administrator access granted and file copied successfully.');
            if (stdout) console.log('Output:', stdout);
            resolve(true);
          }
        });
      });
    }
  } catch (error) {
    console.error(`Error copying file: ${error.message}`);
    return false;
  }
}

// Main installation logic
async function main() {
  console.log('=== After Effects MCP Bridge Installer ===\n');
  console.log(`Platform: ${process.platform === 'darwin' ? 'macOS' : 'Windows'}\n`);

  // Define source script path
  const sourceScript = path.join(__dirname, 'build', 'scripts', 'mcp-bridge-auto.jsx');

  // Ensure source script exists
  if (!fs.existsSync(sourceScript)) {
    console.error(`Error: Source script not found at ${sourceScript}`);
    console.error('Please run "npm run build" first to generate the script.');
    process.exit(1);
  }

  // Find After Effects installation
  const aePaths = resolveAfterEffectsPaths();

  if (!aePaths) {
    console.error('Error: Could not find After Effects installation.');
    console.error('\nPlease ensure After Effects is installed, or set the ADOBE_AFTER_EFFECTS_PATH environment variable.');

    if (process.platform === 'darwin') {
      console.error('\nOn macOS, make sure you have run After Effects at least once to create the Scripts folder.');
      console.error('Expected location: ~/Documents/Adobe/After Effects [VERSION]/Scripts/');
    } else {
      console.error('\nExpected locations:');
      console.error('  C:\\Program Files\\Adobe\\Adobe After Effects [VERSION]\\');
    }
    process.exit(1);
  }

  console.log(`Found After Effects at: ${aePaths.appPath}`);
  console.log(`Scripts folder: ${aePaths.scriptsFolder}`);
  console.log(`ScriptUI Panels folder: ${aePaths.scriptUIFolder}\n`);

  // Define destination path
  const destinationScript = path.join(aePaths.scriptUIFolder, 'mcp-bridge-auto.jsx');

  // Copy the script
  console.log(`Installing bridge script to ${destinationScript}...`);

  const success = await copyFileWithPermissions(sourceScript, destinationScript);

  if (success) {
    console.log('\n✅ Bridge script installed successfully!\n');
    console.log('Important next steps:');
    console.log('1. Open After Effects');
    console.log('2. Go to Edit > Preferences > Scripting & Expressions (Windows) or');
    console.log('   After Effects > Settings > Scripting & Expressions (macOS)');
    console.log('3. Enable "Allow Scripts to Write Files and Access Network"');
    console.log('4. Restart After Effects');
    console.log('5. Open the bridge panel: Window > mcp-bridge-auto.jsx');

    if (process.platform === 'darwin') {
      console.log('\nNote: On macOS, if you get permission errors when the script runs,');
      console.log('you may need to grant After Effects full disk access in System Settings.');
    }
  } else {
    console.error('\n❌ Installation failed.');
    console.error('\nPlease try manual installation:');
    console.error(`1. Copy: ${sourceScript}`);
    console.error(`2. To: ${destinationScript}`);

    if (process.platform === 'win32') {
      console.error('3. You may need to run as administrator or use File Explorer with admin rights');
    } else {
      console.error('3. Make sure the Scripts folder exists and you have write permissions');
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});