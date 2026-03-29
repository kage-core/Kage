import os
import argparse
import datetime
import re

def create_memory_node(title, category, tags, content, relative_paths):
    """
    Creates a new memory node in /nodes/ and securely appends links to the specified index paths.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    nodes_dir = os.path.join(base_dir, 'nodes')
    os.makedirs(nodes_dir, exist_ok=True)

    # Sanitize title for filename
    safe_filename = re.sub(r'[^a-zA-Z0-9_\-]', '_', title).lower() + '.md'
    node_path = os.path.join(nodes_dir, safe_filename)

    # 1. Create the Memory Node
    with open(node_path, 'w', encoding='utf-8') as f:
        f.write(f"---\ncategory: \"{category}\"\ntags: {tags}\ndate: \"{datetime.date.today()}\"\n---\n\n")
        f.write(f"# {title}\n\n")
        f.write(content + "\n")
    
    print(f"✅ Created Memory Node: {node_path}")

    # 2. Update the Indexes safely
    for path in relative_paths:
        # e.g., path = "frontend/api"
        index_dir = os.path.join(base_dir, path)
        os.makedirs(index_dir, exist_ok=True)
        index_file = os.path.join(index_dir, 'index.md')
        
        # Create index if it doesn't exist
        if not os.path.exists(index_file):
            with open(index_file, 'w', encoding='utf-8') as f:
                f.write(f"# {path.capitalize()} Context Index\n\n## Uncategorized\n\n")
        
        # Calculate relative path from this index to the node
        # e.g., if path is frontend/api, depth is 2, so ../../nodes/
        depth = len(path.strip('/').split('/'))
        rel_prefix = '../' * depth
        rel_link = f"{rel_prefix}nodes/{safe_filename}"

        # Append the link
        with open(index_file, 'a', encoding='utf-8') as f:
            f.write(f"*   [{title}]({rel_link})\n")
        
        print(f"🔗 Appended link to {index_file}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Agent Memory Distiller Tool")
    parser.add_argument('--title', required=True, help="Title of the memory")
    parser.add_argument('--category', default="repo_context", help="Category type")
    parser.add_argument('--tags', default="[]", help="JSON array of tags")
    parser.add_argument('--content', required=True, help="The core memory text")
    parser.add_argument('--paths', required=True, help="Comma-separated relative index paths (e.g. frontend,backend/api)")
    
    args = parser.parse_args()
    paths_list = [p.strip() for p in args.paths.split(',')]
    
    create_memory_node(args.title, args.category, args.tags, args.content, paths_list)
