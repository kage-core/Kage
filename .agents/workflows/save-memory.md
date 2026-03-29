---
description: Acts as the Distiller Agent, summarizing the session and saving the learning to the Local or Global shared Agent Memory.
---
# Memory Distillation Workflow

When this workflow is invoked, you are acting as the **Distiller Agent**. Your job is to extract the key learning from the conversation and permanently save it to the shared markdown memory graph.

1. **Analyze the Session**: Review the conversation we just had. Identify the core "Stack Overflow-style" bug fix, architectural decision, or hidden requirement we uncovered.
2. **Synthesize**: Create a clear, concise markdown description of the problem and the solution.
3. **Categorize**: Pick a category from: `repo_context`, `framework_bug`, `architecture`, or `debugging`. Provide relevant tags as a JSON string (e.g. `["auth", "backend"]`).
4. **Determine Tier (Local vs Global)**:
   - If the learning is specific to this exact codebase (like a hardcoded port or local db schema), it is **Local**. The root path should be `.agent_memory/`.
   - If the learning is a universal framework rule (like a Next.js bug or company-wide standard), it is **Global**. The root path should be `.global_memory/`.
5. **Determine Routing Paths**: Decide which memory index paths this learning applies to (e.g., `frontend`, `backend/api`). 
// turbo
6. **Execute**: Use the `run_command` tool to execute the `distiller_tool.py` script with the appropriate arguments, ensuring the files are saved to the correct Tier determined in step 4.
   - *Example Command:* `python .agent_memory/scripts/distiller_tool.py --title "NextJS Suspense Fix" --category "framework_bug" --tags "[\"nextjs\"]" --content "Long description..." --paths "frontend"`
7. Confirm to the user that the memory was safely stored in the graph.
