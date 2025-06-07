# Manifest Migration Guide

## Overview

This guide explains how to migrate HatStart manifests from the old `experienceLevel` array format to the new `experienceRequirement` object format. The new format provides more detailed information about tool experience requirements, making it easier to recommend appropriate tools based on user experience levels.

## What's Changed

### Old Format
```typescript
{
  experienceLevel: ['beginner', 'intermediate', 'advanced']
}
```

### New Format
```typescript
{
  experienceRequirement: {
    minimumLevel: 'beginner',
    recommendedLevel: 'intermediate',
    rationale: 'While this tool can be used by beginners, intermediate knowledge is recommended for production use.',
    alternativesForBeginners: ['simpler-tool-id']
  },
  learningResources: [
    {
      title: 'Getting Started Guide',
      url: 'https://example.com/guide',
      type: 'tutorial',
      experienceLevel: 'beginner'
    }
  ],
  difficultyIndicators: [
    'Requires understanding of async programming',
    'Command-line interface only'
  ]
}
```

## Migration Process

### Automatic Migration

The `ManifestMigration` utility can automatically migrate your manifests:

```typescript
import { manifestMigration } from './shared/manifest-migration';

// Migrate a single tool manifest
const toolResult = manifestMigration.migrateToolManifest(oldToolManifest);
if (toolResult.success) {
  console.log('Migration successful:', toolResult.changes);
  // Use toolResult.data as the migrated manifest
}

// Migrate a category manifest (includes all tools)
const categoryResult = manifestMigration.migrateCategoryManifest(oldCategoryManifest);

// Migrate a master manifest (includes all categories and tools)
const masterResult = manifestMigration.migrateMasterManifest(oldMasterManifest);
```

### What the Migration Does

1. **Converts Experience Levels**
   - Takes the lowest level as `minimumLevel`
   - Uses the median level as `recommendedLevel`
   - Maps 'expert' to 'advanced' (since we only support three levels)
   - Generates appropriate rationale text

2. **Generates Learning Resources**
   - Extracts from existing `documentation` field
   - Creates structured learning resources with appropriate experience levels
   - Includes tutorials, documentation, videos, and API references

3. **Adds Difficulty Indicators**
   - Analyzes tool characteristics
   - Identifies complexity factors:
     - Many configuration options (>10)
     - Multiple required dependencies (>5)
     - Command-line only interfaces
     - Category-specific challenges (security, database, etc.)
     - Known complex tools (Kubernetes, Docker, etc.)

## Manual Migration

If you prefer to migrate manually or need to customize the migration:

### 1. Update Experience Requirements

Replace the `experienceLevel` array with an `experienceRequirement` object:

```typescript
// Before
experienceLevel: ['beginner', 'intermediate', 'advanced']

// After
experienceRequirement: {
  minimumLevel: 'beginner',
  recommendedLevel: 'intermediate',
  rationale: 'This tool is accessible to beginners but requires intermediate knowledge for advanced features.',
  alternativesForBeginners: [] // Add tool IDs of simpler alternatives
}
```

### 2. Add Learning Resources

Structure your documentation links as learning resources:

```typescript
learningResources: [
  {
    title: 'Official Getting Started Guide',
    url: 'https://docs.example.com/getting-started',
    type: 'tutorial',
    experienceLevel: 'beginner'
  },
  {
    title: 'API Documentation',
    url: 'https://docs.example.com/api',
    type: 'documentation',
    experienceLevel: 'advanced'
  },
  {
    title: 'Video Tutorial Series',
    url: 'https://youtube.com/playlist?list=...',
    type: 'video',
    experienceLevel: 'beginner'
  }
]
```

### 3. Identify Difficulty Indicators

Add specific challenges that users might face:

```typescript
difficultyIndicators: [
  'Requires understanding of functional programming concepts',
  'Complex configuration with many options',
  'Steep learning curve for advanced features',
  'Command-line interface only'
]
```

## Validation

After migration, validate your manifests:

```typescript
import { ManifestValidator } from './shared/manifest-validator';

const validator = new ManifestValidator();
const result = validator.validateToolManifest(migratedManifest);

if (!result.isValid) {
  console.error('Validation errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

## Best Practices

1. **Accurate Minimum Levels**
   - Set the minimum level based on what's truly required
   - Consider prerequisites (programming knowledge, concepts)
   - Don't artificially lower requirements

2. **Helpful Rationales**
   - Explain why the tool has these requirements
   - Mention specific concepts or skills needed
   - Be honest about complexity

3. **Comprehensive Learning Resources**
   - Include resources for all experience levels
   - Prioritize official documentation
   - Add community resources and tutorials

4. **Clear Difficulty Indicators**
   - Be specific about challenges
   - Focus on aspects that might surprise users
   - Include both technical and conceptual difficulties

5. **Beginner Alternatives**
   - Suggest simpler tools when minimum level is intermediate/advanced
   - Ensure alternatives are actually easier to use
   - Consider the learning path

## Example Migration

### Before
```json
{
  "id": "webpack",
  "name": "Webpack",
  "description": "Module bundler for JavaScript applications",
  "category": "frontend",
  "experienceLevel": ["intermediate", "advanced"],
  "documentation": {
    "officialDocs": "https://webpack.js.org/",
    "quickStart": "https://webpack.js.org/guides/getting-started/"
  }
}
```

### After
```json
{
  "id": "webpack",
  "name": "Webpack",
  "description": "Module bundler for JavaScript applications",
  "category": "frontend",
  "experienceRequirement": {
    "minimumLevel": "intermediate",
    "recommendedLevel": "advanced",
    "rationale": "Webpack requires understanding of module systems, build processes, and JavaScript ecosystem. Configuration can be complex.",
    "alternativesForBeginners": ["vite", "parcel"]
  },
  "learningResources": [
    {
      "title": "Webpack Getting Started",
      "url": "https://webpack.js.org/guides/getting-started/",
      "type": "tutorial",
      "experienceLevel": "intermediate"
    },
    {
      "title": "Webpack Documentation",
      "url": "https://webpack.js.org/",
      "type": "documentation",
      "experienceLevel": "advanced"
    }
  ],
  "difficultyIndicators": [
    "Complex configuration system",
    "Requires understanding of module bundling",
    "Many plugins and loaders to learn",
    "Performance optimization requires expertise"
  ],
  "documentation": {
    "officialDocs": "https://webpack.js.org/",
    "quickStart": "https://webpack.js.org/guides/getting-started/"
  }
}
```

## Backward Compatibility

- The old `experienceLevel` field is marked as deprecated but still supported
- The migration tool preserves the old field while adding the new format
- This allows gradual migration without breaking existing systems
- Future versions will remove support for the old format

## Troubleshooting

### Common Issues

1. **Missing rationale**: The migration generates default rationales, but you should customize them
2. **Empty learning resources**: Ensure your original manifest has documentation links
3. **No difficulty indicators**: The tool makes educated guesses, but manual review is recommended

### Getting Help

- Check the validation errors for specific issues
- Review the sample manifests for examples
- Consult the type definitions in `manifest-types.ts` 