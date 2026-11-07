# Repository update notice

## Product intent

Tell people who cloned the UAVLED effects repository that their local simulator is behind the public repository after new content is pushed.

## UX contract

- On simulator startup, show a non-blocking notice only when the remote `main` commit differs from the commit embedded in the local build.
- Show the remote short SHA and commit title, with links to the GitHub comparison and controls to recheck or dismiss.
- GitHub failures and builds without Git metadata remain silent; simulation itself must continue working.

## Shared domain/data contract

`simulator/vite.config.js` embeds `git rev-parse HEAD` as `__UAVLED_BUILD_COMMIT__`. `simulator/src/repositoryUpdate.js` queries `https://api.github.com/repos/VIDLG/uavled-effect/commits/main` and returns `current`, `update-available`, or `unavailable` without credentials.

## Flutter mobile route

This repository currently exposes a Vite/React simulator only. A future mobile client should use an app release manifest or signed update channel rather than relying on the browser GitHub check.

## Tauri desktop route

Desktop can reuse the same read-only update metadata contract, but should obtain the local commit from the packaged build manifest and keep the notice in the desktop shell.

## Sync and storage implications

No account data or local file paths leave the device. The check is a public GET request and does not persist repository state.

## AI/provider implications

None. This feature does not call an AI provider.

## Implementation log

- 2026-11-07: Added build-time commit injection, GitHub `main` commit check, update notice component, and responsive styling.
- 2026-11-07: Added pure unit coverage and a mocked production-browser check for the behind-clone path.

## Mobile lessons learned

Do not use the simulator's GitHub polling design as an authentication or data-sync mechanism. It is only a public repository freshness hint.

## Desktop follow-up notes

Use a packaged version manifest and a configurable repository endpoint if the desktop app is distributed outside this repository.

## Route changes

No navigation routes changed; the notice renders below the global simulator header.

## Known pitfalls

- A local branch with unpushed commits will also differ from `main`; the notice links to the comparison page so the state is inspectable.
- GitHub rate limiting or offline use suppresses the notice rather than blocking the simulator.

## Verification

- `node --test tests/repository-update.test.mjs`: 4 passing.
- `npm run sim:build`: passed.
- Production browser check with a mocked newer GitHub commit: notice rendered, comparison URL was present, and dismissal removed it.
