# 🎬 After Effects MCP Server - Enhanced Edition

![Node.js](https://img.shields.io/badge/node-%3E=14.x-brightgreen.svg)
![Build](https://img.shields.io/badge/build-passing-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![After Effects](https://img.shields.io/badge/After%20Effects-2021%2B-purple)

✨ An enhanced Model Context Protocol (MCP) server for Adobe After Effects with improved cross-platform support, asset management, animation tools, and automatic housekeeping.

> 🔗 **Based on:** [after-effects-mcp](https://github.com/Dakkshin/after-effects-mcp) by Dakkshin
> This project extends the original with improvements to tools, structure, cross-platform compatibility, and reliability.

## 🚀 What's New in This Enhanced Edition

### Major Improvements Over Original
- **🖥️ True Cross-Platform Support** - Dynamic path resolution for Windows and macOS
- **📦 Asset Management Suite** - Import, replace, and manage footage with 4 new tools
- **🎬 Animation Templates** - 12 pre-built animations (bounce, slide, fade, zoom, etc.)
- **🧹 Automatic Housekeeping** - Self-cleaning temp files to prevent accumulation
- **📊 Command History** - Track, query, and replay all operations
- **🛠️ Improved Architecture** - Better build structure with `build/temp` organization
- **📝 Comprehensive Documentation** - Detailed guides for all 20+ tools

## 🎯 Key Features

- **🎨 Full Creative Control** - Create compositions, layers, and animations programmatically
- **🔄 Real-time Communication** - Bidirectional communication between MCP and After Effects
- **🎬 Animation Tools** - Keyframes, expressions, and animation templates
- **📦 Asset Management** - Import and replace footage dynamically
- **🧹 Automatic Housekeeping** - Self-cleaning temporary files
- **🖥️ Cross-platform** - Works on both Windows and macOS

## Table of Contents
- [Key Features](#-key-features)
- [Features](#-features)
- [Setup Instructions](#️-setup-instructions)
- [Available Tools](#-available-tools)
- [Usage Examples](#-usage-examples)
- [Troubleshooting](#-troubleshooting)
- [For Developers](#-for-developers)
- [Recent Improvements](#-recent-improvements)
- [License](#-license)

## 📦 Features

### 🎥 Core Composition Features
- **Create compositions** with custom settings (size, frame rate, duration, background color)
- **List all compositions** in a project with details
- **Get project information** including frame rate, dimensions, and duration
- **Get composition by index** - Properly finds compositions by position

### 🧱 Layer Management
- **Create text layers** with customizable properties (font, size, color, position)
- **Create shape layers** (rectangle, ellipse, polygon, star) with colors and strokes
- **Create solid/adjustment layers** for backgrounds and effects
- **Modify layer properties** like position, scale, rotation, opacity, and timing
- **Get layer properties** with keyframe data and applied effects

### 🌀 Animation Capabilities
- **Set keyframes** for any layer property (Position, Scale, Rotation, Opacity, etc.)
- **Bulk keyframe operations** - Set multiple keyframes at once
- **Copy animations** between layers with time offsets
- **Apply expressions** to layer properties for dynamic animations
- **Animation templates** - 12 pre-built animations (bounce, slide, fade, etc.)

### 📂 Asset Management
- **Import assets** - Import images/videos from disk paths
- **Replace footage** - Swap layer source files dynamically
- **Auto-add to composition** with position and scale options

### 🛠️ Advanced Features
- **Custom script execution** - Run ExtendScript code directly
- **Command history tracking** - Logs all operations for debugging/replay
- **Effect templates** - Pre-configured effects (blur, glow, cinematic look)
- **Automatic temp file cleanup** - Prevents JSX file accumulation

## ⚙️ Setup Instructions

### 🛠 Prerequisites
- Adobe After Effects (2021 or later, tested with 2025)
- Node.js (v14 or later)
- npm or yarn package manager
- **Windows**: Administrator privileges for installation
- **macOS**: After Effects must have been run at least once

### 📥 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VolksRat71/after-effects-mcp-enhanced.git
   cd after-effects-mcp-enhanced
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Install the After Effects bridge panel**
   ```bash
   npm run install-bridge
   ```

   **Platform-specific notes:**
   - **Windows**: Automatically installs to After Effects Scripts folder
   - **macOS**: Uses native password prompt for administrator access

### 🔧 Configure Your MCP Client

Add to your MCP client configuration (e.g., Claude Desktop, Cursor):

**Windows:**
```json
{
  "mcpServers": {
    "after-effects-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\after-effects-mcp\\build\\index.js"]
    }
  }
}
```

**macOS:**
```json
{
  "mcpServers": {
    "after-effects-mcp": {
      "command": "node",
      "args": ["/path/to/after-effects-mcp/build/index.js"]
    }
  }
}
```

### ▶️ Running the Server

1. **Configure After Effects**
   - Open After Effects
   - **Windows**: Edit > Preferences > Scripting & Expressions
   - **macOS**: After Effects > Settings > Scripting & Expressions
   - Enable "Allow Scripts to Write Files and Access Network"
   - Restart After Effects

2. **Open the MCP Bridge Panel**
   - In After Effects: Window > mcp-bridge-auto.jsx
   - Ensure "Auto-run commands" is checked
   - The panel will poll for commands every 2 seconds

3. **Start using MCP commands**
   - The server is now ready to receive commands from your MCP client

## 🛠 Available Tools

### Composition Management
| Tool | Description |
|------|-------------|
| `create-composition` | Create a new composition with custom settings |
| `list-compositions` | List all compositions in the project |
| `get-project-info` | Get project information |

### Layer Creation & Management
| Tool | Description |
|------|-------------|
| `create-text-layer` | Create a new text layer |
| `create-shape-layer` | Create shape layers (rectangle, ellipse, etc.) |
| `create-solid-layer` | Create solid or adjustment layers |
| `set-layer-properties` | Modify layer properties |
| `get-layer-properties` | Get layer info including keyframes |

### Animation Tools
| Tool | Description |
|------|-------------|
| `setLayerKeyframe` | Set a keyframe for a layer property |
| `set-multiple-keyframes` | Set multiple keyframes at once |
| `copy-animation` | Copy all keyframes between layers |
| `setLayerExpression` | Apply expressions to properties |
| `apply-animation-template` | Apply pre-built animations |

### Asset Management
| Tool | Description |
|------|-------------|
| `import-assets` | Import images/videos from disk |
| `replace-footage` | Replace layer source footage |

### Effects
| Tool | Description |
|------|-------------|
| `apply-effect` | Apply an effect to a layer |
| `apply-effect-template` | Apply pre-configured effect templates |

### Utility
| Tool | Description |
|------|-------------|
| `run-custom-script` | Execute custom ExtendScript code |
| `get-command-history` | Query command history |
| `export-history-as-script` | Export history as ExtendScript |
| `get-help` | Get detailed help information |
| `get-results` | Retrieve results from After Effects |

## 💡 Usage Examples

### Creating a Composition
```javascript
// Create a 1080p composition
mcp__after-effects-mcp__create-composition({
  name: "My Animation",
  width: 1920,
  height: 1080,
  frameRate: 30,
  duration: 10,
  backgroundColor: { r: 0, g: 0, b: 0 }
})
```

### Importing and Animating Assets
```javascript
// Import images
mcp__after-effects-mcp__import-assets({
  files: ["/path/to/image1.jpg", "/path/to/image2.jpg"],
  addToComp: true,
  compIndex: 1,
  position: [960, 540],
  scale: [50, 50]
})

// Apply bounce animation
mcp__after-effects-mcp__apply-animation-template({
  template: "bounce",
  compIndex: 1,
  layerIndex: 1,
  duration: 1.5
})
```

### Setting Keyframes
```javascript
// Animate position over time
mcp__after-effects-mcp__setLayerKeyframe({
  compIndex: 1,
  layerIndex: 1,
  propertyName: "Position",
  timeInSeconds: 0,
  value: [100, 540]
})

mcp__after-effects-mcp__setLayerKeyframe({
  compIndex: 1,
  layerIndex: 1,
  propertyName: "Position",
  timeInSeconds: 2,
  value: [1820, 540]
})
```

### Animation Templates Available
- `fade-in` / `fade-out` - Opacity animations
- `slide-left` / `slide-right` / `slide-up` / `slide-down` - Position animations
- `bounce` - Bouncing motion with scale
- `spin` - 360-degree rotation
- `zoom-in` / `zoom-out` - Scale animations
- `shake` - Random position shake
- `slide-and-fall` - Slide in and fall with rotation

## 🔍 Troubleshooting

### Common Issues

**"Composition not found at index X"**
- The composition index fix has been implemented. Use 1-based indexing.

**"File does not exist" when importing**
- Ensure the file path is absolute, not relative
- Check file extensions match exactly (`.jpg` vs `.jpeg`)

**Permission denied errors**
- **Windows**: Run installation as administrator
- **macOS**: Grant After Effects full disk access in System Settings

**Scripts not appearing in Window menu**
- Restart After Effects after installation
- Verify script installation in Scripts/ScriptUI Panels folder

**MCP not communicating with After Effects**
- Check "Auto-run commands" is enabled in the panel
- Ensure "Allow Scripts to Write Files" is enabled in preferences
- Verify the MCP server is running (check with `/mcp` in your client)

### File Locations

**Communication files:**
- Commands: `build/temp/ae_command.json`
- Results: `build/temp/ae_mcp_result.json`
- History: `build/temp/ae_command_history.json`

**Scripts:**
- Bridge panel: `[After Effects]/Scripts/ScriptUI Panels/mcp-bridge-auto.jsx`
- Temp scripts: `build/temp/*.jsx` (auto-cleaned)

## 👨‍💻 For Developers

### 🧩 Project Structure

```
after-effects-mcp/
├── src/
│   ├── index.ts                 # MCP server implementation
│   ├── scripts/
│   │   └── mcp-bridge-auto.jsx  # After Effects panel
│   └── utils/
│       ├── resolvePaths.ts      # Cross-platform path resolution
│       └── historyManager.ts    # Command history tracking
├── build/                       # Compiled output
│   └── temp/                    # Communication files
├── install-bridge.js            # Installation script
└── package.json
```

### 📦 Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Install bridge to After Effects
npm run install-bridge

# Start the server
npm start
```

### 🧹 Housekeeping System

The server implements automatic cleanup:
- **On startup**: Deletes JSX files older than 1 hour
- **During runtime**: Schedules deletion 5 minutes after creation
- **Preserves**: Command history and active communication files

### 🤝 Contributing

Contributions are welcome! This project follows a feature-branch workflow:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📈 Recent Improvements

### Version 1.0.0 (2025-09-24)
- ✅ **Fixed composition index lookup** - Properly finds compositions by position
- ✅ **Cross-platform support** - Works on Windows and macOS
- ✅ **Asset import/replace** - Full asset management capabilities
- ✅ **Animation templates** - 12 pre-built animations
- ✅ **Bulk operations** - Set multiple keyframes, copy animations
- ✅ **Automatic housekeeping** - Cleans temporary files
- ✅ **Command history** - Track and replay operations
- ✅ **Custom script execution** - Run ExtendScript directly
- ✅ **Fixed ExtendScript filter() issue** - No more array errors

### Tested With
- Adobe After Effects 2025
- macOS Sonoma / Windows 11
- Node.js v18+

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original project by [Dakkshin](https://github.com/Dakkshin/after-effects-mcp)
- Built for the [Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) ecosystem
- Tested with Claude Desktop and Cursor
- Thanks to the After Effects scripting community

## 📬 Contact & Support

**Found a bug or have a feature request?**
- Open an issue on [GitHub Issues](https://github.com/VolksRat71/after-effects-mcp-enhanced/issues)
- Check the [troubleshooting guide](#-troubleshooting) first

**Want to contribute?**
- Fork the repository and submit a pull request
- See [Contributing](#contributing) for guidelines

---

**Ready to animate?** Start creating with AI-powered After Effects automation! 🎬✨
