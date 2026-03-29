# 🧠 Agent Memory System (Memory as Code)

Welcome to the shared repository memory. Rather than relying on isolated APIs or black-box vector databases, this repository utilizes a **Markdown File-Based Graph** to synchronize context instantly across AI Agents (Cursor, Claude Code, AntiGravity) and human developers via `git`.

## Architecture (Two-Tier Memory)
1. **Local Memory (`/.agent_memory/`)**: Repository-specific context (e.g. "Our local test DB runs on port 5433").
2. **Global Memory (`/.global_memory/`)**: *(Needs to be initialized as a Git Submodule pointing to the company's central memory repo)*. Contains company-wide framework rules and cross-repo API contracts.

---

## 🛠️ How to Connect Your AI Agents (Setup)

Because the "Brain" is just plain-text Markdown files, it integrates natively into every coding tool without any complex plugins.

### 1. Cursor IDE
**Status: Ready.** 
There is nothing to install. The `.cursorrules` file in the root of this repository handles this automatically. Cursor's Composer is strictly enforced to read `/.agent_memory/index.md` before making any code changes. 

### 2. Claude Code (CLI)
**Status: Manual Flag Required.**
When starting Claude Code in your terminal, pass the memory map in the system prompt to grant it context:
```bash
claude --system "Before writing code or answering structural questions, strictly read /.agent_memory/index.md for historical architecture context."
```

### 3. AntiGravity (Native Integration)
**Status: Ready.**
AntiGravity has the **Distiller Agent** role built directly into it via a custom slash command workflow.
*   **To Read Memory:** AntiGravity natively uses `view_file` to navigate the file system if you ask it a repo question.
*   **To Save a Memory:** Simply type `/save-memory` in the chat. AntiGravity will analyze your chat session, extract the core "Stack Overflow" learning, format the Markdown, and silently run the python script to commit the learning directly to the local or global memory graph!

---

## 📝 How to Manually Add Memories
You don't need an AI to add memories. It's just a wiki!
1. Create a markdown file describing the bug/rule in `/.agent_memory/nodes/`.
2. Open `/.agent_memory/index.md` (or the relevant sub-folder) and add a standard markdown hyperlink pointing to your new node. 
3. Commit your changes via Git. The entire team's AI tools will now instantly inherit this rule upon their next `git pull`.
