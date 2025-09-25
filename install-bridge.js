#!/usr/bin/env node

// Simplified bridge installer - uses modular TypeScript installer
import { BridgeInstaller } from "./build/installer/installer.js";

// Run the installer
BridgeInstaller.run().catch((error) => {
  console.error(`[MCP INSTALLER] Fatal error: ${error}`);
  process.exit(1);
});
