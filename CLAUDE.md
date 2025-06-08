# Claude Code Context Management for HatStart

This file provides context and memory management for Claude Code when working on the HatStart project. It complements (but does not replace) your existing Taskmaster and Cursor workflow.

## Project Overview

**HatStart** is an Electron-based automated developer toolkit installer that helps developers quickly set up their development environment across different platforms (Windows, macOS, Linux).

### Core Architecture
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Electron main process with secure IPC
- **Build System**: Vite + TypeScript + ESLint
- **Testing**: Vitest with comprehensive test coverage
- **Package Management**: Cross-platform installers via system package managers

### Key Features Implemented
- ✅ **Version Management System**: Complete system for managing multiple programming language versions (Task 8)
- ✅ **Dependency Resolution Engine**: Comprehensive cross-category dependency management (Task 7)
- ✅ **Category-based Installer Framework**: Modular installation system for development tools
- ✅ **Cross-platform Support**: Windows, macOS, Linux with platform-specific adapters
- ✅ **Job Role Assessment**: AI-powered recommendations based on developer experience
- ✅ **IDE Configuration**: Automated setup for VS Code, Cursor, and other IDEs
- ✅ **Workspace Management**: Project-specific environment configuration

## Product Vision & Core Principles

### HatStart Mission Statement
HatStart is a **local developer toolkit installer** that enables developers to set up their complete development environment with one click. It is:
- **Developer-First**: Built by developers, for developers
- **Community-Driven**: Open source with easy contribution paths
- **Extensible**: Add new tools without touching core code
- **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux
- **Offline-Capable**: No cloud dependencies for core functionality

### What HatStart IS:
- ✅ A local development environment setup tool
- ✅ A cross-platform installer for development tools
- ✅ A version manager orchestrator
- ✅ An IDE configuration generator
- ✅ A community-driven tool catalog
- ✅ An open-source project

### What HatStart is NOT:
- ❌ A cloud IDE or remote development platform
- ❌ A code generator or scaffolding tool
- ❌ A project management system
- ❌ A marketplace or paid service
- ❌ A VDI (Virtual Desktop Infrastructure) solution
- ❌ A continuous integration/deployment tool

### User Flow

#### 1. Initial Setup Flow
```
Launch HatStart → Job Role Selection (Optional) → Tool Recommendations → 
Category Selection → Dependency Resolution → One-Click Install → 
IDE Workspace Generation → Ready to Code!
```

**Detailed Steps**:
1. **Launch**: User opens HatStart application
2. **Job Role Questionnaire** (Optional):
   - Select from predefined roles (Full-Stack, Data Scientist, DevOps, etc.)
   - Or skip for manual selection
3. **Tool Recommendations**:
   - Based on job role, suggest relevant tools
   - User can accept, modify, or ignore suggestions
4. **Category Selection**:
   - Programming Languages (Node.js, Python, Go, etc.)
   - Development Tools (Git, Docker, Kubernetes tools)
   - IDEs and Editors (VS Code, Cursor, JetBrains)
   - Databases (PostgreSQL, MongoDB, Redis)
5. **Dependency Resolution**:
   - Automatically detect tool dependencies
   - Resolve version conflicts
   - Show clear dependency graph
6. **One-Click Installation**:
   - Progress tracking for each tool
   - Error recovery and retry mechanisms
   - Platform-specific package manager usage
7. **IDE Workspace Generation**:
   - Generate IDE-specific configuration
   - Install recommended extensions
   - Configure linters and formatters

#### 2. Customization Flow
- Browse complete tool catalog
- Search and filter by category
- Add/remove tools post-installation
- Configure version managers
- Export configuration for team sharing

### Extensibility Principles

#### 1. Manifest-Based Tool Addition
Contributors can add new tools by creating simple YAML/JSON manifests:

```yaml
# Example: adding a new tool
id: "terraform"
name: "Terraform"
category: "Infrastructure"
description: "Infrastructure as Code tool"
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

#### 2. No Code Required for Basic Tools
- Add manifest file
- Submit pull request
- Tool available to all users after merge

#### 3. Company Customization
Organizations can:
- Maintain private manifest repositories
- Create custom job roles (e.g., "ACME Corp Backend Developer")
- Include proprietary tools via private manifests
- Set company-specific default configurations

#### 4. Example: Custom Role for Ansible Developer
```yaml
id: "ansible-automation-developer"
name: "Ansible Automation Developer"
description: "Developer focused on Ansible automation for AWS and Azure"
categories:
  - languages: ["python"]
  - tools: ["git", "ansible", "terraform", "aws-cli", "azure-cli"]
  - editors: ["vscode"]
  - extensions: ["ms-python.python", "redhat.ansible"]
