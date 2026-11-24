# Letter Relay

A complete daily word puzzle in plain HTML, CSS and JavaScript. No dependencies, backend, account, build step, or API keys. Four starting words become four clue answers by passing one original letter from each of the first three rows to the next row.

## Run locally

Install Node.js 22 or newer, then run:

On Windows, you can also double-click **`Start Letter Relay.cmd`** to start the server and open the game. Keep its terminal window open while playing.

```sh
npm start
```

Open **http://127.0.0.1:4173**. Alternatively, run `python -m http.server 4173` and open that same address. Use an HTTP server: opening `index.html` as a `file://` URL will block JavaScript module imports in many browsers.

```sh
npm test          # game rules, all puzzles in all move orders, saves, stats, sharing
npm run validate # puzzle structure, uniqueness, transfer rules and solution routes
```

## Publish to GitHub Pages

1. Create a GitHub repository and push these project files to its `main` branch.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source.
3. Run the included **Publish Letter Relay** workflow (or push a commit to `main`). It tests the game, copies only the public game files, and deploys them to Pages.
4. Open `https://YOUR-NAME.github.io/YOUR-REPOSITORY/` after the workflow finishes.

For branch-based hosting, select **Deploy from a branch → main → / (root)** instead. All assets use relative paths, so the game also works at a custom domain. Configure an optional custom domain in Pages settings. No source code changes are needed. This project is prepared for deployment; no GitHub repository is created or published automatically by the local game.

## Schedule and add puzzles

Edit **`puzzles.js`**. The launch schedule starts at midnight UTC on **November 24, 2026**, with 30 puzzles through **December 23, 2026**. Every browser with the same file and date receives the same puzzle. A new day is detected in open tabs and when a hidden tab becomes visible. When the schedule ends, the site clearly says no daily puzzle is scheduled and keeps practice available.

Before your first public launch, you may change `START_DATE`. After launch, keep that date, existing IDs, and published entries stable: saved progress and streaks refer to that schedule. Append one object per additional day:

```js
{
  id: 31,
  starts: ['STONE', 'COLD', 'BAT', 'ARK'],
  clues: ['The quality of a voice', 'Exchanged for money', 'A pet that purrs', 'The outer covering of a tree'],
  answers: ['TONE', 'SOLD', 'CAT', 'BARK']
}
```

The object above demonstrates the format using puzzle 1; **write a new puzzle instead of appending this duplicate**. Use common English starting words, short specific clues, uppercase letters, and preferably words of 3–5 letters to keep the mobile board comfortable. Run `npm run validate` and `npm test` after editing. The validator enumerates legal transfers and checks unique boards, answer sets and transfer-letter routes. Multiple equivalent letter identities are allowed for repeated letters. It cannot judge English semantics: editorially check every clue and plausible alternative answer before publishing. Launch clues were reviewed for their expected meaning; less familiar answers (HART and COOT) have specific definitions. The game accepts the curated expected answer for each clue, not a general word dictionary.

## Controls and behavior

- Tap/click an original letter, then a **+** insertion slot in the next row. Slots are labeled first, last, or after a letter.
- Work in any order. Incomplete intermediate words are allowed. Received letters are green and underlined; they cannot be passed onward.
- Tap a received letter or **sent · edit** to reposition the transfer. Choose another original letter to replace that row’s outgoing letter; the previous one returns automatically.
- Tab, Enter and Space operate every control. Escape cancels a letter selection. Dialogs support Escape and return focus to their opener.
- Undo and Reset Board retain used checks. Reset can itself be undone. Any previously checked identical arrangement is free to resubmit, including equivalent repeated-letter arrangements.
- After six different unsuccessful checks, the board locks and displays the answers and transfer route. A win also locks and saves the board.
- How to Play opens a separate, replayable practice puzzle. Practice never writes daily progress or stats.

## Saving and sharing

The `letter-relay:v1` localStorage entry stores daily boards, undo history, check history, final status, and one result per UTC day. Stats are derived from that result ledger to avoid counting a refresh as another game. A streak remains current while today is unplayed if yesterday was a win; a loss or missed day breaks it. Browser tabs synchronize through the storage event. Storage is local to the browser and origin, so switching devices or clearing site data clears progress. If browser storage is blocked, the game shows a notice and still runs in memory.

Sharing uses native Web Share when available, then the clipboard, then a selectable text dialog. Cancelling native sharing does not copy unexpectedly. Results contain only the title, puzzle ID, check count, four correct/incorrect symbols per check, and the game link. HTTPS on GitHub Pages enables the relevant browser APIs. Practice shares are explicitly labeled Practice.

## Implementation map

- `index.html` — accessible game page and native dialogs
- `styles.css` — responsive layout, focus states and reduced-motion support
- `app.js` — browser controls, persistence, daily rollover, statistics and sharing
- `engine.js` — pure rules, solver, restoration, scoring and statistics
- `sharing.js` — native share, clipboard and selectable-text fallback handling
- `puzzles.js` — the only puzzle content and schedule file
- `tests/engine.test.mjs` — built-in Node tests; no packages needed
- `scripts/validate.mjs` — exhaustive puzzle validation
- `.github/workflows/pages.yml` — GitHub Pages test-and-publish workflow

Because this is a static client-side game, puzzle data is visible in source. The interface and shared results keep answers hidden until the game ends; this is not an anti-cheat system.

## Verification

The 45 automated tests cover all 31 puzzles in all six transfer orders, repeated-letter identity, incoming-letter protection, undo/reset, duplicate checks, six-check losses, serialized progress restoration, UTC boundaries, schedule exhaustion, statistics, and all sharing fallback branches. The puzzle validator also passes for every launch puzzle and practice. Desktop rendering and bottom-up transfers were exercised in Edge. Real-device mobile touch behavior and the native phone share sheet still need device verification; these are not claimed as completed browser tests.
