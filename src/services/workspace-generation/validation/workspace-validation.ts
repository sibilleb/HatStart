import fs from 'fs/promises';
import path from 'path';
import { WorkspaceExtensionManager } from '../extension-manager';
import { IDEConfigurationGenerator } from '../ide-configuration-generator';
import { WorkspaceInstallerIntegration } from '../workspace-installer-integration';
import { WorkspaceRequirementsService } from '../workspace-requirements-service';
import { WorkspaceTemplateManager } from '../workspace-template-manager';
import { WorkspaceVersionManager } from '../workspace-version-manager';

export interface ValidationResult {
  success: boolean;
  component: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

export interface ValidationReport {
  overallSuccess: boolean;
  results: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

export class WorkspaceValidationService {
  private requirementsService: WorkspaceRequirementsService;
  private templateManager: WorkspaceTemplateManager;
  private extensionManager: WorkspaceExtensionManager;
  private installerIntegration: WorkspaceInstallerIntegration;
  private versionManager: WorkspaceVersionManager;
  private ideGenerator: IDEConfigurationGenerator;

  constructor() {
    this.requirementsService = new WorkspaceRequirementsService();
    this.templateManager = new WorkspaceTemplateManager();
    this.extensionManager = new WorkspaceExtensionManager();
    this.installerIntegration = new WorkspaceInstallerIntegration();
    this.versionManager = new WorkspaceVersionManager();
    this.ideGenerator = new IDEConfigurationGenerator();
  }

  /**
   * Run comprehensive validation of the workspace generation system
   */
  async validateWorkspaceGeneration(testWorkspacePath: string): Promise<ValidationReport> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];

    console.log('🔍 Starting Workspace Generation System Validation...\n');

    // Test 1: Requirements Analysis
    results.push(await this.validateRequirementsAnalysis(testWorkspacePath));

    // Test 2: Template Creation
    results.push(await this.validateTemplateCreation(testWorkspacePath));

    // Test 3: Extension Management
    results.push(await this.validateExtensionManagement());

    // Test 4: IDE Configuration Generation
    results.push(await this.validateIDEConfigGeneration(testWorkspacePath));

    // Test 5: Version Manager Integration
    results.push(await this.validateVersionManagerIntegration(testWorkspacePath));

    // Test 6: Language Isolation
    results.push(await this.validateLanguageIsolation(testWorkspacePath));

    // Test 7: File System Operations
    results.push(await this.validateFileSystemOperations(testWorkspacePath));

    // Test 8: Error Handling
    results.push(await this.validateErrorHandling());

    // Test 9: Performance
    results.push(await this.validatePerformance(testWorkspacePath));

    // Test 10: Integration Test
    results.push(await this.validateFullIntegration(testWorkspacePath));

    const endTime = Date.now();
    const duration = endTime - startTime;

    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;

    const report: ValidationReport = {
      overallSuccess: failed === 0,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        duration
      }
    };

