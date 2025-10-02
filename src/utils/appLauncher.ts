// After Effects application launcher utility
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import colors from 'colors';

export interface LaunchOptions {
  /** Wait for the process to exit before returning */
  wait?: boolean;
  /** Open a specific project file */
  projectPath?: string;
  /** Run in headless/render-only mode (if supported) */
  headless?: boolean;
  /** Additional command-line arguments */
  args?: string[];
}

export interface LaunchResult {
  success: boolean;
  message: string;
  pid?: number;
  error?: string;
}

export class AfterEffectsLauncher {
  /**
   * Launches After Effects on the current platform
   */
  static launch(options: LaunchOptions = {}): LaunchResult {
    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        return this.launchMacOS(options);
      } else if (platform === 'win32') {
        return this.launchWindows(options);
      } else {
        return {
          success: false,
          message: `Unsupported platform: ${platform}`,
          error: 'Only Windows and macOS are supported',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to launch After Effects',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Launches After Effects on macOS
   */
  private static launchMacOS(options: LaunchOptions): LaunchResult {
    // Find After Effects installation
    const possiblePaths = [
      '/Applications/Adobe After Effects 2025/Adobe After Effects 2025.app',
      '/Applications/Adobe After Effects 2024/Adobe After Effects 2024.app',
      '/Applications/Adobe After Effects 2023/Adobe After Effects 2023.app',
      '/Applications/Adobe After Effects 2022/Adobe After Effects 2022.app',
      '/Applications/Adobe After Effects 2021/Adobe After Effects 2021.app',
      '/Applications/Adobe After Effects 2020/Adobe After Effects 2020.app',
    ];

    let appPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        appPath = p;
        break;
      }
    }

    if (!appPath) {
      return {
        success: false,
        message: 'After Effects not found',
        error: 'Could not locate After Effects.app in /Applications',
      };
    }

    // Build command
    const args: string[] = [];

    if (options.projectPath) {
      args.push(options.projectPath);
    }

    if (options.args) {
      args.push(...options.args);
    }

    try {
      if (options.wait) {
        // Use execSync with open command
        const cmd = `open -W "${appPath}"${args.length > 0 ? ` ${args.join(' ')}` : ''}`;
        execSync(cmd);
        return {
          success: true,
          message: 'After Effects launched and exited',
        };
      } else {
        // Use spawn for non-blocking launch
        const openArgs = ['-a', appPath];
        if (args.length > 0) {
          openArgs.push('--args', ...args);
        }

        const child = spawn('open', openArgs, {
          detached: true,
          stdio: 'ignore',
        });

        child.unref();

        return {
          success: true,
          message: `After Effects launched successfully from ${appPath}`,
          pid: child.pid,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to launch After Effects',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Launches After Effects on Windows
   */
  private static launchWindows(options: LaunchOptions): LaunchResult {
    // Find After Effects installation
    const possiblePaths = [
      'C:\\Program Files\\Adobe\\Adobe After Effects 2025\\Support Files\\AfterFX.exe',
      'C:\\Program Files\\Adobe\\Adobe After Effects 2024\\Support Files\\AfterFX.exe',
      'C:\\Program Files\\Adobe\\Adobe After Effects 2023\\Support Files\\AfterFX.exe',
      'C:\\Program Files\\Adobe\\Adobe After Effects 2022\\Support Files\\AfterFX.exe',
      'C:\\Program Files\\Adobe\\Adobe After Effects 2021\\Support Files\\AfterFX.exe',
      'C:\\Program Files\\Adobe\\Adobe After Effects 2020\\Support Files\\AfterFX.exe',
      'C:\\Program Files (x86)\\Adobe\\Adobe After Effects CS6\\Support Files\\AfterFX.exe',
      'C:\\Program Files (x86)\\Adobe\\Adobe After Effects CC\\Support Files\\AfterFX.exe',
    ];

    let exePath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        exePath = p;
        break;
      }
    }

    // Check environment variable as fallback
    if (!exePath) {
      const adobePath = process.env.ADOBE_AFTER_EFFECTS_PATH;
      if (adobePath) {
        const envExePath = path.join(adobePath, 'Support Files', 'AfterFX.exe');
        if (fs.existsSync(envExePath)) {
          exePath = envExePath;
        }
      }
    }

    if (!exePath) {
      return {
        success: false,
        message: 'After Effects not found',
        error: 'Could not locate AfterFX.exe. Set ADOBE_AFTER_EFFECTS_PATH environment variable if installed in a non-standard location.',
      };
    }

    // Build command arguments
    const args: string[] = [];

    if (options.projectPath) {
      args.push(`"${options.projectPath}"`);
    }

    if (options.args) {
      args.push(...options.args);
    }

    try {
      if (options.wait) {
        // Use execSync for blocking execution
        execSync(`"${exePath}" ${args.join(' ')}`, {
          stdio: 'inherit',
        });
        return {
          success: true,
          message: 'After Effects launched and exited',
        };
      } else {
        // Use spawn for non-blocking launch
        const child = spawn(exePath, args, {
          detached: true,
          stdio: 'ignore',
          shell: true,
        });

        child.unref();

        return {
          success: true,
          message: `After Effects launched successfully from ${exePath}`,
          pid: child.pid,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to launch After Effects',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if After Effects is currently running
   */
  static isRunning(): boolean {
    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        const result = execSync('pgrep -x "After Effects"', { encoding: 'utf-8' });
        return result.trim().length > 0;
      } else if (platform === 'win32') {
        const result = execSync('tasklist /FI "IMAGENAME eq AfterFX.exe" /NH', { encoding: 'utf-8' });
        return result.toLowerCase().includes('afterfx.exe');
      }
    } catch {
      // pgrep/tasklist returns non-zero if process not found
      return false;
    }

    return false;
  }

  /**
   * Prints usage information
   */
  static printUsage(): void {
    console.log(colors.cyan('\n=== After Effects Launcher ===\n'));
    console.log('Usage examples:');
    console.log(colors.yellow('  Launch After Effects:'));
    console.log('    AfterEffectsLauncher.launch()');
    console.log(colors.yellow('\n  Launch with a project:'));
    console.log('    AfterEffectsLauncher.launch({ projectPath: "/path/to/project.aep" })');
    console.log(colors.yellow('\n  Launch and wait for exit:'));
    console.log('    AfterEffectsLauncher.launch({ wait: true })');
    console.log(colors.yellow('\n  Check if running:'));
    console.log('    AfterEffectsLauncher.isRunning()');
    console.log();
  }
}
