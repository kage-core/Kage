# Kage Viewer Demo Script

Purpose: show that Kage is not a black-box notes folder. It is visible repo
memory connected to the source graph.

Format: 16:9, silent autoplay-friendly MP4, 15-18 seconds.

## Storyboard

1. **Open with the promise**
   - Caption: `Kage viewer: repo memory you can inspect`
   - Show the hosted viewer auto-loading the Kage repo graph.

2. **Show scale without noise**
   - Caption: `2,083 nodes. 4,681 relations. Filtered to signal.`
   - Fit the graph so memory and code clusters are visible.

3. **Click a useful runbook memory**
   - Caption: `Click a memory node. The inspector explains it.`
   - Select the Claude Code setup runbook node and show its summary/evidence in
     the side inspector.

4. **Click a decision memory**
   - Caption: `Decisions stay connected to the repo graph.`
   - Select the viewer combined-mode decision node and show its side-panel
     description.

5. **Click a code node**
   - Caption: `Code facts come from source, not chat.`
   - Select a code function node and show file/function metadata in the
     inspector.

6. **Click a test file node**
   - Caption: `Relations reveal where memory touches tests and files.`
   - Select a test file node and show the file metadata plus visible graph
     relations.

7. **End on the hive loop**
   - Caption: `One agent learns. The repo remembers. Future agents recall.`
   - Reset to the combined graph.

## Notes

- Use the deployed GitHub Pages viewer so the recording matches what a user can
  open at `https://kage-core.github.io/Kage/viewer/`.
- Keep the clip wide. Do not use the in-app vertical browser viewport.
- Avoid search-box flows for the main launch clip. This demo should feel like
  playing with an interactive knowledge graph: click node, inspect details,
  follow relations.
