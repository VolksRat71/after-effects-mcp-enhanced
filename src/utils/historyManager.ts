import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface CommandHistoryEntry {
  id: string;
  timestamp: string;
  tool: string;
  parameters: Record<string, any>;
  result: 'success' | 'error' | 'pending';
  error?: string;
  duration?: number;
  response?: any;
}

interface CommandHistory {
  commands: CommandHistoryEntry[];
  session: {
    startTime: string;
    projectName?: string;
    commandCount: number;
  };
}

export class HistoryManager {
  private historyFilePath: string;
  private history!: CommandHistory; // Will be initialized in loadHistory
  private sessionStartTime: string;

  constructor(historyPath?: string) {
    // Use provided path or default to build/temp directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const tempDir = path.join(__dirname, '..', '..', 'temp');

    // Ensure build/temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    this.historyFilePath = historyPath || path.join(tempDir, 'ae_command_history.json');

    this.sessionStartTime = new Date().toISOString();
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const content = fs.readFileSync(this.historyFilePath, 'utf-8');
        this.history = JSON.parse(content);
        // Update session info for continued session
        this.history.session.commandCount = this.history.commands.length;
      } else {
        // Initialize new history
        this.history = {
          commands: [],
          session: {
            startTime: this.sessionStartTime,
            commandCount: 0
          }
        };
        this.saveHistory();
      }
    } catch (error) {
      console.error('Error loading command history:', error);
      // Initialize fresh if corrupted
      this.history = {
        commands: [],
        session: {
          startTime: this.sessionStartTime,
          commandCount: 0
        }
      };
    }
  }

  private saveHistory(): void {
    try {
      fs.writeFileSync(
        this.historyFilePath,
        JSON.stringify(this.history, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving command history:', error);
    }
  }

  public startCommand(tool: string, parameters: Record<string, any>): string {
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const entry: CommandHistoryEntry = {
      id: commandId,
      timestamp: new Date().toISOString(),
      tool,
      parameters,
      result: 'pending'
    };

    this.history.commands.push(entry);
    this.history.session.commandCount++;
    this.saveHistory();

    return commandId;
  }

  public completeCommand(
    commandId: string,
    result: 'success' | 'error',
    response?: any,
    error?: string
  ): void {
    const entry = this.history.commands.find(cmd => cmd.id === commandId);

    if (entry) {
      entry.result = result;
      entry.response = response;
      entry.error = error;

      // Calculate duration
      const startTime = new Date(entry.timestamp).getTime();
      entry.duration = Date.now() - startTime;

      this.saveHistory();
    }
  }

  public setProjectName(projectName: string): void {
    this.history.session.projectName = projectName;
    this.saveHistory();
  }

  public queryHistory(filter?: {
    tool?: string;
    timeRange?: { from: string; to: string };
    result?: 'success' | 'error' | 'pending';
    limit?: number;
  }): CommandHistoryEntry[] {
    let results = [...this.history.commands];

    if (filter) {
      if (filter.tool) {
        results = results.filter(cmd => cmd.tool === filter.tool);
      }

      if (filter.result) {
        results = results.filter(cmd => cmd.result === filter.result);
      }

      if (filter.timeRange) {
        const fromTime = new Date(filter.timeRange.from).getTime();
        const toTime = new Date(filter.timeRange.to).getTime();

        results = results.filter(cmd => {
          const cmdTime = new Date(cmd.timestamp).getTime();
          return cmdTime >= fromTime && cmdTime <= toTime;
        });
      }

      if (filter.limit) {
        results = results.slice(-filter.limit);
      }
    }

    return results;
  }

  public getStatistics(): {
    totalCommands: number;
    successCount: number;
    errorCount: number;
    pendingCount: number;
    averageDuration: number;
    mostUsedTools: { tool: string; count: number }[];
  } {
    const stats = {
      totalCommands: this.history.commands.length,
      successCount: 0,
      errorCount: 0,
      pendingCount: 0,
      totalDuration: 0,
      durationCount: 0
    };

    const toolCounts: Record<string, number> = {};

    for (const cmd of this.history.commands) {
      // Count results
      if (cmd.result === 'success') stats.successCount++;
      else if (cmd.result === 'error') stats.errorCount++;
      else stats.pendingCount++;

      // Track duration
      if (cmd.duration) {
        stats.totalDuration += cmd.duration;
        stats.durationCount++;
      }

      // Count tool usage
      toolCounts[cmd.tool] = (toolCounts[cmd.tool] || 0) + 1;
    }

    // Calculate average duration
    const averageDuration = stats.durationCount > 0
      ? stats.totalDuration / stats.durationCount
      : 0;

    // Get most used tools
    const mostUsedTools = Object.entries(toolCounts)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCommands: stats.totalCommands,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      pendingCount: stats.pendingCount,
      averageDuration,
      mostUsedTools
    };
  }

  public clearHistory(): void {
    this.history = {
      commands: [],
      session: {
        startTime: new Date().toISOString(),
        commandCount: 0
      }
    };
    this.saveHistory();
  }

  public exportAsScript(): string {
    const script: string[] = [
      '// Auto-generated ExtendScript from command history',
      `// Generated at: ${new Date().toISOString()}`,
      `// Commands: ${this.history.commands.length}`,
      '',
      '(function() {',
      '  var results = [];',
      ''
    ];

    for (const cmd of this.history.commands) {
      if (cmd.result === 'success') {
        script.push(`  // ${cmd.tool} at ${cmd.timestamp}`);
        script.push(`  // Parameters: ${JSON.stringify(cmd.parameters)}`);

        // Generate appropriate ExtendScript based on tool
        // This is a simplified example - would need expansion for all tools
        switch (cmd.tool) {
          case 'createComposition':
            script.push(`  app.project.items.addComp("${cmd.parameters.name}", ${cmd.parameters.width}, ${cmd.parameters.height}, 1, ${cmd.parameters.duration}, ${cmd.parameters.frameRate});`);
            break;
          case 'setLayerKeyframe':
            script.push(`  // setLayerKeyframe would need proper comp/layer lookup`);
            script.push(`  // comp.layer(${cmd.parameters.layerIndex}).transform.${cmd.parameters.propertyName}.setValueAtTime(${cmd.parameters.timeInSeconds}, ${JSON.stringify(cmd.parameters.value)});`);
            break;
          // Add more cases as needed
        }
        script.push('');
      }
    }

    script.push('  return results;');
    script.push('})();');

    return script.join('\n');
  }
}