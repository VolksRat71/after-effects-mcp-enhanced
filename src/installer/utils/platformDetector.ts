// Platform detection utilities
import * as os from "os";

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
    console.error("❌ Error: This installer requires administrator privileges on macOS.\n");
    console.error("Please run with sudo:");
    console.error("  sudo node install-bridge.js");
    console.error("or");
    console.error("  sudo npm run install-bridge\n");
    console.error("This is required to copy files to the After Effects application directory.");
    process.exit(1);
  }

  console.log("✅ Running with administrator privileges\n");
}