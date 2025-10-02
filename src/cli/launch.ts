#!/usr/bin/env node

// CLI tool to launch After Effects
import colors from 'colors';
import { AfterEffectsLauncher } from '../utils/appLauncher.js';

interface CliArgs {
  help?: boolean;
  wait?: boolean;
  project?: string;
  check?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;

      case '-w':
      case '--wait':
        args.wait = true;
        break;

      case '-p':
      case '--project':
        args.project = argv[++i];
        break;

      case '-c':
      case '--check':
        args.check = true;
        break;

      default:
        // Treat as project path if it ends with .aep
        if (arg.endsWith('.aep') || arg.endsWith('.aet')) {
          args.project = arg;
        }
    }
  }

  return args;
}

function printHelp(): void {
  console.log(colors.cyan('\n=== After Effects CLI Launcher ===\n'));
  console.log('Usage: afterfx-launch [options] [project.aep]\n');
  console.log('Options:');
  console.log(colors.yellow('  -h, --help       ') + 'Show this help message');
  console.log(colors.yellow('  -w, --wait       ') + 'Wait for After Effects to exit before returning');
  console.log(colors.yellow('  -p, --project    ') + 'Open a specific project file');
  console.log(colors.yellow('  -c, --check      ') + 'Check if After Effects is currently running');
  console.log('\nExamples:');
  console.log(colors.green('  afterfx-launch                          ') + '# Launch After Effects');
  console.log(colors.green('  afterfx-launch --check                  ') + '# Check if running');
  console.log(colors.green('  afterfx-launch --project myfile.aep     ') + '# Open project');
  console.log(colors.green('  afterfx-launch myfile.aep               ') + '# Open project (shorthand)');
  console.log(colors.green('  afterfx-launch --wait                   ') + '# Launch and wait');
  console.log();
}

function main(): void {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.check) {
    const isRunning = AfterEffectsLauncher.isRunning();
    if (isRunning) {
      console.log(colors.green('✓ After Effects is currently running'));
      process.exit(0);
    } else {
      console.log(colors.yellow('✗ After Effects is not running'));
      process.exit(1);
    }
  }

  // Launch After Effects
  console.log(colors.cyan('Launching After Effects...'));

  const result = AfterEffectsLauncher.launch({
    wait: args.wait,
    projectPath: args.project,
  });

  if (result.success) {
    console.log(colors.green(`✓ ${result.message}`));
    if (result.pid) {
      console.log(colors.gray(`  Process ID: ${result.pid}`));
    }
    process.exit(0);
  } else {
    console.log(colors.red(`✗ ${result.message}`));
    if (result.error) {
      console.log(colors.red(`  Error: ${result.error}`));
    }
    process.exit(1);
  }
}

// Run CLI
main();
