import fs from 'fs/promises';
import * as _path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtensionManager } from '../extension-manager';
import { IDEConfigurationGenerator } from '../ide-configuration-generator';
import { WorkspaceInstallerIntegration } from '../workspace-installer-integration';
import { WorkspaceRequirementsService } from '../workspace-requirements-service';
import { WorkspaceTemplateManager } from '../workspace-template-manager';
import { WorkspaceVersionManager } from '../workspace-version-manager';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../../shared/ide-detector');
vi.mock('../category-installer/category-installer');

describe('Workspace Generation System', () => {
  let tempDir: string;
  let requirementsService: WorkspaceRequirementsService;
  let templateManager: WorkspaceTemplateManager;
  let extensionManager: ExtensionManager;
  let installerIntegration: WorkspaceInstallerIntegration;
  let versionManager: WorkspaceVersionManager;
  let ideGenerator: IDEConfigurationGenerator;

  beforeEach(async () => {
    tempDir = '/tmp/test-workspace';
    
    // Initialize services
    requirementsService = new WorkspaceRequirementsService();
    templateManager = new WorkspaceTemplateManager();
    extensionManager = new ExtensionManager();
    installerIntegration = new WorkspaceInstallerIntegration();
    versionManager = new WorkspaceVersionManager();
    ideGenerator = new IDEConfigurationGenerator();

    // Mock filesystem operations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('{}');
    vi.mocked(fs.access).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('WorkspaceRequirementsService', () => {
    it('should detect available IDEs', async () => {
      const availableIDEs = await requirementsService.detectAvailableIDEs();
      
      expect(availableIDEs).toBeInstanceOf(Array);
      // Test will depend on mocked IDE detector results
    });

    it('should detect technology stacks', async () => {
      const detectedStacks = await requirementsService.detectTechnologyStacks();
      
      expect(detectedStacks).toBeInstanceOf(Array);
      // Test will depend on mocked system detection results
    });

    it('should generate workspace requirements for selected stacks', () => {
      const requirements = requirementsService.generateWorkspaceRequirements(
        ['javascript', 'typescript'],
        'vscode'
      );

      expect(requirements).toHaveLength(2);
      expect(requirements[0].stack).toBe('javascript');
      expect(requirements[1].stack).toBe('typescript');
      expect(requirements[0].extensions).toContain('ms-vscode.vscode-eslint');
    });

    it('should gather complete workspace requirements', async () => {
      const requirements = await requirementsService.gatherRequirements(
        ['javascript'],
        'vscode',
        tempDir
      );
      
      expect(requirements.selectedIDE).toBe('vscode');
      expect(requirements.userSelectedStacks).toEqual(['javascript']);
      expect(requirements.workspaceRequirements).toHaveLength(1);
      expect(requirements.workspaceStrategy).toBe('language-optimized');
    });
  });

  describe('WorkspaceTemplateManager', () => {
    it('should get all available templates', () => {
      const templates = templateManager.getAllTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('stack');
      expect(templates[0]).toHaveProperty('ideType');
    });

    it('should get templates for specific stack', () => {
      const jsTemplates = templateManager.getTemplatesForStack('javascript', 'vscode');
      
      expect(jsTemplates.length).toBeGreaterThan(0);
      expect(jsTemplates.every(t => t.stack === 'javascript')).toBe(true);
      expect(jsTemplates.every(t => t.ideType === 'vscode')).toBe(true);
    });

    it('should get recommended template', () => {
      const template = templateManager.getRecommendedTemplate('javascript', 'vscode', 'basic');
      
      expect(template).toBeDefined();
      expect(template?.stack).toBe('javascript');
      expect(template?.ideType).toBe('vscode');
      expect(template?.templateType).toBe('basic');
    });

    it('should generate workspace structure from template', () => {
      const template = templateManager.getRecommendedTemplate('javascript', 'vscode', 'basic');
      if (!template) throw new Error('Template not found');
      
      const context = {
        projectName: 'test-project',
        stack: 'javascript' as const,
        ideType: 'vscode' as const,
        templateType: 'basic' as const,
        workspaceRoot: tempDir,
        customizations: {},
        detectedTools: {}
      };
      
      const workspace = templateManager.generateWorkspaceStructure(template, context);
      
      expect(workspace.directories).toContain('src');
      expect(workspace.files.some(f => f.path === 'package.json')).toBe(true);
      expect(workspace.extensions).toContain('esbenp.prettier-vscode');
    });
  });

  describe('WorkspaceExtensionManager', () => {
    it('should recommend language-specific extensions', () => {
      const jsExtensions = extensionManager.getExtensionsForStack('javascript', 'vscode');
      const pyExtensions = extensionManager.getExtensionsForStack('python', 'vscode');

      expect(jsExtensions.some(e => e.id === 'esbenp.prettier-vscode')).toBe(true);
      expect(pyExtensions.some(e => e.id === 'ms-python.python')).toBe(true);
      
      // Verify no cross-contamination
      const jsIds = jsExtensions.map(ext => ext.id);
      const pyIds = pyExtensions.map(ext => ext.id);
      expect(jsIds).not.toContain('ms-python.python');
      expect(pyIds).not.toContain('esbenp.prettier-vscode');
    });

    it('should create extension profile for workspace', () => {
      const profile = extensionManager.createWorkspaceExtensionProfile('javascript', 'vscode');
      
      expect(profile.stack).toBe('javascript');
      expect(profile.ide).toBe('vscode');
      expect(profile.extensions.length).toBeGreaterThan(0);
      expect(profile.configuration.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate IDE-specific extension files', async () => {
      const profile = extensionManager.createWorkspaceExtensionProfile('javascript', 'vscode');

      const files = await extensionManager.generateExtensionFiles(tempDir, profile);

      expect(files.length).toBeGreaterThan(0);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('WorkspaceInstallerIntegration', () => {
    it('should install workspace with language tools', async () => {
      const request = {
        workspaceName: 'test-workspace',
        workspacePath: tempDir,
        preferredIDE: 'vscode',
        languages: ['javascript'],
        templateType: 'basic' as const
      };

      const result = await installerIntegration.installWorkspace(request);

      expect(result).toBeDefined();
      // Result will depend on mocked installer behavior
    });

    it('should verify installation success', async () => {
      const result = await installerIntegration.verifyInstallation({
        workspacePath: tempDir,
        expectedComponents: {
          ide: 'vscode',
          extensions: ['ms-vscode.vscode-eslint'],
          languages: ['javascript'],
          tools: ['eslint', 'prettier']
        }
      });

      expect(result).toBeDefined();
      expect(result.verified).toBeDefined();
    });
  });

  describe('WorkspaceVersionManager', () => {
    it('should get version manager for language', () => {
      const jsVersionManager = versionManager.getVersionManagerForLanguage('javascript');
      const pyVersionManager = versionManager.getVersionManagerForLanguage('python');
      
      expect(jsVersionManager).toBe('nvm');
      expect(pyVersionManager).toBe('pyenv');
    });

    it('should configure workspace-specific versions', async () => {
      const config = {
        language: 'javascript',
        version: '18.0.0',
        versionManager: 'nvm',
        workspacePath: tempDir
      };

      const result = await versionManager.configureWorkspaceVersion(config);

      expect(result.success).toBeDefined();
    });

    it('should detect existing version files', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('18.0.0');
      
      const versions = await versionManager.detectExistingVersions(tempDir);
      
      expect(versions).toBeDefined();
    });
  });

  describe('IDEConfigurationGenerator', () => {
    it('should generate IDE configuration files', async () => {
      const config = {
        ideType: 'vscode',
        workspacePath: tempDir,
        settings: { 'editor.tabSize': 2 },
        extensions: ['ms-vscode.vscode-eslint'],
        tasks: [],
        launch: {
          version: '0.2.0',
          configurations: []
        }
      };

      const result = await ideGenerator.generateConfiguration(config);

      expect(result.success).toBeDefined();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should generate workspace file', async () => {
      const workspace = {
        folders: [{ path: tempDir }],
        settings: { 'editor.tabSize': 2 },
        extensions: {
          recommendations: ['ms-vscode.vscode-eslint']
        }
      };

      const result = await ideGenerator.generateWorkspaceFile(tempDir, 'test-workspace', workspace);

      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should create complete IDE workspace configuration', async () => {
      // Test the full workflow
      const requirements = await requirementsService.gatherRequirements(
        ['typescript'],
        'vscode',
        tempDir
      );
      
      const template = templateManager.getRecommendedTemplate('typescript', 'vscode', 'basic');
      if (!template) throw new Error('Template not found');
      
      const context = {
        projectName: 'integration-test',
        stack: 'typescript' as const,
        ideType: 'vscode' as const,
        templateType: 'basic' as const,
        workspaceRoot: tempDir,
        customizations: {},
        detectedTools: {}
      };
      
      const workspace = templateManager.generateWorkspaceStructure(template, context);

      const extensionProfile = extensionManager.createWorkspaceExtensionProfile('typescript', 'vscode');
      const extensionFiles = await extensionManager.generateExtensionFiles(tempDir, extensionProfile);

      const versionConfig = {
        language: 'javascript',
        version: '18.0.0',
        versionManager: 'nvm',
        workspacePath: tempDir
      };
      const versionResult = await versionManager.configureWorkspaceVersion(versionConfig);

      // Verify all components worked together
      expect(requirements.workspaceRequirements).toHaveLength(1);
      expect(workspace.files.length).toBeGreaterThan(0);
      expect(extensionFiles.length).toBeGreaterThan(0);
      expect(versionResult).toBeDefined();
      
      // Verify files were created
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.any(String)
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('extensions.json'),
        expect.any(String)
      );
    });

    it('should maintain language optimization across multiple workspaces', async () => {
      // Create JavaScript workspace configuration
      const jsReqs = requirementsService.generateWorkspaceRequirements(['javascript'], 'vscode');
      const jsExtensions = extensionManager.getExtensionsForStack('javascript', 'vscode');

      // Create Python workspace configuration
      const pyReqs = requirementsService.generateWorkspaceRequirements(['python'], 'vscode');
      const pyExtensions = extensionManager.getExtensionsForStack('python', 'vscode');

      // Verify language-specific optimization
      const jsExtensionIds = jsExtensions.map(ext => ext.id);
      const pyExtensionIds = pyExtensions.map(ext => ext.id);

      // Should not have cross-language extensions
      expect(jsExtensionIds).not.toContain('ms-python.python');
      expect(pyExtensionIds).not.toContain('esbenp.prettier-vscode');
      
      // Should have language-specific settings
      expect(jsReqs[0].settings['javascript.preferences.includePackageJsonAutoImports']).toBeDefined();
      expect(pyReqs[0].settings['python.defaultInterpreterPath']).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete workspace requirement gathering quickly', async () => {
      const startTime = Date.now();
      
      const requirements = await requirementsService.gatherRequirements(
        ['javascript', 'typescript'],
        'vscode',
        tempDir
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
      expect(requirements).toBeDefined();
    });

    it('should generate workspace structure efficiently', () => {
      const startTime = Date.now();
      
      const template = templateManager.getRecommendedTemplate('javascript', 'vscode', 'basic');
      if (!template) throw new Error('Template not found');
      
      const context = {
        projectName: 'perf-test',
        stack: 'javascript' as const,
        ideType: 'vscode' as const,
        templateType: 'basic' as const,
        workspaceRoot: tempDir,
        customizations: {},
        detectedTools: {}
      };
      
      const workspace = templateManager.generateWorkspaceStructure(template, context);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
      expect(workspace.files.length).toBeGreaterThan(0);
    });
  });
}); 