```

### Open Source Collaboration Guidelines

#### Contributing New Tools/Languages

**Method 1: Via Manifest Files** (Recommended for most contributions)
1. Create YAML/JSON manifest in `examples/workspace-manifests/`
2. Follow existing manifest patterns
3. Test on your platform
4. Submit PR with:
   - Manifest file
   - Documentation update
   - Test results

**Method 2: Via Code** (For complex integrations)
1. New version manager adapter in `src/services/version-managers/`
2. Platform-specific installer logic
3. Comprehensive tests
4. Documentation

#### Contribution Principles
- **Keep It Simple**: Tools should install with minimal configuration
- **Document Thoroughly**: Include examples and common use cases
- **Test Cross-Platform**: Ensure Windows, macOS, Linux compatibility
- **Respect User Choice**: No forced tool installation or telemetry
- **Maintain Backward Compatibility**: Don't break existing manifests

#### Code of Conduct
- Be welcoming to newcomers
- Provide constructive feedback
- Focus on the tool's value to developers
- Keep discussions technical and respectful

## Context Integration with Existing Workflow

### Your Existing Context Files
You have excellent context management already established:

1. **Taskmaster Tasks**: `.taskmaster/tasks/` - Contains detailed task breakdown and implementation notes
2. **Cursor Rules**: `.cursor/rules/` - Contains development conventions and patterns
3. **Documentation**: `docs/` - Contains algorithm documentation and guides

### How to Reference These in Claude Code Prompts

When prompting Claude Code for planning or implementation:

#### For Project Context:
```
"Please read the following files to understand the project context:
- .taskmaster/tasks/task_008.txt (for version management system details)
- .taskmaster/tasks/task_007.txt (for dependency resolution engine details)
- .cursor/rules/hatstart-conventions.mdc (for coding standards)
- docs/platform-and-tool-categories.md (for category structure)
- docs/dependency-resolution-architecture.md (for dependency system architecture)"
```

#### For Development Workflow:
```
"Before starting, please review:
- .cursor/rules/dev_workflow.mdc (for development process)
- .cursor/rules/electron.mdc (for Electron best practices)
- .taskmaster/tasks/[relevant_task].txt (for specific implementation details)"
```

#### For Testing and Quality:
```
"Please check the testing approach in:
- .cursor/rules/tests.mdc (if exists)
- src/services/__tests__/ (for existing test patterns)
- vitest.config.ts (for test configuration)"
```

## Current Implementation Status

### Completed Major Components (as of Task 8)

#### 1. Dependency Resolution Engine (Task 7)
- **Types**: `src/services/dependency-resolution/types.ts` - 60+ interfaces for comprehensive type safety
- **Core Graph**: `src/services/dependency-resolution/dependency-graph.ts` - Adjacency list implementation with traversal algorithms
- **Graph Builder**: `src/services/dependency-resolution/graph-builder.ts` - Multi-phase construction from manifests
- **Resolver**: `src/services/dependency-resolution/dependency-resolver.ts` - Multiple resolution algorithms (topological, DFS, BFS)
- **Conflict Detection**: `src/services/dependency-resolution/conflict-detector.ts` - Version conflicts, circular deps, platform issues
- **Conflict Resolution**: `src/services/dependency-resolution/conflict-resolver.ts` - Automated and guided resolution strategies
- **CategoryInstaller Integration**: `src/services/dependency-resolution/dependency-aware-category-installer.ts` - Native package manager support
- **UI Components**: 
  - `src/components/dependency-resolution/DependencyVisualization.tsx` - Interactive React visualization
  - `src/services/dependency-resolution/dependency-cli-visualizer.ts` - CLI interface
- **Testing**: 240+ tests covering all modules

#### 2. Version Management System
- **Types**: `src/services/version-manager-types.ts` - Complete type system
- **Installer**: `src/services/version-manager-installer.ts` - Platform-aware installation
- **Adapters**: `src/services/version-managers/` - Individual version manager implementations
  - Mise (universal), NVM (Node.js), PyEnv (Python), ASDF (universal), RBenv (Ruby)
- **Command Execution**: `src/services/command-execution/` - Cross-platform command layer
- **Workspace Integration**: `src/services/workspace-configuration/` - Environment management
- **UI Components**: `src/components/version-management/` - React UI for version management

#### 3. Core Infrastructure
- **Base Installer**: `src/services/base-installer.ts` - Foundation for all installers
- **Category System**: `src/services/category-installer.ts` - Tool categorization framework
- **Platform Detection**: `src/shared/os-detector.ts`, `src/shared/system-detector.ts`
- **Error Handling**: Comprehensive error management across all components

#### 4. User Interface
- **Job Role Assessment**: AI-powered developer experience evaluation
- **Category Grid**: Tool selection interface
- **Progress Tracking**: Real-time installation feedback
- **Version Management Panel**: Complete UI for version switching
- **Dependency Visualization**: Interactive graph visualization with conflict highlighting

### Architecture Patterns Established

#### 1. Service Layer Pattern
```typescript
// Base service with common functionality
abstract class BaseService {
  protected abstract executeCommand(): Promise<CommandResult>;
}

