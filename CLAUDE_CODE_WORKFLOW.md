# Claude Code Workflow for HatStart

## MANDATORY: READ THIS FIRST
**STOP! Before doing ANYTHING else, you MUST:**
1. Read this entire document
2. Check `.hatstart_session` for current state
3. Run `git status` to check for uncommitted work
4. Run `task-master list` to see current tasks

## IMPORTANT: Auto-Compaction Recovery
**If conversation was auto-compacted or you see "Earlier messages in this conversation have been summarized":**
1. **IMMEDIATELY** re-read this entire CLAUDE_CODE_WORKFLOW.md
2. **ALWAYS** check `.hatstart_session` for current state
3. **NEVER** assume you remember the context - always verify
4. **READ** CLAUDE.md for project context and navigation map
5. **CHECK** git status and recent commits to understand recent work

## Quick Start Prompts (Copy & Paste These)

### "Work on the next task"
```
Read CLAUDE_CODE_WORKFLOW.md and start working on the next task following the workflow
```

### "Resume work after crash"
```
Read CLAUDE_CODE_WORKFLOW.md and resume work after terminal crash - check session state and continue
```

### "Continue current task"
```
Read CLAUDE_CODE_WORKFLOW.md and continue working on the current task/subtask
```

### "Review and fix tech debt"
```
Read CLAUDE_CODE_WORKFLOW.md and review the codebase for technical debt, then fix any issues found
```

### "Check task alignment"
```
Read CLAUDE_CODE_WORKFLOW.md and verify the current/next task aligns with HatStart's core mission
```

### "After auto-compaction" (Use if you see conversation was summarized)
```
Read CLAUDE_CODE_WORKFLOW.md paying special attention to auto-compaction recovery, then check session state and continue work
```

## Operational Workflow (FOLLOW EXACTLY)

### 1. Session Initialization
```bash
# ALWAYS run these commands first
git status                    # Check for uncommitted work
task-master list              # See all tasks
task-master next              # Identify next task
cat .hatstart_session         # Check last session state
```

### 2. Task Selection & Validation
```bash
# Get full task details
task-master show <task-id>
```

**ALIGNMENT CHECK** - Verify task aligns with HatStart's mission:
- ✅ **ALIGNED**: Tool installation, IDE config, version management, environment setup
- ❌ **MISALIGNED**: Cloud features, marketplaces, VDI infrastructure, SaaS features

If misaligned, STOP and notify user before proceeding.

### 3. Task Breakdown & Planning
```bash
# For complex tasks
task-master analyze-complexity --research
task-master expand --id=<task-id> --force --research

# View subtasks
task-master show <task-id>
```

### 4. Subtask Implementation Loop

For EACH subtask:

#### a. Start Subtask
```bash
# Document your plan
task-master update-subtask --id=<subtask-id> --prompt='Implementation plan:
- Files to modify: [list files]
- Approach: [describe approach]
- Potential issues: [list concerns]'

# Set status
task-master set-status --id=<subtask-id> --status=in-progress

# Update session file
echo "Current Task: <task-id>" > .hatstart_session
echo "Current Subtask: <subtask-id>" >> .hatstart_session
echo "Status: in-progress" >> .hatstart_session
echo "Last Update: $(date)" >> .hatstart_session
```

#### b. Implement Changes
- Follow patterns in CLAUDE.md Codebase Navigation Map
- Use existing code patterns from similar files
- Run linters frequently: `npm run lint`
- Run tests: `npm test`

#### c. Document Progress
```bash
# After significant progress
task-master update-subtask --id=<subtask-id> --prompt='Progress update:
- Completed: [what works]
- Issues found: [problems encountered]
- Solutions: [how you fixed them]'
```

#### d. Complete Subtask
```bash
# Fix all linting errors
npm run lint

# Run tests
npm test

# Mark complete
task-master set-status --id=<subtask-id> --status=done

# MANDATORY: Commit after EVERY subtask
git add -A
git commit -m "feat(<scope>): complete <subtask-title>

- <list key changes>
- <explain why if needed>

Task: <task-id>
Subtask: <subtask-id>"

# Update session
echo "Last Completed: <subtask-id>" >> .hatstart_session
```

