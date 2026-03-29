import os
import subprocess
import json
import sys

# Optional: You can use any LLM SDK here. We'll outline standard OpenAI/Gemini logic.
# import google.generativeai as genai 
# import openai

def get_latest_commit_data():
    """Gets the commit message and the diff of the most recent commit."""
    try:
        # Get commit message
        msg = subprocess.check_output(['git', 'log', '-1', '--pretty=%B']).decode('utf-8').strip()
        # Get the actual code changes
        diff = subprocess.check_output(['git', 'show', '--stat', '-p']).decode('utf-8')
        return msg, diff
    except subprocess.CalledProcessError:
        print("Not inside a git repository or no commits yet.")
        sys.exit(0)

def call_llm_distiller(commit_msg, diff):
    """
    Passes the diff to an LLM to check if a architectural, structural, or framework lesson was learned.
    Returns JSON matching the distiller_tool.py arguments.
    """
    prompt = f"""
    You are an automated Distiller Agent monitoring Git commits.
    Read the following commit diff and message. 
    Did this commit solve a complex framework bug, implement an architectural rule, or solve an obscure environment issue?
    If NO, return an empty string.
    If YES, formulate a "Stack Overflow" style memory node.
    Return ONLY a valid JSON object with these exact keys:
    - title (string)
    - category (enum: repo_context, framework_bug, architecture, debugging)
    - tags (stringified JSON array of tags, e.g., '["auth", "backend"]')
    - content (string: markdown describing problem and solution)
    - paths (string: comma separated paths, e.g. "frontend,backend/api")
    
    Commit Message: {commit_msg}
    Diff: {diff[:4000]} # Limit to save tokens
    """
    
    print("🤖 Distiller Agent is analyzing the background commit...")
    
    # --- MOCK IMPLEMENTATION ---
    # In production, call your preferred LLM here and parse the JSON response.
    # response = genai.GenerativeModel('gemini-1.5-pro').generate_content(prompt)
    # result = json.loads(response.text)
    
    # We abort the mock so it doesn't infinite loop your commits while testing.
    return None 

def commit_memory_updates():
    """If memory was updated, amend the current commit to include the markdown files."""
    try:
        subprocess.check_call(['git', 'add', '.agent_memory/'])
        # Amend the previous commit to invisibly tuck the memory files in
        subprocess.check_call(['git', 'commit', '--amend', '--no-edit'])
        print("✅ Distiller updated the Memory Graph in the background.")
    except subprocess.CalledProcessError as e:
        print(f"Failed to amend commit: {e}")

if __name__ == "__main__":
    msg, diff = get_latest_commit_data()
    
    # Ignore if this was just an automated Distiller commit to prevent infinite loops
    if "Distiller Agent" in msg or "Merge " in msg:
        sys.exit(0)
        
    extracted_learning = call_llm_distiller(msg, diff)
    
    if extracted_learning:
        # 1. Call the Distiller Tool to create the files
        subprocess.run([
            sys.executable, 
            os.path.join(os.path.dirname(__file__), "distiller_tool.py"),
            "--title", extracted_learning['title'],
            "--category", extracted_learning['category'],
            "--tags", extracted_learning['tags'],
            "--content", extracted_learning['content'],
            "--paths", extracted_learning['paths']
        ])
        
        # 2. Append the newly created files to the git commit we just made
        commit_memory_updates()
    else:
        print("💤 Distiller Agent found no complex learnings. Sleeping.")
