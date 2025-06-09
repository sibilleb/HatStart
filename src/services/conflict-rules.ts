/**
 * Simple Conflict Rules for Tool Installation
 * MVP implementation - focuses on common conflicts
 */

export interface ConflictRule {
  tools: string[]; // Tool IDs that conflict with each other
  reason: string;  // Human-readable explanation
  resolution: string; // Suggested resolution
}

/**
 * Define known tool conflicts
 * These are tools that shouldn't be installed together
 */
export const conflictRules: ConflictRule[] = [
  // Version Manager Conflicts
  {
    tools: ['nvm', 'asdf'],
    reason: 'Both NVM and ASDF manage Node.js versions. Using both can cause PATH conflicts.',
    resolution: 'Choose either NVM (Node.js only) or ASDF (multiple languages).'
  },
  {
    tools: ['pyenv', 'asdf'],
    reason: 'Both PyEnv and ASDF can manage Python versions. This may cause conflicts.',
    resolution: 'Choose either PyEnv (Python only) or ASDF (multiple languages).'
  },
  {
    tools: ['rbenv', 'asdf'],
    reason: 'Both RBenv and ASDF can manage Ruby versions. This may cause conflicts.',
    resolution: 'Choose either RBenv (Ruby only) or ASDF (multiple languages).'
  },
  
  // Database Conflicts
  {
    tools: ['mysql', 'mariadb'],
    reason: 'MariaDB and MySQL use the same default port (3306) and may conflict.',
    resolution: 'Choose either MySQL or MariaDB, or configure them on different ports.'
  },
  
  // Container Runtime Conflicts
  {
    tools: ['docker', 'podman'],
    reason: 'Docker and Podman are both container runtimes that may conflict.',
    resolution: 'Choose either Docker or Podman based on your needs.'
  }
];

/**
 * Check if selected tools have any conflicts
 * @param selectedToolIds Array of tool IDs that user wants to install
 * @returns Array of conflicts found
 */
export function checkForConflicts(selectedToolIds: string[]): ConflictRule[] {
  const conflicts: ConflictRule[] = [];
  
  for (const rule of conflictRules) {
    // Check if user selected multiple tools from a conflict rule
    const selectedConflictingTools = rule.tools.filter(toolId => 
      selectedToolIds.includes(toolId)
    );
    
    if (selectedConflictingTools.length > 1) {
      conflicts.push(rule);
    }
  }
  
  return conflicts;
}

/**
 * Get conflicting tools from a list of selected tools
 * @param selectedToolIds Array of tool IDs that user wants to install
 * @returns Object mapping each tool to its conflicts
 */
export function getConflictingTools(selectedToolIds: string[]): Record<string, string[]> {
  const conflictMap: Record<string, string[]> = {};
  
  for (const rule of conflictRules) {
    const selectedInRule = rule.tools.filter(toolId => 
      selectedToolIds.includes(toolId)
    );
    
    if (selectedInRule.length > 1) {
      // Add conflicts for each selected tool in this rule
      selectedInRule.forEach(toolId => {
        if (!conflictMap[toolId]) {
          conflictMap[toolId] = [];
        }
        conflictMap[toolId].push(...selectedInRule.filter(id => id !== toolId));
      });
    }
  }
  
  return conflictMap;
}