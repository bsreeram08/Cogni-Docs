---
description: Standardized Git commit and MR process
auto_execution_mode: 1
---

# Git Commit and MR Workflow

## Steps

1. View changed files

```bash
git status
```

2. Stage changes

```bash
git add .
```

3. Analyze staged changes

```bash
// turbo
git diff --cached --name-only
```

If no staged changes:

```bash
// turbo
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "No staged changes. How many previous commits to analyze?"
  read n_commits
  git log -n "$n_commits" --stat
  git diff HEAD~"$n_commits"..HEAD --stat
else
  echo "Staged changes:"
  git diff --cached --stat
fi
```

Change types:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `chore`: Build/auxiliary tools
- `docs`: Documentation
- `style`: Formatting
- `perf`: Performance
- `test`: Testing

4. Identify components affected

5. Create commit message:

```
type(component): brief description
```

6. Prepare MR description:

```
**Problem**: [Issue addressed]

**Solution**: [How it's solved]

**Implementation**: [Files/functions changed]

**Limitation**: [Any constraints]

**Impact**: [System effects]

**Note**: [Optional info]

**Related**: [Logs/tickets]
```

7. Commit changes:

```bash
// turbo
git commit -m "your_commit_message"
```

8. Push to remote:

```bash
// turbo
git push origin your-branch-name
```

## Example

### Commit Message

```
fix(dynamic-chunking-selector): prevent null reference when merchant has no default acquirer
```

### MR Description

```
**Problem**: Null reference exception when merchant has no default acquirer

**Solution**: Added null checking with fallback to first available acquirer

**Limitation**: Requires at least one acquirer to be available

**Note**: Follow-up work planned for merchant onboarding process
```
