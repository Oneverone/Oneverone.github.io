# Agent Notes

## Project Goal

Build `www.chenandgao.com` as a personal blog for Chen & Gao.

The first milestone is to complete the simplest working GitHub Pages chain:

- Open `www.chenandgao.com`
- See visible page content
- Keep all site resources in GitHub
- Avoid buying or maintaining a separate server unless a future feature truly requires it

## Current Hosting Plan

Use GitHub Pages.

Recommended repository:

- `Oneverone.github.io`

Custom domain:

- `www.chenandgao.com`

Current DNS target:

- `www` CNAME -> `Oneverone.github.io`

Current local minimum site files:

- `index.html`
- `CNAME`
- `.nojekyll`
- `README.md`

## Operating Requirements

- Prefer the simplest reliable path first.
- Do not introduce a build system until the static GitHub Pages chain is verified.
- Keep the first publish version minimal: one visible homepage is enough.
- After the domain is reachable, design the real blog separately.
- Keep files suitable for GitHub Pages root deployment.
- Preserve the `CNAME` file with `www.chenandgao.com`.
- Avoid unrelated refactors or framework changes without a clear reason.
- When the user gives a new requirement, automatically decide whether it should be recorded in this file.
- If a requirement affects future behavior, project direction, deployment, design, or user preferences, update this file.
- Write explanations for the user in plain, beginner-friendly language. Assume the user is new to frontend and backend development.
- Prefer step-by-step instructions with clear names for buttons, files, pages, and settings.
- Prioritize a long-term automatic upload workflow over repeated manual GitHub web uploads.
- Preferred long-term workflow: local Git commits and pushes to GitHub, with GitHub Pages publishing from the repository.

## Future Blog Direction

After the chain is verified, consider building a fuller blog with:

- Home page
- Posts
- About us
- Timeline
- Photo gallery

Preferred future stack:

- Astro
- Markdown or MDX posts
- GitHub Actions deployment to GitHub Pages

## Notes For Codex

- The user prefers GitHub-hosted resources and no separate server.
- The user wants practical progress before visual polish.
- Current task priority is deployment chain verification, then blog design.
- If local `git` or `gh` is unavailable, tell the user clearly and provide the shortest GitHub web workflow.
