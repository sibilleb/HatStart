# Dependency Resolution Engine Architecture

## Overview

The HatStart Dependency Resolution Engine is a comprehensive system for managing cross-category tool dependencies, detecting conflicts, and ensuring proper installation order. Built as part of Task 7, this engine integrates seamlessly with the CategoryInstaller framework and provides both programmatic and visual interfaces.

## Core Components

### 1. Dependency Graph Data Structures (Task 7.1)

**Location**: `src/services/dependency-resolution/`

#### Key Files:
- **types.ts** (585 lines): Comprehensive type system with 60+ interfaces
- **dependency-graph.ts** (1,032 lines): Core DependencyGraph class
- **index.ts** (153 lines): Clean module exports and factory functions

#### Features:
- **Graph Representation**: Adjacency list implementation for efficient traversal
- **Node Structure**: 
  ```typescript
  DependencyGraphNode {
    tool: ToolManifest
    status: InstallationStatus
    metadata: NodeGraphMetadata
    versionInfo: NodeVersionInfo
    platformMetadata: PlatformMetadata
  }
  ```
- **Edge Structure**:
  ```typescript
  DependencyGraphEdge {
    from: string
    to: string
    dependency: EnhancedToolDependency
    metadata: EdgeResolutionMetadata
  }
  ```
- **Traversal Algorithms**: DFS, BFS, topological sort, dependency-first, category-first
- **Cycle Detection**: Built-in circular dependency detection
- **Performance Metrics**: Complexity analysis, caching, lazy evaluation

### 2. Graph Construction Logic (Task 7.2)

**Location**: `src/services/dependency-resolution/graph-builder.ts` (800+ lines)

#### Features:
- **Multi-phase Construction**:
  1. Validation phase - Check manifest integrity
  2. Node creation phase - Create graph nodes from manifests
  3. Edge creation phase - Establish dependencies
  4. Post-construction validation - Verify graph consistency

- **Manifest Support**:
  - Individual ToolManifest
  - CategoryManifest collections
  - MasterManifest with all categories

- **Error Handling**:
  - Missing dependency detection
  - Circular dependency warnings
  - Platform compatibility validation
  - Detailed error codes and messages

- **Factory Functions**:
  ```typescript
  buildGraphFromManifests(manifests, platform, options)
  buildGraphFromCategory(categoryManifest, platform)
  buildGraphFromMaster(masterManifest, platform)
  ```

### 3. Dependency Resolution Algorithms (Task 7.3)

**Location**: 
- `src/services/dependency-resolution/dependency-resolver.ts` (700+ lines)
- `src/services/dependency-resolution/advanced-algorithms.ts` (850+ lines)

#### Resolution Strategies:
1. **Topological Sort** (Primary)
   - Kahn's algorithm implementation
   - Handles DAG traversal efficiently
   - Detects cycles during resolution

2. **Depth-First Search**
   - With backtracking for conflict scenarios
   - Post-order traversal for dependency ordering

3. **Breadth-First Search**
   - Level-based installation batching
   - Parallel installation opportunities

4. **Resolution Modes**:
   - **Eager**: Include optional and suggested dependencies
   - **Lazy**: Required dependencies only
   - **Conflict-aware**: Retry with fallback strategies

#### Installation Order:
- Generates correct dependency-first ordering
- Creates parallel installation batches
- Handles deferred dependencies (circular)
- Estimates installation time

### 4. Conflict Detection Mechanisms (Task 7.4)

**Location**: `src/services/dependency-resolution/conflict-detector.ts` (1,200+ lines)

#### Conflict Types:
1. **Version Conflicts**
   - Incompatible version requirements
   - Missing version constraints
   - Version range overlaps

2. **Circular Dependencies**
   - Full cycle detection
   - Partial cycle detection
   - Suggested break points

3. **Platform Incompatibilities**
   - Cross-platform validation
   - Architecture mismatches
   - Missing platform support

4. **Cross-Category Conflicts**
   - Known incompatible tool combinations
   - Resource conflicts (ports, files)
   - Configuration conflicts

#### Detection Features:
- Multi-layered analysis
- Severity classification (critical/major/minor)
- Confidence scoring for resolutions
- Impact assessment
- Detailed diagnostics

### 5. Conflict Resolution Strategies (Task 7.5)

**Location**: `src/services/dependency-resolution/conflict-resolver.ts` (980+ lines)

#### Resolution Approaches:
1. **Automated Resolution**
   - Version pinning to compatible versions
   - Tool substitution with alternatives
   - Dependency exclusion for optional deps
   - Configuration adjustments

2. **Guided Resolution**
   - Interactive decision points
   - Risk assessment for each option
   - Rollback capabilities
   - Step-by-step execution

3. **Resolution Policies**:
   ```typescript
   ResolutionPolicy {
     automaticResolution: boolean
     preferLatestVersions: boolean
     allowBreakingChanges: boolean
     requireUserConfirmation: boolean
   }
   ```

#### Features:
- Resolution plan generation
- Impact analysis (reversibility, side effects)
- Execution tracking and monitoring
- Success probability estimation

### 6. CategoryInstaller Integration (Task 7.6)

**Location**: `src/services/dependency-resolution/dependency-aware-category-installer.ts` (1,100+ lines)

#### Integration Features:
1. **Enhanced Pre-installation**
   - Dependency resolution before installation
   - Conflict detection and resolution
   - Installation order optimization

