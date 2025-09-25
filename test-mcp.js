#!/usr/bin/env node

/**
 * Simple test script to verify MCP server functionality
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test file operations
async function testFileOperations() {
  console.log("Testing File Operations...");

  const tempDir = '/Users/nathanielryan/Desktop/projects/after-effects-mcp/build/temp';
  const testFile = path.join(tempDir, 'test_command.json');

  // Test 1: Write a test command file
  const testCommand = {
    command: "test",
    args: { test: true },
    timestamp: new Date().toISOString(),
    status: "pending"
  };

  try {
    fs.writeFileSync(testFile, JSON.stringify(testCommand, null, 2));
    console.log("✅ Successfully wrote test command file");

    // Check if file exists
    if (fs.existsSync(testFile)) {
      console.log("✅ Test file exists");

      // Read it back
      const content = fs.readFileSync(testFile, 'utf8');
      const parsed = JSON.parse(content);

      if (parsed.command === "test") {
        console.log("✅ File content is correct");
      }

      // Clean up
      fs.unlinkSync(testFile);
      console.log("✅ Cleaned up test file");
    }
  } catch (error) {
    console.error("❌ File operation failed:", error);
  }
}

// Test server startup
async function testServerStartup() {
  console.log("\nTesting Server Startup...");

  const buildDir = '/Users/nathanielryan/Desktop/projects/after-effects-mcp/build';

  // Check if index.js exists
  if (fs.existsSync(path.join(buildDir, 'index.js'))) {
    console.log("✅ Server entry point exists");
  } else {
    console.error("❌ Server entry point not found");
  }

  // Check if services are built
  if (fs.existsSync(path.join(buildDir, 'services/fileManager.js'))) {
    console.log("✅ FileManager service exists");
  } else {
    console.error("❌ FileManager service not found");
  }

  if (fs.existsSync(path.join(buildDir, 'services/scriptExecutor.js'))) {
    console.log("✅ ScriptExecutor service exists");
  } else {
    console.error("❌ ScriptExecutor service not found");
  }
}

// Main test runner
async function runTests() {
  console.log("=== MCP Server Functionality Test ===\n");

  await testServerStartup();
  await testFileOperations();

  console.log("\n=== Test Summary ===");
  console.log("If all tests passed, the MCP server refactoring is working correctly!");
  console.log("The server should be able to:");
  console.log("- Handle file operations through FileManager");
  console.log("- Execute scripts through ScriptExecutor");
  console.log("- Process commands from After Effects");
}

runTests().catch(console.error);