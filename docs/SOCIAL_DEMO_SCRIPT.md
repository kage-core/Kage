# Kage Social Demo Script

## Angle

Once upon a time in the repo.

The demo is a doodle-character meme. Every time the human tries to get work
done, a fresh AI agent acts like a tiny clueless intern and asks for repo
context. The human keeps opening a giant "Repo Lore" storybook and starting
"once upon a time...". Kage enters, stamps the story into repo memory, and the
next agent starts working without asking stupid questions. The human realizes
the child has grown.

## Style

- Off-white paper background with black hand-drawn doodles.
- Human: tired doodle developer with laptop and coffee.
- Agent before Kage: tiny baby/intern-style doodle with a cursor hat.
- Agent after Kage: same agent standing taller with glasses and confidence.
- Kage: green notebook/stamp character.
- No chat UI. Use meme captions, laptop interruption cards, storybook pages,
  stamps, and one small action strip for product proof.
- Slow pacing: roughly one minute, with readable scenes.

## Video Beat

1. Monday: human tries to ship and asks the agent to fix a release bug.
2. Agent asks: "what is this repo?"
3. Human opens the Repo Lore storybook: "Once upon a time..."
4. Tuesday repeats with a new agent and the same bedtime story.
5. Wednesday breaks the human: agent asks "what are tests?"
6. Kage enters and stamps the story into repo memory: runbook, decision, bug
   fix, paths, tests, why.
7. Thursday: human asks for release work; agent recalls context and starts
   editing/running tests.
8. Proud-parent payoff: "The child has grown."
9. CTA: "Stop onboarding agents. Give your repo memory."

## Lines

- "me: finally, time to ship"
- "agent: cool. what is this repo?"
- "new day. same bedtime story."
- "once upon a time in the repo..."
- "agent #7 asks a deep question"
- "kage: put the story in the repo"
- "agent: already recalled context. running tests."
- "The child has grown."
- "Stop telling bedtime stories. Give your repo memory."

## Asset

Rendered with:

```bash
node scripts/render-social-demo.mjs
```

Outputs:

- `docs/assets/kage-social-demo.mp4`
- `docs/assets/kage-social-demo-poster.png`
