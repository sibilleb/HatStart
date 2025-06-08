# memorize
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

## Working with Claude Code

### Primary Context Sources
This CLAUDE.md file is your primary source of truth for:
- Product vision and principles
- Codebase navigation map
- Architecture patterns
- Implementation status
- Common operations

### Workflow Integration
1. **Always start with**: `CLAUDE_CODE_WORKFLOW.md` - Your operational manual
2. **Project context from**: This file (CLAUDE.md) - No need to explore external docs
3. **Task management via**: `task-master` CLI commands
4. **Session state in**: `.hatstart_session` file

### No External References Needed
All necessary context is consolidated in:
- **CLAUDE.md** (this file): Complete project context and navigation
- **CLAUDE_CODE_WORKFLOW.md**: Step-by-step operational procedures
- **README.md**: Current project status and progress

You do NOT need to reference:
- Individual task files in `.taskmaster/tasks/`
- Cursor rules in `.cursor/rules/`
- Old documentation in `docs/` folder
- Any PRD or design documents

Everything you need is in the three main files above, plus the actual code!

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

## Lessons Learned: Avoiding Over-Engineering

### Critical Discovery from Feature Review
Our comprehensive review found EVERY task was over-engineered by 5-50x:
- **Total**: ~50,000 lines for what needs ~3,000 lines
- **Root Cause**: Building imagined requirements instead of actual MVP

### Red Flags to Watch For
1. **Abstract base classes before 3+ implementations exist**
2. **"Future-proofing" with unused optional fields**
3. **Multiple algorithm implementations for simple problems**
4. **Deep inheritance hierarchies**
5. **Test files larger than implementation files**
6. **Features built but not connected to UI**

### MVP-First Development Rules
1. **Start with the simplest thing that works**
   - For installers: Just wrap the package manager command
   - For configs: Just write the JSON file
   - For UI: Just show the list and install button

2. **No abstractions until patterns emerge**
   - ❌ Don't create interfaces/base classes preemptively
   - ✅ Extract abstractions after 3+ similar implementations

3. **Connect as you build**
   - Every backend feature needs UI access
   - No "coming soon" placeholders for built features
   - Test the full user flow, not just units

4. **Question every line**
   - Can the platform/library do this for us?
   - Is this solving a real user problem?
   - Will this feature be used in the next 2 releases?

## Coding Principles & Standards

### Core Principles

#### 0. **MVP First, Elegance Later**
```typescript
// ❌ Avoid - Over-engineered from start
abstract class BaseInstaller<T> {
  // 600 lines of abstraction
}

// ✅ Prefer - Start simple
function installTool(tool: string, platform: string) {
  if (platform === 'mac') return exec(`brew install ${tool}`);
  if (platform === 'win') return exec(`choco install ${tool}`);
  // Add abstraction only when pattern is clear
}
```

#### 1. **Type Safety First**
```typescript
// ❌ Avoid
function processTools(tools: any[]): any { }

// ✅ Prefer
function processTools(tools: Tool[]): ProcessResult {
  // Full type safety with interfaces
}
```

#### 2. **Explicit Error Handling**
```typescript
// ❌ Avoid silent failures
try {
  await installer.install();
} catch (e) {
  console.log(e);
}

// ✅ Prefer explicit error handling
try {
  await installer.install();
} catch (error) {
  if (error instanceof DependencyConflictError) {
    return this.handleConflict(error);
  }
  throw new InstallationError(`Failed to install ${tool.name}`, error);
}
```

#### 3. **Platform Abstraction**
```typescript
// ❌ Avoid platform checks in business logic
if (process.platform === 'win32') {
  // Windows specific code
}

// ✅ Prefer abstraction through adapters
const executor = this.commandExecutorFactory.createForPlatform();
await executor.execute(command);
```

#### 4. **Immutability Where Possible**
```typescript
// ❌ Avoid mutating state
tools.forEach(tool => {
  tool.installed = true;
});

// ✅ Prefer immutable updates
const updatedTools = tools.map(tool => ({
  ...tool,
  installed: true
}));
```

#### 5. **Single Responsibility**
- Each service handles ONE domain (e.g., VersionManagerInstaller only handles version managers)
- Each component has ONE clear purpose
- Compose complex behavior from simple, focused units

### Async/Promise Patterns

#### 1. **Consistent Async Handling**
```typescript
// Always use async/await for clarity
async function installTools(tools: Tool[]): Promise<InstallResult[]> {
  // Parallel when independent
  const results = await Promise.all(
    tools.map(tool => this.installTool(tool))
  );
  
  // Sequential when dependent
  for (const tool of tools) {
    await this.installWithDependencies(tool);
  }
}
```

#### 2. **Progress Tracking**
```typescript
// Use callbacks for long operations
async function installWithProgress(
  tool: Tool,
  onProgress: (progress: Progress) => void
): Promise<void> {
  onProgress({ status: 'downloading', percent: 0 });
  // ... installation steps
  onProgress({ status: 'complete', percent: 100 });
}
```

### Testing Standards

#### 1. **Test Structure**
```typescript
describe('VersionManagerInstaller', () => {
  describe('install', () => {
    it('should install version manager successfully', async () => {
      // Arrange
      const mockExecutor = createMockExecutor();
      
      // Act
      const result = await installer.install();
      
      // Assert
      expect(result.success).toBe(true);
    });
  });
});
```

#### 2. **Mock External Dependencies**
```typescript
// Mock file system, network calls, command execution
vi.mock('fs/promises');
vi.mock('../command-executor');
```

### Error Handling Standards

