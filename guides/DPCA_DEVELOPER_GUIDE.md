# Developer Workflow Guide — DPCA Project

## Overview

All developers must follow this workflow to ensure smooth collaboration and avoid code conflicts.

---

## 1. First-Time Setup

### Clone the Repository

```bash
git clone https://github.com/nexstair-projects/DPCA.git
cd DPCA
```

### Configure Your Identity

```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

---

## 2. Daily Workflow

### Step 1: Always Work on a Feature Branch

**Never commit directly to `main`.**

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
```

Branch naming convention:
- `feature/login-page`
- `fix/bug-fix-name`
- `update/dashboard-ui`

---

### Step 2: Keep Your Branch Updated

Before starting work each day, pull the latest changes from `main`:

```bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git merge main
```

Resolve any merge conflicts **before** pushing.

---

### Step 3: Make and Commit Your Changes

```bash
# Check what files changed
git status

# Stage the files you want to commit
git add .

# Commit with a clear message
git commit -m "Add login page UI"
```

**Commit message rules:**
- Use present tense: "Add", "Fix", "Update"
- Be brief but descriptive
- Example: `git commit -m "Fix dashboard data loading error"`

---

### Step 4: Push Your Branch

```bash
git push origin feature/your-feature-name
```

---

### Step 5: Open a Pull Request (PR)

1. Go to **github.com/nexstair-projects/DPCA**
2. GitHub will show a **"Compare & pull request"** button — click it
3. Fill in:
   - **Title**: Short description of your change
   - **Description**: What you changed and why
4. Click **Create pull request**

---

### Step 6: Wait for Approval

- Your PR will be reviewed by **Ab-dur-Rehman** or **ujavaid015**
- If changes are requested, make them on the **same branch** and push again — the PR updates automatically
- Do **not** close and reopen a new PR for edits

---

### Step 7: Merge

Once approved, click **Merge pull request** on GitHub.
Then delete the branch (GitHub offers this option after merging).

---

## 3. Conflict Resolution

If you get a merge conflict:

```bash
git status  # shows conflicted files
```

Open the conflicted files in VS Code. You'll see markers like:

```
<<<<<<< HEAD
Your changes
=======
Incoming changes
>>>>>>>
```

**Keep the code you want, remove the markers and unwanted code.**

Then:

```bash
git add .
git commit -m "Resolve merge conflict"
git push origin feature/your-feature-name
```

> **Tip:** Communicate with the person whose code conflicts with yours.

---

## 4. Important Rules

| Rule | Why |
|------|-----|
| Never push directly to `main` | Branch protection prevents this |
| Always create a new branch for each task | Keeps changes isolated |
| Pull `main` into your branch before pushing | Reduces conflicts |
| Write clear commit messages | Makes history readable |
| Delete branches after merging | Keeps repo clean |
| Always open a PR, even for small changes | Ensures code review |

---

## 5. VS Code Tips

- **Source Control panel** (left sidebar) — stage, commit, and push without terminal
- **Git Graph extension** — visualize branches and history
- **Live Share extension** — pair programming to resolve tricky conflicts

---

## 6. Quick Command Reference

```bash
# Start working
git checkout -b feature/my-task          # Create new branch
git pull origin main                      # Update from main

# While working
git status                                # Check changes
git add .                                  # Stage all changes
git commit -m "Message"                   # Commit
git push origin feature/my-task           # Push branch

# After approval
git checkout main                         # Switch to main
git pull origin main                      # Get latest after merge
git branch -d feature/my-task            # Delete local branch
```

---

**Questions?** Reach out to **Ab-dur-Rehman** or **ujavaid015** on GitHub.
