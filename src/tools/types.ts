import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Base interface for all MCP tools
 */
export interface Tool {
  name: string;
  description: string;
  inputSchema?: z.ZodType<any>;
  handler: (params: any) => Promise<any>;
}

/**
 * Tool registration function type
 */
export type ToolRegistrar = (server: McpServer, context: ToolContext) => void;

/**
 * Context passed to tools for accessing services
 */
export interface ToolContext {
  fileManager: any; // Will be properly typed when we import
  scriptExecutor: any;
  historyManager: any;
  tiffConverter: any;
  tempDir: string;
  scriptsDir: string;
}

/**
 * Standard tool response format
 */
export interface ToolResponse {
  content: Array<{
    type: "text";  // Must be literal "text" type
    text: string;
  }>;
  isError?: boolean;
}