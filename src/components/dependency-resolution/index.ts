/**
 * Dependency Resolution UI Components
 * Export all dependency visualization and resolution components
 */

export { 
  DependencyVisualization,
  type DependencyVisualizationProps 
} from './DependencyVisualization';

export { 
  DependencyResolutionPanel,
  type DependencyResolutionPanelProps 
} from './DependencyResolutionPanel';

// Import style sheets
import './DependencyVisualization.css';
import './DependencyResolutionPanel.css';

// Export style imports for bundling
export const styles = {
  visualization: './DependencyVisualization.css',
  panel: './DependencyResolutionPanel.css'
};