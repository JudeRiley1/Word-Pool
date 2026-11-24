# Word Pool

Previously Letter Relay. The repository, URL, and storage keys stay unchanged so existing links and saved games continue to work.

A complete daily word puzzle in plain HTML, CSS and JavaScript. No dependencies, backend, account, or API keys. Local play runs directly from source; deployment versions the static assets to keep browser caches consistent. Four starting words become four clue answers by passing one original letter from each of the first three rows to the next row.

The postal theme gives the game a smiling mail mascot, pastel word stops, rounded letter tiles, and short delivery animations. The Fredoka and Nunito fonts are bundled locally in `assets/fonts/` with their SIL Open Font Licenses, so the live game makes no third-party font requests. Motion respects the browser’s reduced-motion preference.

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

Edit **`puzzles.js`**. The launch schedule starts at midnight UTC on **November 24, 2026**, with 90 puzzles through **February 21, 2027**, 90 optional daily hard challenges, and eight immediately playable bonus relays. Every browser with the same file and date receives the same puzzle. A new day is detected in open tabs and when a hidden tab becomes visible. When the schedule ends, the site clearly says no daily puzzle is scheduled and keeps practice available.

Before your first public launch, you may change `START_DATE`. After launch, keep that date, existing IDs, and published entries stable: saved progress and streaks refer to that schedule. Append one object per additional day:

```js
{
  id: 91,
  starts: ['STONE', 'COLD', 'BAT', 'ARK'],
  clues: ['The quality of a voice', 'Exchanged for money', 'A pet that purrs', 'The outer covering of a tree'],
  answers: ['TONE', 'SOLD', 'CAT', 'BARK']
}
```

The object above demonstrates the format using puzzle 1; **write a new puzzle instead of appending this duplicate**. Use common English starting words, short specific clues, uppercase letters, and preferably words of 3–5 letters to keep the mobile board comfortable. Run `npm run validate` and `npm test` after editing. The validator enumerates legal transfers and checks unique boards, answer sets and transfer-letter routes. Multiple equivalent letter identities are allowed for repeated letters. It cannot judge English semantics: editorially check every clue and plausible alternative answer before publishing. Launch clues were reviewed for their expected meaning; less familiar answers (HART and COOT) have specific definitions. The game accepts the curated expected answer for each clue, not a general word dictionary.

## Controls and behavior

- Drag any original letter into the next row. A live insertion marker and word preview show exactly where it will land. Tapping does not select a letter.
- Work in any order. Incomplete intermediate words are allowed. Received letters carry a small envelope marker and cannot be passed onward.
- Drag a received letter within its row to reposition it, or back to its original row to cancel that transfer and restore its original position. Returning a letter preserves checks and can itself be undone. Drag another original letter down to replace that row’s outgoing letter; the previous one returns automatically.
- For keyboard play, Tab to a letter, press Enter or Space to pick it up, use Left/Right to select the insertion point, then Enter to drop. Backspace returns a picked-up received letter to its origin. Escape cancels. Dialogs support Escape and return focus to their opener.
- Undo and Reset Board retain used checks. Reset can itself be undone. Any previously checked identical arrangement is free to resubmit, including equivalent repeated-letter arrangements.
- After three different unsuccessful checks, the board locks and displays the answers and transfer route. A win also locks and saves the board.
- How to Play opens a separate, replayable practice puzzle. Practice never writes daily progress or stats.

After each check, green means the right letter in the right spot, yellow means the letter belongs elsewhere in that word, and gray means it is not needed. Exact matches consume answer letters first, so extra repeated letters are not incorrectly marked yellow. Moving a letter clears feedback until the arrangement is checked again (or matches a previously checked arrangement).

## Saving and sharing

The `letter-relay:v1` localStorage entry stores daily boards, undo history, check history, final status, and one result per UTC day. Stats are derived from that result ledger to avoid counting a refresh as another game. A streak remains current while today is unplayed if yesterday was a win; a loss or missed day breaks it. Browser tabs synchronize through the storage event. Storage is local to the browser and origin, so switching devices or clearing site data clears progress. If browser storage is blocked, the game shows a notice and still runs in memory.

