# Workspace Generation System

The Workspace Generation System is a comprehensive solution for creating language-isolated IDE workspaces in VDI environments. It automatically detects project requirements, generates appropriate configurations, and sets up development environments with the correct tools, extensions, and version managers.

## 🏗️ Architecture Overview

The system follows a modular architecture with clear separation of concerns:

```
Workspace Generation System
├── Requirements Analysis      # Detect technologies and tools
├── Template Management       # Generate workspace templates
├── Extension Management      # Handle IDE extensions
├── IDE Configuration        # Generate IDE-specific configs
├── Version Manager Integration # Handle language versions
├── Installer Integration    # Coordinate tool installation
└── Validation & Testing     # Ensure system reliability
```

## 📦 Core Components

### 1. WorkspaceRequirementsService
**Purpose**: Analyzes project directories to detect technologies, frameworks, and tooling requirements.

**Key Features**:
- Technology stack detection (JavaScript, TypeScript, Python, Java, Rust, Go, C#, C++, PHP, Ruby)
- Package manager identification (npm, yarn, pip, maven, cargo, etc.)
- Build tool detection (webpack, vite, gradle, etc.)
- IDE recommendations based on detected technologies
- Extension recommendations per language

**Usage**:
```typescript
const service = new WorkspaceRequirementsService();
const requirements = await service.analyzeProjectRequirements('/path/to/project');
```

### 2. WorkspaceTemplateManager
**Purpose**: Creates and manages workspace templates for different languages and IDE combinations.

**Key Features**:
- 10 template types: basic, fullstack, library, microservice, desktop, mobile, data-science, devops, testing, documentation
- Built-in templates for JavaScript, TypeScript, Python, Java
- Support for VSCode and Cursor IDEs
- Language-isolated architecture preventing extension conflicts
- Template customization and variable substitution

**Usage**:
```typescript
const manager = new WorkspaceTemplateManager();
const template = await manager.createTemplate({
  name: 'my-js-workspace',
  language: 'JavaScript',
  ideType: 'VSCode',
  templateType: 'fullstack',
  projectPath: '/path/to/workspace'
});
```

### 3. WorkspaceExtensionManager
**Purpose**: Manages IDE extensions with language-specific recommendations and conflict detection.

**Key Features**:
- Language-specific extension databases
- Conflict detection and resolution
- IDE-specific file generation (.vscode/extensions.json, .cursor/extensions.json)
- Extension categorization (linters, formatters, debuggers, etc.)
- Cross-language contamination prevention

**Usage**:
```typescript
const manager = new WorkspaceExtensionManager();
const extensions = manager.getLanguageExtensions('JavaScript');
await manager.generateExtensionFiles('/workspace/path', profile);
```

### 4. IDEConfigurationGenerator
**Purpose**: Generates IDE-specific configuration files and settings.

**Key Features**:
- VSCode configuration generation (.vscode/settings.json, tasks.json, launch.json)
- Cursor configuration generation (.cursor/settings.json)
- JetBrains configuration support (.idea/ files)
- Language-specific settings and tool configurations
- Debug configuration setup

**Usage**:
```typescript
const generator = new IDEConfigurationGenerator();
await generator.generateVSCodeConfig('/workspace/path', config);
```

### 5. WorkspaceVersionManager
**Purpose**: Integrates version managers to ensure correct tool versions per workspace.

**Key Features**:
- Support for nvm, pyenv, jenv, rustup, gvm, rbenv
- Version requirement analysis from project files
- Automatic version installation with fallback support
- Environment variable and PATH configuration
- Version configuration file generation (.nvmrc, .python-version, etc.)

**Usage**:
```typescript
const manager = new WorkspaceVersionManager();
const versionReqs = await manager.analyzeVersionRequirements(requirements, '/workspace/path');
await manager.setupWorkspaceVersions(versionConfig);
```

### 6. WorkspaceInstallerIntegration
**Purpose**: Coordinates with the CategoryInstaller framework for automated tool installation.

**Key Features**:
- Phase-based installation process (detection, IDE setup, extension install, toolchain setup, workspace creation, validation)
- Progress tracking and error handling
- Multi-language workspace support with proper isolation
- Installation plan generation and execution
- Workspace status checking and repair functionality

**Usage**:
```typescript
const integration = new WorkspaceInstallerIntegration();
const plan = await integration.createInstallationPlan(request);
const result = await integration.installWorkspace(request, progressCallback);
```

## 🎯 Key Principles

### Language Isolation
The system ensures that each programming language gets its own isolated workspace to prevent:
- Extension conflicts between different language ecosystems
- Performance degradation from unnecessary extensions
- Configuration interference between different toolchains
- Version conflicts between language-specific tools

### IDE Agnostic Design
While primarily supporting VSCode and Cursor, the architecture allows for:
- Easy addition of new IDE support
- Consistent configuration patterns across IDEs
- IDE-specific optimizations and features
- Fallback configurations for unsupported IDEs

### Extensible Architecture
The modular design enables:
- Addition of new programming languages
- Integration of new version managers
- Support for additional template types
- Custom extension databases
- Plugin-based functionality

## 🚀 Usage Examples

### Basic Workspace Creation
```typescript
// 1. Analyze project requirements
const requirements = await requirementsService.analyzeProjectRequirements('/my/project');

// 2. Create workspace template
const template = await templateManager.createTemplate({
  name: 'my-typescript-workspace',
  language: 'TypeScript',
  ideType: 'VSCode',
  templateType: 'fullstack',
  projectPath: '/workspaces/typescript-workspace'
});

// 3. Generate extension configuration
const extensionProfile = {
  workspaceName: 'my-typescript-workspace',
  ideType: 'VSCode',
  language: 'TypeScript',
  extensions: extensionManager.getLanguageExtensions('TypeScript')
};
await extensionManager.generateExtensionFiles('/workspaces/typescript-workspace', extensionProfile);

// 4. Setup version management
const versionConfig = {
  workspaceName: 'my-typescript-workspace',
  workspacePath: '/workspaces/typescript-workspace',
  ideType: 'VSCode',
  versionRequirements: await versionManager.analyzeVersionRequirements(requirements, '/workspaces/typescript-workspace'),
  environmentVariables: new Map()
};
await versionManager.setupWorkspaceVersions(versionConfig);
```

### Automated Installation
```typescript
const request = {
  workspaceName: 'full-stack-workspace',
  workspacePath: '/workspaces/full-stack',
  ideType: 'VSCode',
  languages: ['JavaScript', 'Python'],
  requirements: {
    detectedLanguages: ['JavaScript', 'Python'],
    recommendedIDEs: ['VSCode'],
    recommendedExtensions: [...],
    recommendedTools: { linters: [...], formatters: [...], debuggers: [...] },
    packageManagers: ['npm', 'pip'],
    buildTools: ['webpack'],
    versionManagers: ['nvm', 'pyenv']
  }
};

const result = await installerIntegration.installWorkspace(request, (progress) => {
  console.log(`Installation progress: ${progress.percentage}%`);
});
```

## 🧪 Testing and Validation

### Automated Testing
The system includes comprehensive test suites:

```bash
# Run unit tests
npm test src/services/workspace-generation

# Run integration tests
npm run test:integration

# Run validation script
node src/services/workspace-generation/validation/workspace-validation.js /path/to/test/workspace
```

### Validation Service
Use the built-in validation service to verify system functionality:

```typescript
import { WorkspaceValidationService } from './validation/workspace-validation';

const validator = new WorkspaceValidationService();
const report = await validator.validateWorkspaceGeneration('/test/workspace');

console.log(`Validation ${report.overallSuccess ? 'PASSED' : 'FAILED'}`);
console.log(`Success Rate: ${(report.summary.passed / report.summary.total * 100).toFixed(1)}%`);
```

## 📁 File Structure

```
src/services/workspace-generation/
├── workspace-requirements-service.ts    # Requirements analysis
├── workspace-template-manager.ts        # Template management
├── extension-manager.ts                 # Extension handling
├── ide-configuration-generator.ts       # IDE config generation
├── workspace-version-manager.ts         # Version management
├── workspace-installer-integration.ts   # Installation coordination
├── workspace-naming-service.ts          # Naming conventions
├── validation/
│   └── workspace-validation.ts          # Validation service
├── __tests__/
│   └── workspace-generation.test.ts     # Test suite
└── README.md                           # This documentation
```

## 🔧 Configuration

### Environment Variables
```bash
# API keys for AI-powered features (optional)
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Version manager base URLs (optional)
NVM_BASE_URL=https://github.com/nvm-sh/nvm
PYENV_BASE_URL=https://github.com/pyenv/pyenv
```

### Template Customization
Templates can be customized by modifying the built-in templates or creating new ones:

```typescript
const customTemplate = {
  name: 'custom-react-template',
  language: 'JavaScript',
  ideType: 'VSCode',
  configuration: {
    settings: {
      'editor.tabSize': 2,
      'editor.insertSpaces': true,
      'typescript.preferences.quoteStyle': 'single'
    },
    extensions: [
      'esbenp.prettier-vscode',
      'bradlc.vscode-tailwindcss'
    ],
    tasks: [...],
    debugConfigurations: [...]
  }
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Extension Conflicts**
   - Ensure language isolation is maintained
   - Check extension compatibility matrices
   - Use conflict detection tools

2. **Version Manager Issues**
   - Verify version manager installation
   - Check PATH configuration
   - Validate version file formats

3. **IDE Configuration Problems**
   - Verify IDE-specific file formats
   - Check configuration syntax
   - Ensure proper file permissions

### Debug Mode
Enable debug logging for detailed troubleshooting:

```typescript
process.env.DEBUG = 'workspace-generation:*';
```

## 🤝 Contributing

### Adding New Languages
1. Update `WorkspaceRequirementsService` with detection logic
2. Add language-specific extensions to `WorkspaceExtensionManager`
3. Create templates in `WorkspaceTemplateManager`
4. Add version manager support in `WorkspaceVersionManager`
5. Update tests and documentation

### Adding New IDEs
1. Implement configuration generation in `IDEConfigurationGenerator`
2. Add IDE-specific file formats and structures
3. Update extension management for IDE-specific extension files
4. Add IDE detection logic
5. Create comprehensive tests

## 📚 API Reference

### Interfaces

```typescript
interface WorkspaceRequirements {
  detectedLanguages: string[];
  recommendedIDEs: string[];
  recommendedExtensions: ExtensionRecommendation[];
  recommendedTools: {
    linters: string[];
    formatters: string[];
    debuggers: string[];
  };
  packageManagers: string[];
  buildTools: string[];
  versionManagers: string[];
}

interface WorkspaceTemplate {
  name: string;
  language: string;
  ideType: string;
  templateType: string;
  configuration: {
    settings: Record<string, any>;
    extensions: string[];
    tasks: any[];
    debugConfigurations: any[];
  };
}

interface ExtensionRecommendation {
  id: string;
  name: string;
  category: ExtensionCategory;
  description?: string;
  publisher?: string;
  version?: string;
  isRequired?: boolean;
  conflictsWith?: string[];
}
```

## 📄 License

This workspace generation system is part of the HatStart VDI project and follows the project's licensing terms.

---

For more information, see the main project documentation or contact the development team. 