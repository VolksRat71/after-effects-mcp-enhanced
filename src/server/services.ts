import { HistoryManager } from '../utils/historyManager.js';
import { initFileManager } from '../services/fileManager.js';
import { initScriptExecutor } from '../services/scriptExecutor.js';
import { getTiffConverter } from '../services/tiffConverter.js';
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
  const historyPath = `${paths.TEMP_DIR}/ae_command_history.json`;
  const historyManager = new HistoryManager(historyPath);
  const fileManager = initFileManager(paths.TEMP_DIR);
  const scriptExecutor = initScriptExecutor(paths.TEMP_DIR, paths.SCRIPTS_DIR);
  const tiffConverter = getTiffConverter();

  // Create and return tool context
  return {
    fileManager,
    scriptExecutor,
    historyManager,
    tiffConverter,
    tempDir: paths.TEMP_DIR,
    scriptsDir: paths.SCRIPTS_DIR
  };
}