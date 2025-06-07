/**
 * Manifest Migration Utilities
 * Helps migrate manifests from older formats to the current format
 */

import type { ExperienceLevel, ToolExperienceRequirement } from '../types/experience-types';
import type { CategoryManifest, ExperienceLevel as ManifestExperienceLevel, MasterManifest, ToolManifest } from './manifest-types';

/**
 * Migration result interface
 */
export interface MigrationResult<T> {
  success: boolean;
  data?: T;
  changes: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Manifest migration service
 */
export class ManifestMigration {
  /**
   * Migrate a tool manifest to the latest format
   */
  migrateToolManifest(manifest: ToolManifest): MigrationResult<ToolManifest> {
    const changes: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      const migrated = { ...manifest };
      
      // Migrate experienceLevel array to experienceRequirement object
      if (migrated.experienceLevel && !migrated.experienceRequirement) {
        const requirement = this.convertExperienceLevelToRequirement(migrated.experienceLevel);
        if (requirement) {
          migrated.experienceRequirement = requirement;
          changes.push('Converted experienceLevel array to experienceRequirement object');
          
          // Keep the old field for backward compatibility but mark as deprecated
          warnings.push('experienceLevel field is deprecated and will be removed in future versions');
        }
      }
      
      // Add default learning resources if missing
      if (!migrated.learningResources && migrated.documentation) {
        migrated.learningResources = this.generateDefaultLearningResources(migrated);
        if (migrated.learningResources && migrated.learningResources.length > 0) {
          changes.push('Generated default learning resources from documentation links');
        }
      }
      
      // Add difficulty indicators based on tool characteristics
      if (!migrated.difficultyIndicators) {
        migrated.difficultyIndicators = this.generateDifficultyIndicators(migrated);
        if (migrated.difficultyIndicators.length > 0) {
          changes.push('Generated difficulty indicators based on tool characteristics');
        }
      }
      
      return {
        success: true,
        data: migrated,
        changes,
        warnings,
        errors
      };
    } catch (error) {
      errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        changes,
        warnings,
        errors
      };
    }
  }
  
  /**
   * Migrate a category manifest to the latest format
   */
  migrateCategoryManifest(manifest: CategoryManifest): MigrationResult<CategoryManifest> {
    const changes: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      const migrated = { ...manifest };
      
      // Migrate all tools in the category
      if (migrated.tools && migrated.tools.length > 0) {
        migrated.tools = migrated.tools.map((tool, index) => {
          const result = this.migrateToolManifest(tool);
          if (result.success && result.data) {
            result.changes.forEach(change => changes.push(`Tool ${index} (${tool.id}): ${change}`));
            result.warnings.forEach(warning => warnings.push(`Tool ${index} (${tool.id}): ${warning}`));
            return result.data;
          } else {
            result.errors.forEach(error => errors.push(`Tool ${index} (${tool.id}): ${error}`));
            return tool;
          }
        });
      }
      
      return {
        success: errors.length === 0,
        data: migrated,
        changes,
        warnings,
        errors
      };
    } catch (error) {
      errors.push(`Category migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        changes,
        warnings,
        errors
      };
    }
  }
  
  /**
   * Migrate a master manifest to the latest format
   */
  migrateMasterManifest(manifest: MasterManifest): MigrationResult<MasterManifest> {
    const changes: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      const migrated = { ...manifest };
      
      // Migrate all category manifests
      if (migrated.categoryManifests) {
        Object.keys(migrated.categoryManifests).forEach(category => {
          const categoryManifest = migrated.categoryManifests[category as keyof typeof migrated.categoryManifests];
          const result = this.migrateCategoryManifest(categoryManifest);
          
          if (result.success && result.data) {
            migrated.categoryManifests[category as keyof typeof migrated.categoryManifests] = result.data;
            result.changes.forEach(change => changes.push(`Category ${category}: ${change}`));
            result.warnings.forEach(warning => warnings.push(`Category ${category}: ${warning}`));
          } else {
            result.errors.forEach(error => errors.push(`Category ${category}: ${error}`));
          }
        });
      }
      
      return {
        success: errors.length === 0,
        data: migrated,
        changes,
        warnings,
        errors
      };
    } catch (error) {
      errors.push(`Master manifest migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        changes,
        warnings,
        errors
      };
    }
  }
  
  /**
   * Convert old experienceLevel array to new experienceRequirement object
   */
  private convertExperienceLevelToRequirement(levels: ManifestExperienceLevel[]): ToolExperienceRequirement | null {
    if (!levels || levels.length === 0) {
      return null;
    }
    
    // Map manifest experience levels to our experience types (excluding 'expert')
    const levelMapping: Record<ManifestExperienceLevel, ExperienceLevel | null> = {
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced',
      'expert': 'advanced' // Map expert to advanced since we don't have expert in our types
    };
    
    // Convert and filter levels
    const convertedLevels = levels
      .map(level => levelMapping[level])
      .filter((level): level is ExperienceLevel => level !== null);
    
    if (convertedLevels.length === 0) {
      return null;
    }
    
    // Sort levels to find minimum and recommended
    const levelOrder: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];
    const sortedLevels = convertedLevels
      .filter((level, index, self) => self.indexOf(level) === index) // Remove duplicates
      .sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b));
    
    const minimumLevel = sortedLevels[0];
    const recommendedLevel = sortedLevels[Math.floor(sortedLevels.length / 2)]; // Use median as recommended
    
    return {
      minimumLevel,
      recommendedLevel: recommendedLevel !== minimumLevel ? recommendedLevel : undefined,
      rationale: this.generateRationale(minimumLevel)
    };
  }
  
  /**
   * Generate rationale based on experience levels
   */
  private generateRationale(minimum: ExperienceLevel): string {
    if (minimum === 'beginner') {
      return 'This tool is suitable for beginners with clear documentation and gentle learning curve.';
    } else if (minimum === 'intermediate') {
      return 'This tool requires some programming experience and familiarity with development concepts.';
    } else if (minimum === 'advanced') {
      return 'This tool is designed for experienced developers and requires deep technical knowledge.';
    }
    
    return 'Experience requirements vary based on use case.';
  }
  
  /**
   * Generate default learning resources from documentation
   */
  private generateDefaultLearningResources(manifest: ToolManifest): ToolManifest['learningResources'] {
    const resources: NonNullable<ToolManifest['learningResources']> = [];
    
    if (manifest.documentation) {
      if (manifest.documentation.quickStart) {
        resources.push({
          title: `${manifest.name} Quick Start Guide`,
          url: manifest.documentation.quickStart,
          type: 'tutorial',
          experienceLevel: 'beginner'
        });
      }
      
      if (manifest.documentation.officialDocs) {
        resources.push({
          title: `${manifest.name} Official Documentation`,
          url: manifest.documentation.officialDocs,
          type: 'documentation',
          experienceLevel: 'intermediate'
        });
      }
      
      if (manifest.documentation.apiReference) {
        resources.push({
          title: `${manifest.name} API Reference`,
          url: manifest.documentation.apiReference,
          type: 'documentation',
          experienceLevel: 'advanced'
        });
      }
      
      if (manifest.documentation.tutorials && manifest.documentation.tutorials.length > 0) {
        manifest.documentation.tutorials.slice(0, 3).forEach((url, index) => {
          resources.push({
            title: `${manifest.name} Tutorial ${index + 1}`,
            url,
            type: 'tutorial',
            experienceLevel: 'beginner'
          });
        });
      }
      
      if (manifest.documentation.videos && manifest.documentation.videos.length > 0) {
        manifest.documentation.videos.slice(0, 2).forEach((url, index) => {
          resources.push({
            title: `${manifest.name} Video Tutorial ${index + 1}`,
            url,
            type: 'video',
            experienceLevel: 'beginner'
          });
        });
      }
    }
    
    return resources;
  }
  
  /**
   * Generate difficulty indicators based on tool characteristics
   */
  private generateDifficultyIndicators(manifest: ToolManifest): string[] {
    const indicators: string[] = [];
    
    // Check for complex configuration
    if (manifest.configuration && manifest.configuration.length > 10) {
      indicators.push('Requires extensive configuration');
    }
    
    // Check for many dependencies
    if (manifest.dependencies && manifest.dependencies.filter(d => d.type === 'required').length > 5) {
      indicators.push('Has many dependencies to manage');
    }
    
    // Check for command-line only tools
    if (manifest.category === 'devops' || manifest.category === 'backend') {
      const hasGui = manifest.tags?.some(tag => 
        tag.toLowerCase().includes('gui') || 
        tag.toLowerCase().includes('desktop')
      );
      if (!hasGui) {
        indicators.push('Command-line interface only');
      }
    }
    
    // Check for security-related tools
    if (manifest.category === 'security') {
      indicators.push('Requires security knowledge');
    }
    
    // Check for database tools
    if (manifest.category === 'database') {
      indicators.push('Requires understanding of database concepts');
    }
    
    // Check for specific complex tools
    const complexTools = ['kubernetes', 'docker', 'terraform', 'ansible', 'webpack'];
    if (complexTools.includes(manifest.id.toLowerCase())) {
      indicators.push('Steep learning curve');
    }
    
    // Check for tools requiring programming knowledge
    if (manifest.category === 'language' || manifest.category === 'backend') {
      indicators.push('Requires programming knowledge');
    }
    
    return indicators;
  }
}

// Export singleton instance
export const manifestMigration = new ManifestMigration(); 