#### 1. **Custom Error Classes**
```typescript
export class HatStartError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'HatStartError';
  }
}

export class DependencyConflictError extends HatStartError {
  constructor(message: string, public conflicts: Conflict[]) {
    super(message, 'DEPENDENCY_CONFLICT');
  }
}
```

#### 2. **Error Recovery**
```typescript
// Provide recovery mechanisms
async function installWithRetry(tool: Tool, maxRetries = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.install(tool);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### Code Organization

#### 1. **File Structure**
```
src/services/version-managers/
├── base-adapter.ts          # Abstract base class
├── mise-adapter.ts          # Concrete implementation
├── types.ts                 # Shared types
├── index.ts                 # Public exports
└── __tests__/              # Tests mirror structure
```

#### 2. **Export Strategy**
```typescript
// index.ts - Control public API
export { MiseAdapter } from './mise-adapter';
export type { VersionManager } from './types';
// Don't export internal utilities
```

### Feature Development Checklist

Before implementing ANY new feature, answer these questions:

#### 1. **MVP Validation**
- [ ] Is this feature needed for basic tool installation?
- [ ] Can users work without this feature?
- [ ] Are we solving a real problem users have TODAY?

#### 2. **Complexity Check**
- [ ] Can this be done in <100 lines?
- [ ] Are we creating abstractions for future use?
- [ ] Can existing libraries/platform handle this?

#### 3. **Integration Planning**
- [ ] How will users access this feature?
- [ ] What's the simplest UI for this?
- [ ] Can we ship and test incrementally?

#### 4. **Code Estimate Reality Check**
- Simple feature (list display, basic form): 50-100 lines
- Medium feature (tool installation): 200-300 lines
- Complex feature (with UI + backend): 500-800 lines
- If estimating >1000 lines: STOP and reconsider scope

### Examples from Our Codebase

#### ❌ What We Built (Over-engineered)
```typescript
// 10,558 lines to install a tool
class BaseInstaller {
  // 653 lines of abstraction
}
class CategoryInstaller extends BaseInstaller {
  // 1,872 lines
}
// ... 7 more layers
```

#### ✅ What We Actually Needed
```typescript
// ~50 lines to install a tool
async function installTool(tool: Tool): Promise<void> {
  const command = getInstallCommand(tool, platform);
  try {
    await exec(command);
    showSuccess(`${tool.name} installed`);
  } catch (error) {
    showError(`Failed to install ${tool.name}: ${error.message}`);
  }
}
```

### Creating Space for Future Features (Without Over-Engineering)

#### 1. **Use Strategic TODOs**
```typescript
async function installTool(tool: Tool): Promise<void> {
  // TODO: Future - Add version management support
  // When needed: if (tool.version) { ... }
  
  const command = getInstallCommand(tool, platform);
  await exec(command);
}
```

#### 2. **Simple Extension Points**
```typescript
// Instead of complex plugin system, just:
interface ToolInstaller {
  name: string;
  install: (tool: Tool) => Promise<void>;
}

const installers: ToolInstaller[] = [
  { name: 'default', install: defaultInstall },
  // Future: Add custom installers here
];
```

#### 3. **Configuration Placeholders**
```typescript
interface AppConfig {
  // Current MVP
  catalogUrl: string;
  
  // Future placeholders (but don't implement yet!)
  // enableVersionManagement?: boolean;
  // pluginDirectory?: string;
  // customInstallers?: string[];
}
```

#### 4. **Document Future Vision**
Create `docs/future-features.md`:
- Version management integration
- Custom installer plugins  
- Cloud backup of configurations
- BUT: Don't build infrastructure for these yet!

#### Key Principle: **Prepare, Don't Implement**
- ✅ Add a TODO comment
- ✅ Design with extension in mind
- ✅ Document future plans
- ❌ Don't build abstractions
- ❌ Don't add "options" 
- ❌ Don't create plugin systems

### Performance Considerations

#### 1. **Lazy Loading**
```typescript
// Load heavy dependencies only when needed
private async getAdapter(): Promise<VersionManagerAdapter> {
  if (!this.adapter) {
    const { MiseAdapter } = await import('./mise-adapter');
    this.adapter = new MiseAdapter();
  }
  return this.adapter;
}
```

#### 2. **Caching**
```typescript
// Cache expensive operations
private cache = new Map<string, DetectionResult>();

async detect(): Promise<DetectionResult> {
  const cacheKey = this.getCacheKey();
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey)!;
  }
  // ... perform detection
  this.cache.set(cacheKey, result);
  return result;
}
```

### UI/React Standards

#### 1. **Component Structure**
```typescript
// Functional components with TypeScript
interface ToolCardProps {
  tool: Tool;
  onInstall: (tool: Tool) => Promise<void>;
}

export function ToolCard({ tool, onInstall }: ToolCardProps) {
  // Use hooks for state and effects
  const [installing, setInstalling] = useState(false);
  
  // Handle async operations properly
  const handleInstall = async () => {
    setInstalling(true);
    try {
      await onInstall(tool);
    } finally {
      setInstalling(false);
    }
  };
}
```

#### 2. **State Management**
- Use React Context for cross-component state
- Keep state close to where it's used
- Derive state when possible instead of syncing

### Security Principles

#### 1. **Command Injection Prevention**
```typescript
// Never concatenate user input into commands
// ❌ Avoid
exec(`install ${userInput}`);

// ✅ Use parameterized commands
execFile('install', [sanitizedInput]);
```

#### 2. **Path Validation**
```typescript
// Always validate and sanitize paths
import { isAbsolute, normalize } from 'path';

function validatePath(userPath: string): string {
  const normalized = normalize(userPath);
  if (!isAbsolute(normalized)) {
    throw new Error('Path must be absolute');
  }
  // Additional validation...
  return normalized;
}
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