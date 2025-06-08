# Contributing to HatStart

Thank you for your interest in contributing to HatStart! We welcome contributions from developers of all experience levels.

## Quick Start for Contributors

### Adding a New Tool (No Coding Required!)

The easiest way to contribute is by adding support for a new development tool:

1. Create a manifest file in `examples/workspace-manifests/`
2. Follow this template:

```yaml
id: "your-tool-id"
name: "Tool Display Name"
category: "Category" # Languages, Tools, IDEs, Databases, etc.
description: "Brief description of the tool"
platforms:
  windows:
    installer: "chocolatey" # or "winget", "direct"
    package: "package-name"
  macos:
    installer: "homebrew" # or "direct"
    package: "package-name"
  linux:
    installer: "apt" # or "yum", "snap", "direct"
    package: "package-name"
dependencies: [] # Optional: List of tool IDs this depends on
```

3. Test the installation on your platform
4. Submit a pull request!

### Adding a Custom Job Role

Create a job role configuration:

```yaml
id: "unique-role-id"
name: "Role Display Name"
description: "What this developer role focuses on"
categories:
  - languages: ["python", "javascript"]
  - tools: ["git", "docker", "tool-id"]
  - editors: ["vscode", "cursor"]
  - extensions: ["extension.id"]
```

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Run tests: `npm test`

## Code Contributions

### Architecture Overview

- `src/services/` - Core business logic
- `src/components/` - React UI components
- `src/shared/` - Shared utilities and types
- `examples/` - Manifest examples

### Adding Version Manager Support

1. Create adapter in `src/services/version-managers/`
2. Extend `BaseVersionManagerAdapter`
3. Implement required methods
4. Add to `version-manager-factory.ts`
5. Write tests

### Coding Standards

- TypeScript with strict mode
- ESLint configuration enforced
- Tests required for new features
- Follow existing patterns

## Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes following our coding standards
4. Write/update tests
5. Run `npm run lint` and fix issues
6. Commit with descriptive message
7. Push and create pull request

## What We're Looking For

### High Priority Contributions

- New tool manifests
- Platform-specific installers
- Bug fixes with tests
- Documentation improvements
- Cross-platform testing

### Please Don't Submit

- Cloud/SaaS features
- User authentication systems
- Payment/marketplace features
- Code generators
- Features requiring external services

## Questions?

- Open an issue for discussion
- Check existing issues and PRs
- Read our documentation in `/docs`

Thank you for helping make HatStart better for developers everywhere!