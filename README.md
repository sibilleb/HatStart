# HatStart - The Automated Developer Toolkit Installer

HatStart is a modern Electron-based application that automates the installation and configuration of developer tools across different platforms. It provides an intelligent, category-based approach to setting up development environments with minimal user intervention.

## 🚀 Features

- **Intelligent Tool Detection**: Automatically detects already installed tools to avoid conflicts
- **Category-Based Organization**: Tools organized by development categories (Frontend, Backend, DevOps, etc.)
- **Experience Level Filtering**: Tailored tool recommendations based on user experience
- **Cross-Platform Support**: Works on macOS, Windows, and Linux
- **Progress Tracking**: Real-time installation progress with detailed feedback
- **Modern UI**: Built with React and TypeScript for a responsive user experience

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop**: Electron 36
- **Build System**: Vite + TypeScript + Electron Builder
- **Code Quality**: ESLint + TypeScript strict mode

## 📋 Prerequisites

- Node.js 18+ and npm
- Git

## 🏗 Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd HatStart
npm install
```

### 2. Development Mode

Run the application in development mode with hot reload:

```bash
npm run electron:dev
```

This will:
- Start the Vite dev server on http://localhost:5173
- Launch Electron with the React app
- Enable hot reload for both main and renderer processes

### 3. Build for Production

```bash
# Build the application
npm run electron:build

# Package for distribution
npm run electron:dist
```

## 📁 Project Structure

```
HatStart/
├── electron/                 # Electron main process
│   ├── main.ts              # Main Electron process
│   ├── preload.ts           # Preload script for secure IPC
│   ├── utils/               # Electron utilities
│   └── tsconfig.json        # TypeScript config for main process
├── src/                     # React renderer process
│   ├── components/          # React components
│   ├── shared/              # Shared types and utilities
│   │   └── types.ts         # TypeScript interfaces
│   ├── App.tsx              # Main React component
│   └── main.tsx             # React entry point
├── public/                  # Static assets
├── dist/                    # Built React app
├── dist-electron/           # Built Electron main process
└── release/                 # Packaged applications
```

## 🔧 Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build React app
- `npm run electron:dev` - Run in development mode
- `npm run electron:build` - Build both React and Electron
- `npm run electron:compile` - Compile Electron TypeScript
- `npm run electron:pack` - Package the application
- `npm run electron:dist` - Build and package for distribution
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types
- `npm run clean` - Clean build directories

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## 📦 Building for Distribution

The application can be packaged for multiple platforms:

```bash
# Build for current platform
npm run electron:dist

# The packaged app will be in the release/ directory
```

Supported platforms:
- **macOS**: DMG installer (x64 + ARM64)
- **Windows**: NSIS installer (x64)
- **Linux**: AppImage (x64)

## 🔒 Security

- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication via preload script
- TypeScript strict mode for type safety

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

[License information to be added]

## 🐛 Troubleshooting

### Common Issues

**Electron won't start in development:**
- Ensure Vite dev server is running on port 5173
- Check that all dependencies are installed

**TypeScript errors:**
- Run `npm run type-check` to see detailed errors
- Ensure all imports use correct paths

**Build failures:**
- Clean build directories: `npm run clean`
- Reinstall dependencies: `rm -rf node_modules && npm install`

For more help, please open an issue on GitHub.