### 5. Task Completion
```bash
# After all subtasks done
task-master set-status --id=<task-id> --status=done
task-master generate  # Update task files

# Update CLAUDE.md with:
# - New patterns discovered
# - Architecture decisions
# - Technical debt created
# - Known issues
```

### 6. Session End
```bash
# Update session state
echo "Session End: $(date)" >> .hatstart_session
echo "Next Task: $(task-master next | grep 'Task ID' | cut -d: -f2)" >> .hatstart_session

# Final commit if needed
git add -A
git commit -m "docs: update session documentation"
```

## Crash Recovery Process

1. **Read session state**:
   ```bash
   cat .hatstart_session
   ```

2. **Check git status**:
   ```bash
   git status
   git diff
   ```

3. **Resume from last state**:
   - If changes uncommitted: Review, test, and commit
   - If subtask in-progress: Continue implementation
   - If subtask done: Move to next subtask

## Quality Gates (Before Each Commit)

- [ ] Linting passes: `npm run lint` (0 errors)
- [ ] Tests pass: `npm test`
- [ ] Types check: `npm run type-check` (if available)
- [ ] No console.logs or debug code
- [ ] Documentation updated if needed
- [ ] CLAUDE.md updated with session notes

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

Task: <task-id>
Subtask: <subtask-id>
```

**Types**: feat, fix, docs, style, refactor, test, chore
**Scope**: service name, component name, or feature area
**Subject**: imperative mood, what the commit does
**Body**: why the change was made, any breaking changes

## Common Commands Reference

```bash
# Task Management
hs-next          # Show next task (alias for task-master next)
hs-list          # List all tasks (alias for task-master list)
hs-show <id>     # Show task details (alias for task-master show)
hs-update <id>   # Update subtask (alias for task-master update-subtask --id)
hs-done <id>     # Mark done (alias for task-master set-status --status=done --id)
hs-progress <id> # Mark in-progress (alias for task-master set-status --status=in-progress --id)

# Git Workflow
hs-status        # Git + task status (git status && task-master list)
hs-commit "msg"  # Quick commit (git add -A && git commit -m)
hs-diff          # See changes (git diff --stat)

# Analysis
hs-analyze       # Analyze complexity (task-master analyze-complexity --research)
hs-expand <id>   # Expand task (task-master expand --force --research --id)
```

## Navigation Shortcuts

When implementing, check these locations first:

### Adding Features
- New tool/language: Start at `src/shared/manifest-types.ts`
- New version manager: `src/services/version-managers/`
- New installer: `src/services/[platform]-installer.ts`
- New UI component: `src/components/`

### Fixing Issues
- Type errors: Check `src/types/` and service-specific types
- Test failures: Check `src/services/__tests__/`
- Linting: Check `eslint.config.js` for rules

### Common Patterns
- Service pattern: See `src/services/base-installer.ts`
- Command execution: See `src/services/command-execution/`
- Error handling: See `src/shared/error-handling.ts`

## REMEMBER
1. **ALWAYS** commit after each subtask
2. **ALWAYS** check task alignment with core mission
3. **ALWAYS** fix linting errors before committing
4. **ALWAYS** update session state
5. **NEVER** skip the quality gates
6. **NEVER** leave technical debt undocumented
7. **ALWAYS** re-read this document after auto-compaction
8. **ALWAYS** verify context with .hatstart_session after any interruption

## Session State File Format (.hatstart_session)
```
Current Task: <task-id>
Current Subtask: <subtask-id>
Status: <in-progress|done>
Last Update: <timestamp>
Last Completed: <subtask-id>
Session End: <timestamp>
Next Task: <task-id>
```

## Auto-Compaction Context Recovery Checklist
When conversation is auto-compacted, follow this checklist:
- [ ] Re-read entire CLAUDE_CODE_WORKFLOW.md
- [ ] Check .hatstart_session for current task/subtask
- [ ] Run `git status` to see uncommitted changes
- [ ] Run `git log --oneline -5` to see recent commits
- [ ] Run `task-master show <current-task-id>` to refresh task details
- [ ] Read relevant sections of CLAUDE.md for project context
- [ ] Check if any subtasks were completed but not committed
- [ ] Verify no linting errors exist before continuing