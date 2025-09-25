// Main installer orchestrator
import * as path from "path";
import { fileURLToPath } from "url";
import { detectPlatform, requireSudo } from "./utils/platformDetector.js";
import { PathResolver } from "./utils/pathResolver.js";
import { FileOperations } from "./utils/fileOperations.js";
import { MacOSInstaller } from "./platforms/macOSInstaller.js";
import { WindowsInstaller } from "./platforms/windowsInstaller.js";

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BridgeInstaller {
  private sourceScript: string;

  constructor() {
    // Path to the built bridge script
    this.sourceScript = path.join(__dirname, "..", "..", "build", "scripts", "mcp-bridge-auto.jsx");
  }

  /**
   * Main installation method
   */
  async install(): Promise<void> {
    console.log("=== After Effects MCP Bridge Installer ===\n");

    // Detect platform
    const platform = detectPlatform();
    console.log(`Platform: ${platform.displayName}\n`);

    // Check if platform is supported
    if (!platform.isSupported) {
      console.error(`Error: ${platform.displayName} is not supported. Only Windows and macOS are supported.`);
      process.exit(1);
    }

    // Check for sudo privileges if required
    requireSudo(platform);

    // Validate source file exists
    FileOperations.validateSourceFile(this.sourceScript);

    // Find After Effects installation
    const aePaths = PathResolver.resolve();

    if (!aePaths) {
      console.error(PathResolver.getNotFoundMessage());
      process.exit(1);
    }

    console.log(`Found After Effects at: ${aePaths.appPath}`);
    console.log(`Scripts folder: ${aePaths.scriptsFolder}`);
    console.log(`ScriptUI Panels folder: ${aePaths.scriptUIFolder}\n`);

    // Install based on platform
    let success = false;

    if (platform.type === "darwin") {
      success = await MacOSInstaller.install(this.sourceScript, aePaths);
    } else if (platform.type === "win32") {
      success = await WindowsInstaller.install(this.sourceScript, aePaths);
    }

    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  }

  /**
   * Static method to run the installer
   */
  static async run(): Promise<void> {
    const installer = new BridgeInstaller();
    await installer.install();
  }
}