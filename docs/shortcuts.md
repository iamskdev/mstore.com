# ⚡ Project Shortcuts & Workflows Guide

This guide provides a list of useful shortcuts, commands, and workflows for this project.

---

## ⌨️ VS Code Shortcuts

These are some highly recommended shortcuts for faster development in VS Code.

### Command Palette
- **Shortcut:** `Ctrl+Shift+P`
- **Action:** Access to all VS Code commands.

### Go to File
- **Shortcut:** `Ctrl+P`
- **Action:** Quickly open any file by typing its name.

### Global Search
- **Shortcut:** `Ctrl+Shift+F`
- **Action:** Search for text across all files in the project.

### Toggle Terminal
- **Shortcut:** `Ctrl+` 
- **Action:** Quickly show or hide the integrated terminal.

### Format Document
- **Shortcut:** `Shift+Alt+F`
- **Action:** Automatically format your code according to project standards.

### Toggle Word Wrap
- **Shortcut:** `Alt+Z`
- **Action:** Toggles word wrapping for the current file.

---

## 🚀 Project Commands

These are the standard commands to run this project.

- **`npm start`**
  - Starts the production server.

- **`npm run dev`**
  - Starts the development server with live reload.

- **`ngrok http 8181`**
  - Exposes the local server (port 8181) to the internet for testing on other devices.

---

##  Git Tips & Aliases

Aliases can make your git workflow much faster. To use these, you need to add them to your global git configuration. You only need to do this once.

### How to Add Aliases
Open a terminal and run these commands:
```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.lg "log --oneline --graph --decorate --all"
```

### Recommended Aliases

- **`git st`**
  - **Stands for:** `git status`
  - **Use:** Quickly see the status of your changes.

- **`git co`**
  - **Stands for:** `git checkout`
  - **Use:** Switch branches (e.g., `git co main`).

- **`git br`**
  - **Stands for:** `git branch`
  - **Use:** List all your local branches.

- **`git ci`**
  - **Stands for:** `git commit`
  - **Use:** Commit your staged changes (e.g., `git ci -m "Your message"`).

- **`git lg`**
  - **Stands for:** `git log` (pretty format)
  - **Use:** See a compact, graphical view of your commit history.

---

## 🔗 Managing Git Remotes

A remote is a pointer to a repository hosted on the internet (like on GitHub). Here's how to manage them.

### Check Existing Remotes
To see which remotes are currently configured for your project.
- **Command:** `git remote -v`
- **Action:** This will list all remotes with their fetch and push URLs.

### Add a Remote
To connect your local repository to a remote one.
- **Command:** `git remote add <name> <url>`
- **Details:**
  - `<name>` is the short name for the remote, usually `origin`.
  - `<url>` is the URL of the repository (e.g., `https://github.com/user/repo.git`).
- **Example:** `git remote add origin https://github.com/santosh/mstore.git`

### Remove a Remote
To disconnect a remote from your local repository.
- **Command:** `git remote remove <name>`
- **Details:**
  - `<name>` is the short name of the remote you want to remove (e.g., `origin`).
- **Example:** `git remote remove origin`

---

## 🤖 Gemini Workflow Shortcuts

These are custom triggers we have defined in Gemini's memory to automate complex tasks.

- **`start project`**
  - **Action:** Gemini will read `readme.md`, `workflow.md`, and `schema-guide.md` to get full context for the session.

- **`review <filename>.md`**
  - **Action:** Starts the document review process: updates the audit block with the current IST time and your name.

- **`git push proceed`**
  - **Action:** Starts the automated git workflow: `git status` -> `git add .` -> suggest commit message -> `git commit` -> `git push`.

- **`end the work`**
  - **Action:** Starts the end-of-day process: check for documentation impact, check git status, summarize commits, and suggest final actions.

- **`end of work also make a zip fil of the project in local`**
 - **Action** make a zip file of project by python: `python ../makezip.py`