// Platform-specific implementations
class WindowsService extends BaseService { }
class UnixService extends BaseService { }
```

#### 2. Factory Pattern for Cross-Platform Support
```typescript
// Factory creates appropriate implementation
const factory = CommandExecutorFactory.create();
const executor = factory.createExecutor(platform);
```

#### 3. Adapter Pattern for Version Managers
```typescript
// Unified interface for different version managers
interface IVersionManager {
  installVersion(tool: string, version: string): Promise<VersionOperationResult>;
}

// Specific implementations
class MiseAdapter implements IVersionManager { }
class NVMAdapter implements IVersionManager { }
```

## Development Guidance

### When to Use Each Context System

#### Use Taskmaster (.taskmaster/tasks/) When:
- Planning new features or major changes
- Breaking down complex implementation tasks
- Tracking dependencies between tasks
- Managing project roadmap and priorities

#### Use Cursor Rules (.cursor/rules/) When:
- Establishing coding conventions
- Defining architectural patterns
- Setting up development workflow
- Creating reusable development guidelines

#### Use Claude Code (CLAUDE.md) When:
- Working on immediate code changes
- Understanding current implementation state
- Getting context for specific files or components
- Making small to medium-sized improvements

### Current Technical Debt and Known Issues

#### Linting Status
- ✅ All major linting errors fixed (previously 129 errors, now 0)
- ⚠️ Minor warnings remain in version manager adapters (unused parameters with underscore prefix - acceptable)

#### Testing Status
- ✅ Comprehensive test framework established with Vitest
- ✅ Cross-platform testing for version manager installation
- ✅ Integration tests for version manager interfaces
- ⚠️ Some tests failing due to placeholder implementations (expected)

#### Implementation Completeness
- ✅ **Dependency Resolution Engine**: Fully implemented with 240+ tests (Task 7)
- ✅ **Version Management System**: Fully implemented and tested (Task 8)
- ✅ **Command Execution Layer**: Complete cross-platform implementation
- ✅ **Workspace Configuration**: Full environment management system
- ✅ **Workspace Generation System**: Complete IDE workspace configuration (Task 13)
- 🔄 **Real-world Integration**: Needs testing with actual version managers

#### 3. Workspace Generation System (Task 13)
- **Purpose**: Create optimized IDE workspaces based on user's tool selections
- **Architecture**: Manifest-based extensibility for contributors
- **Core Services**:
  - `src/services/workspace-generation/workspace-generation-service.ts` - Main orchestration
  - `src/services/workspace-generation/workspace-requirements-service.ts` - Requirement gathering
  - `src/services/workspace-generation/workspace-manifest-loader.ts` - Manifest loading
  - `src/services/workspace-generation/workspace-manifest-validator.ts` - Validation
  - `src/services/workspace-generation/workspace-template-manager.ts` - Template management
- **Manifest System**:
  - `src/services/workspace-generation/workspace-manifest.ts` - Type definitions
  - `examples/workspace-manifests/` - Example YAML/JSON manifests for contributors
- **IDE Support**: VSCode, Cursor, JetBrains with language-specific extensions
- **UI Integration**: `src/components/WorkspaceGenerationPanel.tsx` - User interface

## Key Files and Their Purpose

### Core Type Definitions
- `src/types/index.ts` - Main type exports
- `src/services/version-manager-types.ts` - Version management types
- `src/types/version-management-ui-types.ts` - UI-specific types

### Service Layer
- `src/services/base-installer.ts` - Foundation installer class
- `src/services/category-installer.ts` - Category-based installation framework
- `src/services/version-manager-installer.ts` - Version manager installation service
- `src/services/dependency-resolution/` - Complete dependency resolution engine
- `src/services/workspace-generation/` - IDE workspace configuration system

### Version Management Core
- `src/services/version-managers/base-adapter.ts` - Base version manager implementation
- `src/services/version-managers/[manager]-adapter.ts` - Specific implementations
- `src/services/command-execution/` - Unified command execution system
- `src/services/workspace-configuration/` - Environment and workspace management

### User Interface
- `src/components/version-management/` - Version management UI components
- `src/components/CategoryGrid.tsx` - Tool category display
- `src/components/JobRoleQuestionnaire.tsx` - Experience assessment
- `src/components/WorkspaceGenerationPanel.tsx` - Workspace generation UI
- `src/components/TabbedLayout.tsx` - Tab navigation for different sections

### Testing Infrastructure
- `src/services/__tests__/` - Service layer tests
- `tests/integration/` - Integration test suites
- `vitest.config.ts` - Test configuration

## Codebase Navigation Map

### Quick Navigation by Feature Area

#### Version Management System
- **Core Types**: `src/services/version-manager-types.ts` - All version management interfaces
- **Main Service**: `src/services/version-manager-installer.ts` - Installation orchestration
- **Adapters**: `src/services/version-managers/` - Individual version manager implementations
  - `base-adapter.ts` - Abstract base class for all adapters
  - `mise-adapter.ts` - Universal version manager
  - `nvm-adapter.ts` - Node.js versions
  - `pyenv-adapter.ts` - Python versions
  - `asdf-adapter.ts` - Multi-language support
  - `rbenv-adapter.ts` - Ruby versions
- **UI Components**: `src/components/version-management/` - React components

#### Dependency Resolution Engine
- **Core Types**: `src/services/dependency-resolution/types.ts` - 60+ interfaces
- **Graph Implementation**: `src/services/dependency-resolution/dependency-graph.ts`
- **Resolver**: `src/services/dependency-resolution/dependency-resolver.ts`
- **Conflict Management**: 
  - `conflict-detector.ts` - Identifies conflicts
  - `conflict-resolver.ts` - Resolution strategies
- **UI**: `src/components/dependency-resolution/` - Visualization components

#### Installation System
- **Base Classes**: `src/services/base-installer.ts` - Abstract installer
- **Platform Installers**:
  - `src/services/windows-installer.ts` - Windows/PowerShell
  - `src/services/macos-installer.ts` - macOS/Homebrew
  - `src/services/linux-installer.ts` - Linux/APT/YUM
- **Category System**: `src/services/category-installer.ts` - Tool categorization

#### Workspace Generation
- **Main Service**: `src/services/workspace-generation/workspace-generation-service.ts`
- **Manifest System**: `src/services/workspace-generation/workspace-manifest.ts`
- **IDE Integration**: `src/services/workspace-generation/workspace-ide-integration.ts`
- **Examples**: `examples/workspace-manifests/` - YAML/JSON examples

#### Command Execution Layer
- **Factory**: `src/services/command-execution/command-executor-factory.ts`
- **Base**: `src/services/command-execution/base-command-executor.ts`
- **Platform Adapters**:
  - `platform-adapters/unix-adapter.ts` - Linux/macOS
  - `platform-adapters/windows-adapter.ts` - Windows

#### Detection Systems
- **OS Detection**: `src/shared/os-detector.ts` - Platform identification
- **Language Detection**: `src/shared/language-detector.ts` - Installed languages
- **Framework Detection**: `src/shared/framework-detector.ts` - Project frameworks
- **IDE Detection**: `src/shared/ide-detector.ts` - Installed IDEs

#### Type System Organization
- **Main Types**: `src/types/index.ts` - Central type exports
- **UI Types**: `src/types/ui-types.ts` - Component prop types
- **Job Role Types**: `src/types/job-role-types.ts` - Role definitions
- **Experience Types**: `src/types/experience-types.ts` - Assessment types
- **Electron Types**: `src/types/electron.d.ts` - IPC definitions

### Common Operations Guide

#### Adding a New Programming Language
1. Update `src/shared/manifest-types.ts` - Add to ProgrammingLanguage type
2. Create version manager adapter in `src/services/version-managers/`
3. Update `src/services/version-manager-factory.ts` - Add to factory
4. Add language detection in `src/shared/language-detector.ts`
5. Create workspace manifest in `examples/workspace-manifests/`

#### Adding a New Development Tool
1. Update `src/shared/manifest-types.ts` - Add to appropriate category
2. Add to sample manifest in `src/shared/sample-manifest.ts`
3. Update category installer for tool-specific logic
4. Add IDE extensions/config in workspace generation

#### Creating a New Job Role
1. Add to `src/data/job-role-configs.ts` - Define role configuration
2. Update `src/types/job-role-types.ts` - Add type if needed
3. Test with `src/services/job-role-assessment.ts`
4. Update UI in `src/components/JobRoleQuestionnaire.tsx`

#### Fixing Linting/Type Errors
1. Type errors: Start at `src/types/` for type definitions
2. Service types: Check service-specific `*-types.ts` files
3. Import errors: Verify paths in `tsconfig.json` files
4. Lint rules: Check `eslint.config.js` for configuration

### Service Integration Points

#### Version Manager ↔ Workspace Configuration
- Integration: `src/services/workspace-configuration/version-manager-integration.ts`
- Environment setup: `src/services/workspace-configuration/environment-manager.ts`
- Shell integration: `src/services/workspace-configuration/shell-integration-manager.ts`

#### Dependency Resolution ↔ Category Installer
- Integration: `src/services/dependency-resolution/dependency-aware-category-installer.ts`
- Handles cross-category dependencies during installation

#### Job Role Assessment ↔ Tool Recommendations
- Assessment: `src/services/job-role-assessment.ts`
- Recommendations: `src/services/job-role-recommendation-service.ts`
- UI Flow: `JobRoleQuestionnaire` → `RecommendationPanel` → `CategoryGrid`

### Testing Infrastructure
- **Unit Tests**: `src/services/__tests__/` - Service layer tests
- **Integration Tests**: `tests/integration/` - Cross-system tests
- **E2E Tests**: `src/services/__tests__/*-e2e.test.ts` - End-to-end scenarios
- **Test Utilities**: `tests/utils/test-helpers.ts` - Common test functions

## Common Prompting Patterns

### For Working on Tasks (RECOMMENDED)
```
"Read CLAUDE_CODE_WORKFLOW.md and start working on the next task following the workflow"
```

### For Resuming After Crash
```
"Read CLAUDE_CODE_WORKFLOW.md and resume work after terminal crash - check session state and continue"
```

### For Continuing Current Work
```
"Read CLAUDE_CODE_WORKFLOW.md and continue working on the current task/subtask"
```

### For Technical Debt Review
```
"Read CLAUDE_CODE_WORKFLOW.md and review the codebase for technical debt, then fix any issues found"
```

## Integration with MCP and Task Management

### MCP Server Integration
If using MCP server for Taskmaster integration, you can combine Claude Code work with task tracking:

```
1. Use MCP tools to get current task: get_task or task-master show <id>
2. Implement changes with Claude Code
3. Use MCP tools to update task progress: update_subtask
4. Mark task complete: set_task_status
```

### Version Control Integration
Claude Code can help with git workflow:

```
"Please:
1. Review current changes with git status and git diff
2. Create appropriate commit message following project conventions
3. Ensure all linting passes before committing"
```

## Task 13 - Workspace Generation System Implementation

### Overview
Task 13 was initially misunderstood as Virtual Desktop Infrastructure (VDI) workspace isolation but was clarified to be IDE workspace configuration. The system creates optimized IDE workspaces based on user's tool selections with language-specific extensions, linters, and settings.

### Key Refactoring Changes
1. **Terminology**: Changed from "isolation" to "optimization" throughout the codebase
2. **Focus**: IDE workspace configuration (VSCode, Cursor, JetBrains) not VDI
3. **Extensibility**: Manifest-based system for contributors to add new language/tool support

### Manifest System for Contributors
Contributors can add new workspace configurations by creating YAML/JSON manifests:

```yaml
# Example: javascript-fullstack-workspace.yaml
id: "javascript-fullstack-workspace"
name: "JavaScript Full-Stack Workspace"
toolId: "nodejs"
stack: "javascript"
ideWorkspaces:
  vscode:
    workspaceExtensions:
      - "dsznajder.es7-react-js-snippets"
      - "dbaeumer.vscode-eslint"
    workspaceSettings:
      "editor.formatOnSave": true
    linters:
      - name: "eslint"
        configFile: ".eslintrc.json"
```

### Integration with HatStart Flow
1. User selects tools and job role
2. Navigate to "Workspace Generation" tab
3. Select IDE and customize settings
4. Generate workspace with all configurations

### Files Created/Modified
- `src/services/workspace-generation/` - Complete service implementation
- `src/components/WorkspaceGenerationPanel.tsx` - UI component
- `src/components/TabbedLayout.tsx` - Tab navigation
- `examples/workspace-manifests/` - Example configurations
- `docs/task-13-workspace-generation-system.md` - Updated documentation

---

**Last Updated**: Based on Task 7, 8 & 13 completion (Dependency Resolution Engine, Version Management System & Workspace Generation)
**Next Major Features**: IDE Configuration completion, Real-world integration testing

This context file will be updated as new features are implemented and patterns are established. Always reference your existing Taskmaster and Cursor context files for the most current project planning and development guidelines.