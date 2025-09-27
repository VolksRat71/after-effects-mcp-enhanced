import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AEPaths {
  executable: string | null;
  scriptsFolder: string | null;
  scriptUIFolder: string | null;
}

/**
 * Detects the operating system and resolves After Effects paths
 */
export function resolveAfterEffectsPaths(): AEPaths {
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
function resolveWindowsPaths(): AEPaths {
  const possiblePaths = [
    'C:\\Program Files\\Adobe\\Adobe After Effects 2025',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2024',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2023',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2022',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2021',
    'C:\\Program Files\\Adobe\\Adobe After Effects 2020',
    // Also check Program Files (x86) for older versions
    'C:\\Program Files (x86)\\Adobe\\Adobe After Effects CS6',
    'C:\\Program Files (x86)\\Adobe\\Adobe After Effects CC'
  ];

  for (const aePath of possiblePaths) {
    const exePath = path.join(aePath, 'Support Files', 'AfterFX.exe');
    if (fs.existsSync(exePath)) {
      return {
        executable: exePath,
        scriptsFolder: path.join(aePath, 'Support Files', 'Scripts'),
        scriptUIFolder: path.join(aePath, 'Support Files', 'Scripts', 'ScriptUI Panels')
      };
    }
  }

  // Try to find via registry or environment variable if standard paths fail
  const adobePath = process.env.ADOBE_AFTER_EFFECTS_PATH;
  if (adobePath) {
    const exePath = path.join(adobePath, 'Support Files', 'AfterFX.exe');
    if (fs.existsSync(exePath)) {
      return {
        executable: exePath,
        scriptsFolder: path.join(adobePath, 'Support Files', 'Scripts'),
        scriptUIFolder: path.join(adobePath, 'Support Files', 'Scripts', 'ScriptUI Panels')
      };
    }
  }

  return {
    executable: null,
    scriptsFolder: null,
    scriptUIFolder: null
  };
}

/**
 * Resolves After Effects paths on macOS
 */
function resolveMacOSPaths(): AEPaths {
  const possiblePaths = [
    '/Applications/Adobe After Effects 2025',
    '/Applications/Adobe After Effects 2024',
    '/Applications/Adobe After Effects 2023',
    '/Applications/Adobe After Effects 2022',
    '/Applications/Adobe After Effects 2021',
    '/Applications/Adobe After Effects 2020',
    '/Applications/Adobe After Effects CC 2020',
    '/Applications/Adobe After Effects CC 2019',
    '/Applications/Adobe After Effects CC 2018',
    '/Applications/Adobe After Effects CC',
    // Some users might have it in a subfolder
    '/Applications/Adobe/Adobe After Effects 2025',
    '/Applications/Adobe/Adobe After Effects 2024',
    '/Applications/Adobe/Adobe After Effects 2023',
    '/Applications/Adobe Creative Cloud/Adobe After Effects 2025',
    '/Applications/Adobe Creative Cloud/Adobe After Effects 2024'
  ];

  // Try each possible app folder
  for (const aeFolder of possiblePaths) {
    // On macOS, the app is a .app bundle
    const appPath = `${aeFolder}/Adobe After Effects ${getVersionFromPath(aeFolder)}.app`;
    const altAppPath = `${aeFolder}.app`; // Sometimes it's just "Adobe After Effects 2024.app"

    let finalAppPath: string | null = null;

    if (fs.existsSync(appPath)) {
      finalAppPath = appPath;
    } else if (fs.existsSync(altAppPath)) {
      finalAppPath = altAppPath;
    }

    if (finalAppPath) {
      // The actual executable is inside the .app bundle
      const exePath = path.join(finalAppPath, 'Contents', 'MacOS', 'After Effects');

      if (fs.existsSync(exePath)) {
        // Scripts folder location on macOS
        const homeDir = os.homedir();
        const scriptsFolder = path.join(homeDir, 'Documents', 'Adobe', 'After Effects', getVersionYear(aeFolder), 'Scripts');
        const scriptUIFolder = path.join(scriptsFolder, 'ScriptUI Panels');

        return {
          executable: exePath,
          scriptsFolder: scriptsFolder,
          scriptUIFolder: scriptUIFolder
        };
      }
    }
  }

  // Try to find using spotlight/mdfind command
  try {
    const { execSync } = require('child_process');
    const result = execSync('mdfind "kMDItemKind == Application && kMDItemDisplayName == *After Effects*"', { encoding: 'utf8' });
    const apps = result.trim().split('\n');

    for (const appPath of apps) {
      if (appPath.includes('After Effects') && appPath.endsWith('.app')) {
        const exePath = path.join(appPath, 'Contents', 'MacOS', 'After Effects');
        if (fs.existsSync(exePath)) {
          const homeDir = os.homedir();
          // Extract version from app path for scripts folder
          const version = extractVersionFromMacApp(appPath);
          const scriptsFolder = path.join(homeDir, 'Documents', 'Adobe', 'After Effects', version, 'Scripts');
          const scriptUIFolder = path.join(scriptsFolder, 'ScriptUI Panels');

          return {
            executable: exePath,
            scriptsFolder: scriptsFolder,
            scriptUIFolder: scriptUIFolder
          };
        }
      }
    }
  } catch (e) {
    // mdfind might not be available or might fail
    console.error('Could not use mdfind to locate After Effects:', e);
  }

  return {
    executable: null,
    scriptsFolder: null,
    scriptUIFolder: null
  };
}

/**
 * Helper function to extract version from path
 */
function getVersionFromPath(pathStr: string): string {
  const matches = pathStr.match(/\b(20\d{2}|CC\s*20\d{2}|CC|CS\d+)\b/);
  return matches ? matches[0] : '2025';
}

/**
 * Helper function to get version year for scripts folder
 */
function getVersionYear(pathStr: string): string {
  const matches = pathStr.match(/20\d{2}/);
  if (matches) return matches[0];

  // For CC versions, map to approximate year
  if (pathStr.includes('CC 2020')) return '2020';
  if (pathStr.includes('CC 2019')) return '2019';
  if (pathStr.includes('CC 2018')) return '2018';
  if (pathStr.includes('CC')) return '2018'; // Default CC to 2018

  return '2025'; // Default to latest
}

/**
 * Helper function to extract version from macOS app bundle
 */
function extractVersionFromMacApp(appPath: string): string {
  const basename = path.basename(appPath, '.app');
  const matches = basename.match(/20\d{2}/);
  return matches ? matches[0] : '2025';
}

/**
 * Gets the project's build/temp directory for communication with After Effects
 * Using a fixed location avoids permission issues with system temp directories
 */
export function getTempDir(): string {
  // Use a fixed directory in the user's projects folder
  // This avoids permission issues and makes debugging easier
  const projectTempDir = path.join(__dirname, '..', 'temp');

  // Create the directory if it doesn't exist
  if (!fs.existsSync(projectTempDir)) {
    try {
      fs.mkdirSync(projectTempDir, { recursive: true });
    } catch (e) {
      console.error('Could not create build/temp directory:', e);
      // Fallback to system temp if creation fails
      return os.tmpdir();
    }
  }

  return projectTempDir;
}

/**
 * Creates a cross-platform temp file path
 */
export function getTempFilePath(filename: string): string {
  return path.join(getTempDir(), filename);
}

/**
 * Validates that After Effects is installed and accessible
 */
export function validateAfterEffectsInstallation(): { valid: boolean; message: string } {
  const paths = resolveAfterEffectsPaths();

  if (!paths.executable) {
    return {
      valid: false,
      message: `After Effects executable not found. Please ensure After Effects is installed in a standard location, or set the ADOBE_AFTER_EFFECTS_PATH environment variable.`
    };
  }

  if (!fs.existsSync(paths.executable)) {
    return {
      valid: false,
      message: `After Effects executable not accessible at: ${paths.executable}`
    };
  }

  return {
    valid: true,
    message: `After Effects found at: ${paths.executable}`
  };
}