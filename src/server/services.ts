import { HistoryManager } from '../utils/historyManager.js';
import { initFileManager } from '../services/fileManager.js';
import { initScriptExecutor } from '../services/scriptExecutor.js';
import { ToolContext } from '../tools/types.js';

interface PathConfig {
  SCRIPTS_DIR: string;
  TEMP_DIR: string;
  SRC_DIR: string;
}

/**
 * Initialize all services and return the tool context
 */
export function initializeServices(paths: PathConfig): ToolContext {
  // Initialize managers
  const historyManager = new HistoryManager();
  const fileManager = initFileManager(paths.TEMP_DIR);
  const scriptExecutor = initScriptExecutor(paths.TEMP_DIR, paths.SCRIPTS_DIR);

  // Create and return tool context
  return {
    fileManager,
    scriptExecutor,
    historyManager,
    tempDir: paths.TEMP_DIR,
    scriptsDir: paths.SCRIPTS_DIR
  };
}