2. **Native Package Manager Integration**
   - apt, yum, homebrew, chocolatey, winget
   - Package information querying
   - Version availability checking
   - Dependency information extraction

3. **Installation Coordination**
   - Dependency-aware installation order
   - Parallel batch processing
   - Progress tracking
   - Error recovery

4. **Caching System**
   - Manifest caching
   - Resolution result caching
   - Package manager query caching

### 7. User Interface Components (Task 7.7)

#### React Component
**Location**: `src/components/dependency-resolution/`

**Files**:
- **DependencyVisualization.tsx** (900+ lines): Interactive graph visualization
- **DependencyVisualization.css** (600+ lines): Comprehensive styling
- **DependencyResolutionPanel.tsx** (300+ lines): Integration component

**Features**:
- D3-like SVG rendering
- Interactive node selection
- Zoom/pan controls
- Conflict highlighting
- Resolution step visualization
- Category-specific coloring
- Responsive design

#### CLI Interface
**Location**: `src/services/dependency-resolution/dependency-cli-visualizer.ts` (500+ lines)

**Features**:
- Multiple output formats (tree, table, JSON)
- Color-coded severity levels
- Progress indicators
- Interactive prompts
- Verbose mode for detailed information

### 8. Testing Infrastructure (Task 7.8)

**Test Coverage**: 240+ tests across all modules

#### Test Types:
1. **Unit Tests**
   - Each module has comprehensive unit tests
   - Edge case coverage
   - Error scenario testing

2. **Integration Tests**
   - `dependency-resolution-e2e.test.ts`
   - Full workflow testing
   - Real-world scenarios

3. **Stress Tests**
   - `dependency-resolution-stress.test.ts`
   - 100-1000 node graphs
   - Performance benchmarks
   - Memory usage tests

4. **UI Tests**
   - React component testing
   - User interaction simulation
   - Accessibility testing

## Usage Examples

### Basic Dependency Resolution
```typescript
import { buildGraphFromManifests, DependencyResolver } from './dependency-resolution';

// Build graph from manifests
const graphResult = await buildGraphFromManifests(manifests, 'linux');

// Resolve installation order
const resolver = new DependencyResolver();
const order = await resolver.resolve(
  graphResult.graph,
  ['react-app', 'express-api']
);

console.log(order.installationSequence); // ['node', 'npm', 'react-app', 'express-api']
```

### Conflict Detection and Resolution
```typescript
import { ConflictDetector, ConflictResolver } from './dependency-resolution';

// Detect conflicts
const detector = new ConflictDetector();
const conflicts = await detector.detectConflicts(graph, selectedTools);

if (conflicts.hasConflicts) {
  // Resolve conflicts
  const resolver = new ConflictResolver();
  const resolution = await resolver.resolveConflicts(conflicts, graph);
  
  if (resolution.success) {
    // Apply resolution
    const updatedGraph = resolution.modifiedGraph;
  }
}
```

### CategoryInstaller Integration
```typescript
const installer = new DependencyAwareCategoryInstaller();

const result = await installer.performDependencyResolution(
  command,
  'frontend',
  {
    toolManifests,
    dependencyResolution: {
      enabled: true,
      strategy: 'conflict-aware'
    }
  }
);

// Install in resolved order
await installer.installDependencies(result, 'frontend', options);
```

### Visualization
```typescript
// React component
<DependencyVisualization
  graph={graph}
  selectedTools={selectedTools}
  conflicts={conflicts}
  platform="linux"
  onResolveConflicts={handleResolve}
/>

// CLI visualization
const visualizer = new DependencyCLIVisualizer({ format: 'tree' });
const output = visualizer.visualizeGraph(graph, selectedTools, 'linux');
console.log(output);
```

## Performance Characteristics

- **Graph Building**: < 500ms for 100 nodes
- **Dependency Resolution**: < 200ms for 100 nodes
- **Conflict Detection**: < 100ms for typical scenarios
- **Conflict Resolution**: < 1s for 50 conflicts
- **Memory Usage**: < 100MB for 1000 nodes

## Architecture Decisions

1. **Adjacency List**: Chosen for efficient dependency traversal
2. **TypeScript**: Full type safety with 60+ interfaces
3. **Modular Design**: Each component can be used independently
4. **Caching Strategy**: Multi-level caching for performance
5. **Error Recovery**: Graceful degradation and detailed diagnostics
6. **Platform Agnostic**: Works across Windows, macOS, Linux

## Future Enhancements

1. **Machine Learning**: Predict likely conflicts based on tool combinations
2. **Cloud Resolution**: Offload complex resolution to cloud services
3. **Dependency Database**: Central repository of known conflicts
4. **Real-time Updates**: Live dependency graph updates
5. **Plugin System**: Custom resolution strategies

## Troubleshooting

### Common Issues

1. **Circular Dependencies**
   - Check for mutual dependencies
   - Use optional dependencies where possible
   - Consider tool redesign

2. **Version Conflicts**
   - Update tool manifests with accurate constraints
   - Use version pinning for stability
   - Consider virtual environments

3. **Platform Issues**
   - Verify platform support in manifests
   - Check architecture compatibility
   - Use platform-specific alternatives

## API Reference

See the exported types and functions in `src/services/dependency-resolution/index.ts` for the complete API surface.

---

Last Updated: January 2025
Task 7 Completed: All 8 subtasks implemented and tested