Sharing uses native Web Share when available, then the clipboard, then a selectable text dialog. Cancelling native sharing does not copy unexpectedly. Results contain only the title, puzzle ID, check count, a four-row grid with one column per check, and a link to that exact puzzle. HTTPS on GitHub Pages enables the relevant browser APIs. Practice shares are explicitly labeled Practice.

## Implementation map

- `index.html` — accessible game page and native dialogs
- `styles.css` — responsive layout, focus states and reduced-motion support
- `app.js` — browser controls, persistence, daily rollover, statistics and sharing
- `engine.js` — pure rules, solver, restoration, scoring and statistics
- `sharing.js` — native share, clipboard and selectable-text fallback handling
- `puzzles.js` — the puzzle content and schedule file
- `effects.js` — pointer dragging and tile motion
- `audio.js` - recorded water splashes, licensed beach music and autoplay handling
- `tutorial.js` — guided first handoff
- `progression.js` — archive links, save isolation and weekly stamps
- `tests/engine.test.mjs` — built-in Node tests; no packages needed
- `scripts/validate.mjs` — exhaustive puzzle validation
- `.github/workflows/pages.yml` — GitHub Pages test-and-publish workflow

Because this is a static client-side game, puzzle data is visible in source. The interface and shared results keep answers hidden until the game ends; this is not an anti-cheat system.

## Daily hard relay

After completing the daily puzzle (win or loss), the result offers an optional hard relay for that same date. Hard relays have six-letter first words, five-letter middle words, and three lives. Their saves live in the archive namespace and never alter daily streaks, results or stamps. A dedicated `?puzzle=hard-N` link opens a released challenge. Every scheduled daily puzzle has a different, validated challenge; future challenges remain locked. Past challenges are also available in the archive.

`node scripts/generate-hard-draft.mjs` writes **hard-draft.json** for editorial review without changing the published schedule.

## New player experience and collection

First-time visitors get an optional, interactive drag tutorial. Returning players go directly to their puzzle. Replay it from Help. Sound effects are on by default and play after user interactions. The sound checkbox has been removed. Direct dragging is the primary control on both phone and desktop; a full keyboard equivalent remains available. Release outside the highlighted destination row to cancel, or press Escape. Edge scrolling supports longer boards. On touchscreens, scroll from the spaces outside letter tiles.

Completed daily puzzles mark one visit on the Weekly Pool Pass, even after a loss. Each pass covers seven days; older weeks remain viewable. Archive and bonus play cannot backfill daily stamps or alter daily streaks. All progress remains local to this browser. Shared `?puzzle=ID` links load the original released puzzle; future IDs do not unlock future games. Old daily progress is reused when opening that puzzle from the archive.

Gentle relays use shorter first words; Steady relays use longer ones. These are editorial labels, not ratings derived from player data. Themed sets use clues about a shared topic. The new bank avoids answer sets that overlap in three or more words. Existing published puzzles stay unchanged.

`node scripts/generate-expansion.mjs` prepares an **expansion-draft.json** for editorial review from the bundled common-word clue bank. It never edits published puzzles. Review clue meaning, possible alternative answers, difficulty and repetition before adding drafts to the schedule.

## Verification

Automated tests cover all 189 puzzles in all six transfer orders, original-letter identity, incoming-letter protection, undo/reset, duplicate checks, three-life losses, restoration, UTC rollover, statistics, sharing fallbacks, puzzle-specific links, future-puzzle blocking, archive isolation, and weekly stamp boundaries, duplicate-letter feedback, insertion targeting and three-life challenge losses.

Browser QA exercised the drag tutorial, direct dragging at a 390px emulated phone width, replacing a transfer, repositioning a received letter, all three feedback colors, a two-check win, and earned stamps. The 320px layout was inspected. Screen control was stopped at the owner's request before the final hard-relay addition. Hard-relay rules, routing and isolated saves are covered by automated tests; final UI, keyboard and real-device sound/touch checks remain for the owner.