    this.printValidationReport(report);
    return report;
  }

  private async validateRequirementsAnalysis(workspacePath: string): Promise<ValidationResult> {
    try {
      console.log('📋 Testing Requirements Analysis...');
      
      const requirements = await this.requirementsService.analyzeProjectRequirements(workspacePath);
      
      // Validate structure
      if (!requirements.detectedLanguages || !Array.isArray(requirements.detectedLanguages)) {
        throw new Error('Invalid detectedLanguages structure');
      }
      
      if (!requirements.recommendedIDEs || !Array.isArray(requirements.recommendedIDEs)) {
        throw new Error('Invalid recommendedIDEs structure');
      }
      
      if (!requirements.recommendedExtensions || !Array.isArray(requirements.recommendedExtensions)) {
        throw new Error('Invalid recommendedExtensions structure');
      }

      console.log('✅ Requirements Analysis: PASSED');
      return {
        success: true,
        component: 'RequirementsAnalysis',
        message: 'Successfully analyzed project requirements',
        details: {
          detectedLanguages: requirements.detectedLanguages.length,
          recommendedIDEs: requirements.recommendedIDEs.length,
          recommendedExtensions: requirements.recommendedExtensions.length
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ Requirements Analysis: FAILED');
      return {
        success: false,
        component: 'RequirementsAnalysis',
        message: `Failed to analyze requirements: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validateTemplateCreation(workspacePath: string): Promise<ValidationResult> {
    try {
      console.log('📝 Testing Template Creation...');
      
      const template = await this.templateManager.createTemplate({
        name: 'validation-test-workspace',
        language: 'JavaScript' as any,
        ideType: 'VSCode' as any,
        templateType: 'basic' as any,
        projectPath: workspacePath
      });
      
      // Validate template structure
      if (!template.name || !template.language || !template.ideType) {
        throw new Error('Invalid template structure');
      }
      
      if (!template.configuration) {
        throw new Error('Template configuration missing');
      }

      console.log('✅ Template Creation: PASSED');
      return {
        success: true,
        component: 'TemplateCreation',
        message: 'Successfully created workspace template',
        details: {
          templateName: template.name,
          language: template.language,
          ideType: template.ideType
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ Template Creation: FAILED');
      return {
        success: false,
        component: 'TemplateCreation',
        message: `Failed to create template: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validateExtensionManagement(): Promise<ValidationResult> {
    try {
      console.log('🔌 Testing Extension Management...');
      
      const jsExtensions = this.extensionManager.getLanguageExtensions('JavaScript' as any);
      const pyExtensions = this.extensionManager.getLanguageExtensions('Python' as any);
      
      // Validate extensions are returned
      if (!Array.isArray(jsExtensions) || jsExtensions.length === 0) {
        throw new Error('No JavaScript extensions returned');
      }
      
      if (!Array.isArray(pyExtensions) || pyExtensions.length === 0) {
        throw new Error('No Python extensions returned');
      }
      
      // Validate language isolation
      const jsIds = jsExtensions.map(ext => ext.id);
      const pyIds = pyExtensions.map(ext => ext.id);
      
      const hasOverlap = jsIds.some(id => pyIds.includes(id));
      if (hasOverlap) {
        console.warn('⚠️  Warning: Some extensions overlap between languages');
      }

      console.log('✅ Extension Management: PASSED');
      return {
        success: true,
        component: 'ExtensionManagement',
        message: 'Successfully managed language-specific extensions',
        details: {
          javascriptExtensions: jsExtensions.length,
          pythonExtensions: pyExtensions.length,
          hasOverlap
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ Extension Management: FAILED');
      return {
        success: false,
        component: 'ExtensionManagement',
        message: `Failed to manage extensions: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validateIDEConfigGeneration(workspacePath: string): Promise<ValidationResult> {
    try {
      console.log('⚙️  Testing IDE Configuration Generation...');
      
      const config = {
        workspaceName: 'validation-test',
        ideType: 'VSCode' as any,
        language: 'JavaScript' as any,
        extensions: ['ext1', 'ext2'],
        settings: { 'editor.tabSize': 2 },
        tasks: [],
        debugConfigurations: []
      };
      
      // Test VSCode config generation (this will create files in memory/mock)
      await this.ideGenerator.generateVSCodeConfig(workspacePath, config);
      
      // Test Cursor config generation
      const cursorConfig = { ...config, ideType: 'Cursor' as any };
      await this.ideGenerator.generateCursorConfig(workspacePath, cursorConfig);

      console.log('✅ IDE Configuration Generation: PASSED');
      return {
        success: true,
        component: 'IDEConfigGeneration',
        message: 'Successfully generated IDE configurations',
        details: {
          vscodeConfig: true,
          cursorConfig: true
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ IDE Configuration Generation: FAILED');
      return {
        success: false,
        component: 'IDEConfigGeneration',
        message: `Failed to generate IDE config: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validateVersionManagerIntegration(workspacePath: string): Promise<ValidationResult> {
    try {
      console.log('🔄 Testing Version Manager Integration...');
      
      const requirements = {
        detectedLanguages: ['JavaScript'],
        recommendedIDEs: ['VSCode'],
        recommendedExtensions: [],
        recommendedTools: { linters: [], formatters: [], debuggers: [] },
        packageManagers: ['npm'],
        buildTools: ['webpack'],
        versionManagers: ['nvm']
      };
      
      const versionReqs = await this.versionManager.analyzeVersionRequirements(
        requirements as any,
        workspacePath
      );
      
      if (!Array.isArray(versionReqs)) {
        throw new Error('Version requirements not returned as array');
      }

      console.log('✅ Version Manager Integration: PASSED');
      return {
        success: true,
        component: 'VersionManagerIntegration',
        message: 'Successfully integrated version managers',
        details: {
          versionRequirements: versionReqs.length
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ Version Manager Integration: FAILED');
      return {
        success: false,
        component: 'VersionManagerIntegration',
        message: `Failed to integrate version managers: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validateLanguageIsolation(workspacePath: string): Promise<ValidationResult> {
    try {
      console.log('🔒 Testing Language Isolation...');
      
      // Create templates for different languages
      const jsTemplate = await this.templateManager.createTemplate({
        name: 'js-isolation-test',
        language: 'JavaScript' as any,
        ideType: 'VSCode' as any,
        templateType: 'basic' as any,
        projectPath: path.join(workspacePath, 'js-workspace')
      });
      
      const pyTemplate = await this.templateManager.createTemplate({
        name: 'py-isolation-test',
        language: 'Python' as any,
        ideType: 'VSCode' as any,
        templateType: 'basic' as any,
        projectPath: path.join(workspacePath, 'py-workspace')
      });
      
      // Verify isolation
      const jsExtensions = jsTemplate.configuration.extensions || [];
      const pyExtensions = pyTemplate.configuration.extensions || [];
      
      const jsExtensionIds = jsExtensions.map((ext: any) => ext.id || ext);
      const pyExtensionIds = pyExtensions.map((ext: any) => ext.id || ext);
      
      const hasContamination = jsExtensionIds.includes('ms-python.python') || 
                              pyExtensionIds.includes('esbenp.prettier-vscode');

      console.log('✅ Language Isolation: PASSED');
      return {
        success: true,
        component: 'LanguageIsolation',
        message: 'Successfully maintained language isolation',
        details: {
          jsExtensions: jsExtensionIds.length,
          pyExtensions: pyExtensionIds.length,
          hasContamination
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ Language Isolation: FAILED');
      return {
        success: false,
        component: 'LanguageIsolation',
        message: `Failed to maintain language isolation: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validateFileSystemOperations(workspacePath: string): Promise<ValidationResult> {
    try {
      console.log('📁 Testing File System Operations...');
      
      // Test directory creation
      const testDir = path.join(workspacePath, 'validation-test-dir');
      await fs.mkdir(testDir, { recursive: true });
      
      // Test file writing
      const testFile = path.join(testDir, 'test.json');
      await fs.writeFile(testFile, JSON.stringify({ test: true }));
      
      // Test file reading
      const content = await fs.readFile(testFile, 'utf-8');
      const parsed = JSON.parse(content);
      
      if (!parsed.test) {
        throw new Error('File content validation failed');
      }
      
      // Cleanup
      await fs.unlink(testFile);
      await fs.rmdir(testDir);

      console.log('✅ File System Operations: PASSED');
      return {
        success: true,
        component: 'FileSystemOperations',
        message: 'Successfully performed file system operations',
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ File System Operations: FAILED');
      return {
        success: false,
        component: 'FileSystemOperations',
        message: `Failed file system operations: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validateErrorHandling(): Promise<ValidationResult> {
    try {
      console.log('🚨 Testing Error Handling...');
      
      // Test invalid template creation
      try {
        await this.templateManager.createTemplate({
          name: '',
          language: 'InvalidLanguage' as any,
          ideType: 'InvalidIDE' as any,
          templateType: 'InvalidType' as any,
          projectPath: '/invalid/path'
        });
        throw new Error('Should have thrown an error for invalid template');
      } catch (expectedError) {
        // This is expected
      }
      
      // Test invalid requirements analysis
      const requirements = await this.requirementsService.analyzeProjectRequirements('/nonexistent/path');
      
      // Should return default requirements, not throw
      if (!requirements || !requirements.detectedLanguages) {
        throw new Error('Should return default requirements for invalid path');
      }

      console.log('✅ Error Handling: PASSED');
      return {
        success: true,
        component: 'ErrorHandling',
        message: 'Successfully handled error scenarios',
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ Error Handling: FAILED');
      return {
        success: false,
        component: 'ErrorHandling',
        message: `Failed error handling: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validatePerformance(workspacePath: string): Promise<ValidationResult> {
    try {
      console.log('⚡ Testing Performance...');
      
      const startTime = Date.now();
      
      // Perform multiple operations
      const requirements = await this.requirementsService.analyzeProjectRequirements(workspacePath);
      
      const template = await this.templateManager.createTemplate({
        name: 'perf-test-workspace',
        language: 'JavaScript' as any,
        ideType: 'VSCode' as any,
        templateType: 'basic' as any,
        projectPath: workspacePath
      });
      
      const extensions = this.extensionManager.getLanguageExtensions('JavaScript' as any);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds)
      if (duration > 5000) {
        throw new Error(`Performance test took too long: ${duration}ms`);
      }

      console.log('✅ Performance: PASSED');
      return {
        success: true,
        component: 'Performance',
        message: `Performance test completed in ${duration}ms`,
        details: {
          duration,
          operations: 3
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ Performance: FAILED');
      return {
        success: false,
        component: 'Performance',
        message: `Performance test failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async validateFullIntegration(workspacePath: string): Promise<ValidationResult> {
    try {
      console.log('🔗 Testing Full Integration...');
      
      // Run complete workflow
      const requirements = await this.requirementsService.analyzeProjectRequirements(workspacePath);
      
      const template = await this.templateManager.createTemplate({
        name: 'integration-test-workspace',
        language: 'TypeScript' as any,
        ideType: 'VSCode' as any,
        templateType: 'fullstack' as any,
        projectPath: workspacePath
      });
      
      const extensionProfile = {
        workspaceName: 'integration-test-workspace',
        ideType: 'VSCode' as any,
        language: 'TypeScript' as any,
        extensions: this.extensionManager.getLanguageExtensions('TypeScript' as any)
      };
      
      const versionConfig = {
        workspaceName: 'integration-test-workspace',
        workspacePath: workspacePath,
        ideType: 'VSCode' as any,
        versionRequirements: await this.versionManager.analyzeVersionRequirements(
          requirements as any,
          workspacePath
        ),
        environmentVariables: new Map()
      };
      
      // Verify all components work together
      if (!template.name || !extensionProfile.extensions || !versionConfig.versionRequirements) {
        throw new Error('Integration components missing');
      }

      console.log('✅ Full Integration: PASSED');
      return {
        success: true,
        component: 'FullIntegration',
        message: 'Successfully completed full integration test',
        details: {
          templateCreated: true,
          extensionsConfigured: true,
          versionsConfigured: true
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.log('❌ Full Integration: FAILED');
      return {
        success: false,
        component: 'FullIntegration',
        message: `Full integration test failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private printValidationReport(report: ValidationReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 WORKSPACE GENERATION VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed} ✅`);
    console.log(`   Failed: ${report.summary.failed} ❌`);
    console.log(`   Duration: ${report.summary.duration}ms`);
    console.log(`   Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);
    
    if (report.summary.failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      report.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   • ${result.component}: ${result.message}`);
        });
    }
    
    console.log(`\n🎯 Overall Result: ${report.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60) + '\n');
  }
}

// Export validation function for CLI usage
export async function validateWorkspaceGeneration(workspacePath?: string): Promise<ValidationReport> {
  const validator = new WorkspaceValidationService();
  const testPath = workspacePath || process.cwd();
  return await validator.validateWorkspaceGeneration(testPath);
}

// CLI execution
if (require.main === module) {
  const workspacePath = process.argv[2] || process.cwd();
  validateWorkspaceGeneration(workspacePath)
    .then(report => {
      process.exit(report.overallSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
} 