# After Effects CLI Launcher

A command-line utility to launch Adobe After Effects from the terminal on macOS and Windows.

## Features

- **Launch After Effects** from the command line
- **Open project files** directly
- **Check if running** before launching
- **Wait for exit** option for scripting workflows
- **Cross-platform** support (macOS and Windows)

## Installation

After building the project, you can either:

1. **Use via npm script:**
   ```bash
   npm run launch -- [options]
   ```

2. **Link globally** (recommended):
   ```bash
   npm link
   afterfx-launch [options]
   ```

## Usage

### Basic Commands

```bash
# Launch After Effects
afterfx-launch

# Check if After Effects is running
afterfx-launch --check

# Open a specific project
afterfx-launch --project /path/to/project.aep
afterfx-launch myproject.aep  # shorthand

# Launch and wait for exit (useful in scripts)
afterfx-launch --wait

# Show help
afterfx-launch --help
```

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help message |
| `--check` | `-c` | Check if After Effects is currently running |
| `--project <path>` | `-p` | Open a specific project file (.aep or .aet) |
| `--wait` | `-w` | Wait for After Effects to exit before returning |

## Programmatic Usage

You can also use the launcher in your own Node.js scripts:

```typescript
import { AfterEffectsLauncher } from './utils/appLauncher.js';

// Launch After Effects
const result = AfterEffectsLauncher.launch();
console.log(result.message);

// Launch with a project
AfterEffectsLauncher.launch({
  projectPath: '/path/to/project.aep'
});

// Launch and wait for exit
AfterEffectsLauncher.launch({
  wait: true
});

// Check if running
const isRunning = AfterEffectsLauncher.isRunning();
console.log(`After Effects is ${isRunning ? 'running' : 'not running'}`);
```

## Platform-Specific Details

### macOS
- Searches for After Effects in `/Applications/Adobe After Effects [VERSION]/`
- Uses the `open` command to launch the app
- Supports After Effects 2020-2025

### Windows
- Searches for `AfterFX.exe` in standard Program Files locations
- Supports custom installation paths via `ADOBE_AFTER_EFFECTS_PATH` environment variable
- Supports After Effects 2020-2025 and legacy CC/CS6 versions

## Environment Variables

**`ADOBE_AFTER_EFFECTS_PATH`** (Windows only)
- Set this if After Effects is installed in a non-standard location
- Should point to the After Effects installation directory (e.g., `C:\Adobe\After Effects 2024`)

## Examples

### Workflow Automation

```bash
#!/bin/bash
# Launch AE, wait for it to close, then process renders

afterfx-launch --project animation.aep --wait
echo "After Effects closed, processing renders..."
./process-renders.sh
```

### Quick Check Before Launching

```bash
# Only launch if not already running
if ! afterfx-launch --check; then
  afterfx-launch
fi
```

### Opening Multiple Projects

```bash
# Open multiple projects in separate instances (macOS)
afterfx-launch project1.aep
afterfx-launch project2.aep
afterfx-launch project3.aep
```

## Exit Codes

- `0` - Success
- `1` - Failure (app not found, launch failed, or not running when checked)

## Troubleshooting

**"After Effects not found"**
- Ensure After Effects is installed in the standard location
- On Windows, set the `ADOBE_AFTER_EFFECTS_PATH` environment variable
- Verify the installation by checking the expected paths listed in the error message

**"Permission denied" (macOS)**
- Ensure the script has execute permissions: `chmod +x build/cli/launch.js`
- Grant necessary permissions in System Settings > Privacy & Security

**Process doesn't detach (keeps terminal busy)**
- This is expected when using `--wait` option
- For background launching, omit the `--wait` flag

## License

MIT