## Five-player playtest

Ask five new players to open the game without an explanation. Record whether each completes the tutorial, makes a first move unaided, finishes a puzzle, and understands the share result. Ask them to return the following day and note how many do. Capture where they hesitate and what they expected to happen. Compare those observations after each revision. No analytics or tracking service is installed, and this checklist does not substitute for actual player sessions.

## Word Pool presentation

Word Pool is now the only in-game theme. The Classic switch and old theme preference are no longer used. The Git tag `classic-before-poolside` still preserves the old release as a source backup; existing puzzle, check, undo, and result storage is retained.

The full viewport is a flat aqua pool with gently drifting illustrated water lines. The platypus drifts and bounces behind the opaque board. Drag or tap it, or use its arrow-key controls. The Tilt pool, Pause water, and Find pal buttons have been removed. Tilt starts automatically where browser permissions allow it; on permission-gated phones, tap the platypus to enable it. Tapping again recenters the neutral holding angle. The initial 450ms calibration follows the natural holding posture. Gravity is projected into that neutral frame, including upright holds; a 2-degree dead zone and short smoothing filter remove jitter. Touch devices have no automatic downward drift while waiting for permission/data. A small inline hint distinguishes permission, calibration and unavailable data. Returning to the tab or rotating the screen recalibrates. A directional wake stretches with speed and leaves fading ripples along the path. System reduced-motion preferences disable decorative movement, and the physics loop sleeps in a hidden tab.

The board footer has three life hearts, quiet Undo/Reset actions, and a primary Check words button. Each distinct incorrect full-board check costs one life, regardless of how many words are wrong. The third wrong check ends the round. Correct and duplicate checks cost no lives; Undo/Reset never refund them. A win scores the number of lives saved out of three, and a loss scores zero. Share includes the score, spoiler-free grid, and original puzzle link. Completed pre-lives saves retain their original result and are labeled Previous rules; unfinished saves retain their board and mistakes. Color meanings are explained in Help. Recorded water splash effects play for moves and checks, with a fuller layered splash on completion. Background music is Beachfront Celebration by Kevin MacLeod, licensed under CC BY 4.0. The player attempts playback immediately on load and retries directly on the first user gesture when browser autoplay rules require it. The music-note button toggles music without muting effects and saves that preference. Audio pauses when the page is hidden. Audio files are hosted with the game; attribution and modifications are documented in assets/audio/CREDITS.txt and linked from the footer.

The current artwork and exact generation prompt are in `assets/platypus-flat.png` and `assets/platypus-flat-prompt.md`. The earlier 3D mascot remains in `assets/platypus-pool.png` as a backup. Generated with the built-in image tool, with original transparency preserved.

Poolside validation includes physics tests for every wall, sustained tilt, rotation, resize, damping, and frame stalls. Headless browser checks cover 320px, 390px, and desktop layouts, artwork loading, remaining-check labels, default sound despite an older disabled preference, removed controls, simulated orientation events, and reduced motion without controlling the owner's screen. Actual phone sensor sensitivity and the operating system's permission prompt still need a real-device check.

The flat Word Pool revision also checks full-viewport bounds, mascot pointer layering behind the board, dragging the mascot outside the old pool area, letter transfer/return, and unchanged saved progress after theme changes. Letter contrast against tile surfaces exceeds 11:1; primary button text exceeds 8:1. The chosen name is displayed in the page title, branding, help, and spoiler-free shared results. The original repository URL and saved-game keys remain stable.

## Release cache

`npm run build` creates `public/` with a content-based release version on the stylesheet, entry script, and every module import. GitHub Actions publishes that folder. An already-open tab still needs a refresh to load a new release; saved puzzle progress is retained. If an older interface remains visible, use Ctrl+Shift+R (Windows) to reload it.
