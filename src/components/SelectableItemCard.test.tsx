import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstallationStatus, ToolWithStatus } from '../types/ui-types';
import { SelectableItemCard } from './SelectableItemCard';

describe('SelectableItemCard', () => {
  const mockOnToggle = vi.fn();
  const mockOnInstall = vi.fn();
  
  // Sample tool with job role recommendation
  const sampleTool: ToolWithStatus = {
    id: 'vscode',
    name: 'Visual Studio Code',
    description: 'A code editor redefined and optimized for building and debugging modern web and cloud applications.',
    category: 'code-editors',
    platforms: ['windows', 'macos', 'linux'],
    isInstalled: false,
    isRecommended: true,
    installationStatus: 'not-installed' as InstallationStatus,
    jobRoleRecommendation: {
      roleId: 'frontend-developer',
      roleName: 'Frontend Developer',
      priority: 'essential',
      rationale: 'Essential for frontend development workflows.'
    }
  };

  // Sample tool without job role recommendation
  const toolWithoutRecommendation: ToolWithStatus = {
    id: 'sublime',
    name: 'Sublime Text',
    description: 'A sophisticated text editor for code, markup and prose.',
    category: 'code-editors',
    platforms: ['windows', 'macos', 'linux'],
    isInstalled: false,
    isRecommended: false,
    installationStatus: 'not-installed' as InstallationStatus
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a tool with job role recommendation badge', () => {
    render(
      <SelectableItemCard
        tool={sampleTool}
        isSelected={false}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
      />
    );

    // Check if the tool name is rendered
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    
    // Check if the description is rendered
    expect(screen.getByText(sampleTool.description)).toBeInTheDocument();
    
    // Check if the job role recommendation badge is displayed
    const badge = screen.getByText('Essential');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-essential');
    
    // Check if the badge has a tooltip with the rationale
    expect(badge).toHaveAttribute('title', sampleTool.jobRoleRecommendation?.rationale);
  });

  it('renders a tool without job role recommendation badge', () => {
    render(
      <SelectableItemCard
        tool={toolWithoutRecommendation}
        isSelected={false}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
      />
    );

    // Check if the tool name is rendered
    expect(screen.getByText('Sublime Text')).toBeInTheDocument();
    
    // Check if the description is rendered
    expect(screen.getByText(toolWithoutRecommendation.description)).toBeInTheDocument();
    
    // Check that no job role recommendation badge is displayed
    expect(screen.queryByText('Essential')).not.toBeInTheDocument();
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('calls onToggle when the checkbox is clicked', () => {
    render(
      <SelectableItemCard
        tool={sampleTool}
        isSelected={false}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
      />
    );

    // Find the checkbox and click it
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    // Check if onToggle was called with the correct parameters
    expect(mockOnToggle).toHaveBeenCalledWith('vscode', true);
  });

  it('calls onInstall when the install button is clicked', () => {
    render(
      <SelectableItemCard
        tool={sampleTool}
        isSelected={false}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
      />
    );

    // Find the install button and click it
    const installButton = screen.getByText('Install');
    fireEvent.click(installButton);
    
    // Check if onInstall was called with the correct parameters
    expect(mockOnInstall).toHaveBeenCalledWith('vscode');
  });

  it('displays different badge colors for different priorities', () => {
    // Recommended tool
    const recommendedTool: ToolWithStatus = {
      ...sampleTool,
      jobRolePriority: 'recommended',
      jobRoleRecommendation: {
        ...sampleTool.jobRoleRecommendation!,
        priority: 'recommended',
        rationale: 'Recommended for most front-end development tasks.'
      }
    };
    
    const { rerender } = render(
      <SelectableItemCard
        tool={recommendedTool}
        isSelected={false}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
      />
    );
    
    // Check if the recommended badge is displayed with the correct class
    let badge = screen.getByText('Recommended');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-recommended');
    
    // Optional tool
    const optionalTool: ToolWithStatus = {
      ...sampleTool,
      jobRolePriority: 'optional',
      jobRoleRecommendation: {
        ...sampleTool.jobRoleRecommendation!,
        priority: 'optional',
        rationale: 'Optional tool that might be useful for specific projects.'
      }
    };
    
    rerender(
      <SelectableItemCard
        tool={optionalTool}
        isSelected={false}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
      />
    );
    
    // Check if the optional badge is displayed with the correct class
    badge = screen.getByText('Optional');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-optional');
  });

  it('renders a disabled state correctly', () => {
    render(
      <SelectableItemCard
        tool={sampleTool}
        isSelected={false}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
        disabled={true}
      />
    );

    // Check if the checkbox is disabled
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('displays different UI when the tool is already installed', () => {
    const installedTool = {
      ...sampleTool,
      isInstalled: true,
      installationStatus: 'installed' as InstallationStatus
    };
    
    render(
      <SelectableItemCard
        tool={installedTool}
        isSelected={true}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
      />
    );
    
    // Check if the installed status is displayed
    expect(screen.getByText(/installed/i)).toBeInTheDocument();
    
    // The install button should not be present
    expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument();
  });

  it('displays the recommendation rationale in a tooltip', async () => {
    render(
      <SelectableItemCard
        tool={sampleTool}
        isSelected={false}
        onToggle={mockOnToggle}
        onInstall={mockOnInstall}
      />
    );
    
    // Find the recommendation badge
    const badge = screen.getByText(/essential/i);
    
    // We can't easily test tooltips in JSDOM, but we can check that the element
    // contains the rationale text in some attribute (like title, aria-label, or data-tooltip)
    expect(badge).toHaveAttribute('title', expect.stringContaining('Essential for frontend development'));
  });
}); 