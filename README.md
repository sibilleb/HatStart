<div align="center">
  <img src="docs/assets/HatStart Logo.png" alt="HatStart Logo" width="300" />
  
  # HatStart
  
  > One-click developer environment setup for Windows, macOS, and Linux
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
  [![Electron](https://img.shields.io/badge/Electron-36-9FEAF9)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB)](https://reactjs.org/)
  [![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
</div>

## 🚀 What is HatStart?

HatStart is an **open-source, cross-platform developer toolkit installer** that sets up your complete development environment with one click. No more following lengthy setup guides or debugging installation issues - HatStart handles everything for you.

### ✨ Key Features

- **🖱️ One-Click Installation**: Set up your entire development environment in minutes
- **🎯 Job Role Recommendations**: Get tool suggestions based on your role (Full-Stack, DevOps, Data Science, etc.)
- **📦 Version Management**: Automatically manage multiple versions of languages (Node.js, Python, Ruby, etc.)
- **🔧 IDE Configuration**: Auto-configure VS Code, Cursor, or JetBrains with extensions and settings
- **🌍 Cross-Platform**: Works seamlessly on Windows, macOS, and Linux
- **📚 Extensible**: Easy to add new tools via YAML/JSON manifests - no coding required!
- **🚫 Offline-First**: No cloud dependencies for core functionality

## 📊 Project Status

**Current Version**: Development (Pre-release)  
**Progress**: 11 of 25 planned features complete (44%)

### Recently Completed ✅
- Version Management System (Mise, NVM, PyEnv, ASDF, RBenv)
- IDE Workspace Generation (VS Code/Cursor configuration)
- Job Role Assessment System
- Cross-platform Installer Framework
- MVP Simplification (removed 49,000+ lines of over-engineered code)

### In Progress 🔄
- Conflict Resolution UI
- Real-time Progress Tracking
- Platform-specific Enhancements

[View Full Roadmap →](https://github.com/yourusername/hatstart/issues)

## 🎯 Who is HatStart For?

- **New Developers**: Get started quickly without setup headaches
- **Experienced Developers**: Standardize your environment across machines
- **Teams**: Share consistent development setups
- **Companies**: Onboard developers faster with custom configurations

## 🚀 Quick Start

### Using HatStart

1. Download the latest release for your platform
2. Run HatStart
3. Choose your developer role (optional)
4. Select tools to install
5. Click "Install" and grab a coffee ☕

### Example: Full-Stack Developer Setup

HatStart can set up a complete full-stack environment including:
- Node.js (via NVM) with version management
- Python (via PyEnv) with virtual environments  
- Git with proper configuration
- Docker Desktop
- VS Code with relevant extensions
- PostgreSQL and Redis
- All configured and ready to use!

## 🤝 Contributing

We love contributions! HatStart is designed to be easily extensible.

### Add a New Tool (No Coding!)

1. Create a manifest file:
```yaml
id: "terraform"
name: "Terraform"
category: "Infrastructure"
platforms:
  windows:
    installer: "chocolatey"
    package: "terraform"
  macos:
    installer: "homebrew"
    package: "terraform"
  linux:
    installer: "apt"
    package: "terraform"
```

2. Submit a PR - that's it!

[Read Contributing Guide →](CONTRIBUTING.md)

## 🏗️ Architecture

HatStart is built with modern web technologies:

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Electron 36 with secure IPC
- **Build**: Vite + ESLint  
- **Testing**: Vitest with comprehensive coverage

### Key Systems

1. **Simple Manifest System**: Define tools in JSON (~230 lines)
2. **Simple Tool Installer**: Direct package manager wrapper (~400 lines)
3. **Version Management**: Universal version manager support
4. **Job Role Recommendations**: Rule-based tool suggestions
5. **IDE Workspace Generation**: Simple config file generation (~460 lines)

## 📖 Documentation

- [Product Vision](docs/PRODUCT_VISION.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Manifest Format](docs/MANIFEST_FORMAT.md)

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/yourusername/hatstart.git
cd hatstart

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📜 License

HatStart is MIT licensed. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with ❤️ by developers, for developers. Special thanks to all contributors!

---

**Note**: HatStart is in active development. Star ⭐ the repo to follow our progress!