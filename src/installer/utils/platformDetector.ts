// Platform detection utilities
import colors from "colors";

export type Platform = "darwin" | "win32" | "unsupported";

export interface PlatformInfo {
  type: Platform;
  displayName: string;
  isSupported: boolean;
  requiresSudo: boolean;
}

export function detectPlatform(): PlatformInfo {
  const platform = process.platform;

  switch (platform) {
    case "darwin":
      return {
        type: "darwin",
        displayName: "macOS",
        isSupported: true,
        requiresSudo: true,
      };

    case "win32":
      return {
        type: "win32",
        displayName: "Windows",
        isSupported: true,
        requiresSudo: false,
      };

    default:
      return {
        type: "unsupported",
        displayName: platform,
        isSupported: false,
        requiresSudo: false,
      };
  }
}

export function checkSudoPrivileges(): boolean {
  // Check if running with sudo (SUDO_USER environment variable is set when running with sudo)
  // or if running as root (uid 0)
  return !!(process.env.SUDO_USER || process.getuid?.() === 0);
}

export function requireSudo(platformInfo: PlatformInfo): void {
  if (!platformInfo.requiresSudo) {
    return;
  }

  if (!checkSudoPrivileges()) {
    console.error(colors.red("❌ Error: This installer requires administrator privileges on macOS.\n"));
    console.error(colors.yellow("Please run with sudo:"));
    console.error(colors.yellow("  sudo node install-bridge.js"));
    console.error(colors.yellow("or"));
    console.error(colors.yellow("  sudo npm run install-bridge\n"));
    console.error(colors.yellow("This is required to copy files to the After Effects application directory."));
    process.exit(1);
  }

  console.log(colors.green("✅ Running with administrator privileges\n"));
}
