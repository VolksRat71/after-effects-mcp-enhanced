/**
 * Batch command queue types for processing multiple After Effects commands
 */

/**
 * Individual command in a batch
 */
export interface BatchCommand {
  commandId: string;
  tool: string;
  args: Record<string, any>;
}

/**
 * Batch of commands to be processed
 */
export interface CommandBatch {
  batchId: string;
  timestamp: string;
  commands: BatchCommand[];
}

/**
 * Progress information for batch processing
 */
export interface BatchProgress {
  completed: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining?: string;
  currentCommand?: string;
}

/**
 * Individual command result
 */
export interface CommandResult {
  commandId: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Batch processing result
 */
export interface BatchResult {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: BatchProgress;
  results: CommandResult[];
  startTime?: string;
  endTime?: string;
}

/**
 * Helper to create a batch from single or multiple commands
 */
export function createBatch(commands: BatchCommand | BatchCommand[]): CommandBatch {
  const commandArray = Array.isArray(commands) ? commands : [commands];
  return {
    batchId: `batch_${Date.now()}`,
    timestamp: new Date().toISOString(),
    commands: commandArray
  };
}

/**
 * Helper to create initial batch result
 */
export function createBatchResult(batch: CommandBatch): BatchResult {
  return {
    batchId: batch.batchId,
    status: 'pending',
    progress: {
      completed: 0,
      total: batch.commands.length,
      percentage: 0
    },
    results: [],
    startTime: new Date().toISOString()
  };
}

/**
 * Helper to update batch progress
 */
export function updateBatchProgress(
  result: BatchResult,
  completedCount: number,
  currentCommand?: string,
  avgTimePerCommand?: number
): BatchResult {
  const remaining = result.progress.total - completedCount;
  const percentage = Math.round((completedCount / result.progress.total) * 100);

  let estimatedTimeRemaining: string | undefined;
  if (avgTimePerCommand && remaining > 0) {
    const secondsRemaining = Math.ceil(remaining * avgTimePerCommand);
    estimatedTimeRemaining = secondsRemaining > 60
      ? `${Math.ceil(secondsRemaining / 60)}m`
      : `${secondsRemaining}s`;
  }

  return {
    ...result,
    status: completedCount === result.progress.total ? 'completed' : 'processing',
    progress: {
      completed: completedCount,
      total: result.progress.total,
      percentage,
      estimatedTimeRemaining,
      currentCommand
    },
    endTime: completedCount === result.progress.total ? new Date().toISOString() : result.endTime
  };
}
