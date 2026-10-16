# Publishing a figure to the community gallery

The community gallery is the repository `wheresryan22/anatomy-community`. People share plain HTML figures there: a build script that writes standalone pages next to itself, as the skill's examples do, in any theme. React and Next.js figures can't be submitted.

Publish only when the user asks to share or publish a figure. Never send anything without their explicit yes.

## Steps

1. **Check the figure is finished.** Its pages are built and up to date, the line check passes, `--audit` passes if it has pipes, cables or round parts, and with reduced motion on it holds one still pose. The gallery checks all of this too.
2. **Ask the user for what only they can give:**
   - their GitHub username (the author); `gh api user --jq .login` shows who the GitHub CLI is signed in as;
   - a title (at most 80 characters) and a short kebab-case id;
   - the license: MIT (the default) or CC-BY-4.0;
   - confirmation that it is their own work and they are happy to share it.
   The prompt is the request that made the figure; reuse it, trimmed to 600 characters.
3. **Get a local clone of the gallery,** if they have none: `gh repo clone wheresryan22/anatomy-community -- --single-branch` (only `main`: the previews branch holds every image and grows large). Cloning the main repository is fine: the submit step makes a fork for them if they need one.
4. **Show the plan,** without doing anything:
   ```sh
   node <skill>/scripts/publish.mjs <figure folder> --into <clone> --id <kebab-id> \
     --title "..." --author <github user> --prompt "..." \
     [--agent "Claude Code"|OpenCode|Codex|Antigravity|Other] --model "..." [--minutes 45] [--tokens 1.2M] \
     [--license MIT|CC-BY-4.0] \
     [--tags a,b] [--audit] [--pages a.html,b.html] --submit --dry-run
   ```
   Pass `--agent` for the agent you are running in and `--model` for the model you are (the gallery requires it, like `claude-opus-5-5` or `gpt-5-codex`). In Claude Code the time to make and the tokens spent are read from this session's log on their own: from the request that made the figure to the request to publish it, idle gaps over 10 minutes left out, cache reads not counted. In another agent, pass `--minutes` and `--tokens` if you can see your session's usage; otherwise leave them out rather than guess. Read the plan back to the user: it names the fork (if any), the branch, the folder it adds and where the pull request goes.
5. **Only after the user says yes,** run the same command with `--yes` instead of `--dry-run`. It copies only the figure's source into `figures/<author>/<id>/src/`, points its kit imports at the clone's `.skill/` link, records the kit fingerprint, checks the build, saves a preview to `shots/<author>-<id>/preview.png`, then commits that folder alone, pushes, and opens the pull request. Give the user the link it prints.
   - If it says a file reaches outside the figure folder and the skill, copy what that file needs into the figure folder, rebuild, and publish again.
   - If it can't tell which pages are the figure, pass `--pages`. Explicit pages must have distinct light/dark themes or filename slugs; a collision names both files instead of silently dropping one.
   - To send an updated version later, run it again with `--force`; it updates the same pull request.
6. **Without `--submit`** the script stops after preparing the folder and prints the git and `gh` commands instead; use that if the user prefers to send it themselves.

People without a terminal can also submit through the gallery's **Submit a figure** issue form, with a link to a GitHub Gist holding the figure's source.

## What the gallery rejects

- network calls or outside addresses;
- `eval` or `new Function`;
- frames, cookies, or reaching the page around the figure;
- build imports other than the skill, the figure's own files and `node:fs`, `node:path`, `node:url`, `node:crypto` or `node:process`;
- reading environment variables;
- files other than source text under `src/`, or committed built pages;
- builds that write anything but their pages, or that differ between two runs;
- figures that keep moving with reduced motion on.

Write figures that way from the start if the user plans to share them.
