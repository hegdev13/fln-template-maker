# AGENT.md — read this first

This file is the hand-off for any agent or session picking this project up cold. It holds the idea behind the project, the rules for working in it, and where everything lives.

## Rules of engagement (do these before anything else)

1. **Read `TREESTRUCTURE.md` first.** It lists every file with a one-line description. Locate code through it. Do not grep or glob around aimlessly; only search after the tree has told you which files are plausible.
2. **Read `STEPS.md`** for what is done / open, then `SRS.md` for requirements. Tick items in STEPS.md as you finish them.
3. **Log every notable change in `CHANGELOG.md`** under `[Unreleased]` (Keep a Changelog format: Added / Changed / Deprecated / Removed / Fixed / Security; newest first).
4. **Keep `TREESTRUCTURE.md` true.** Any time a file is added, moved, renamed or removed, update it in the same change.
5. Update `SRS.md` when behaviour/requirements change, and this file when the vision, rules or architecture decisions change.
6. Verify UI changes in the browser (preview pane / `npm run dev`), not just with typecheck. Run `npm run typecheck` and `npm test` before calling work done.
7. Do not commit, push, or send anything outward unless the user asks.

## What this project is

A **generic, embeddable, Puck-style drag-and-drop PDF template builder** (React + TypeScript). A person drags components onto A4 (or other) pages, edits their properties, resizes/aligns them, saves the layout as **JSON**, and exports/prints it as a **PDF**.

It is a library/fork base, not an app for one customer. Its first consumer is the **FLN worksheet** project (github.com/vicharanashala/fln): printable worksheets for children aged 3–12 who struggle with Foundational Literacy and Numeracy. Those worksheets supplement teaching material to reinforce skills, and there are ~109 levels (see the user's FLN_109_Levels.pdf and Balvatika competency table).

### The end-to-end FLN flow (so the builder is designed with it in mind)

1. A teacher builds a **template** in this builder by dragging components: header, match-the-following, true/false, MCQ, "arrange the events in order", fill-in-the-blank, practice questions, images/SVGs, layout containers.
2. The template is mapped to an FLN level/skill (levels live in the host's database; the template's `metadata` bag carries that mapping).
3. Later, a **host app** loads the template, runs each component's `resolveData(props, ctx)` hook to fetch questions and SVGs (banana outline, apple outline, pen, candies…) from its DB, randomised by a **seed** per child, then exports the PDF that is printed for the child.

**Out of scope here:** the FLN database, level mapping, SVG store, auth, template storage backend. Those belong in the host app. This repo only provides the extension points (`resolveData`, `metadata`, config-driven components, `onChange`/`data`). Seeds only matter at generation time, so the builder UI has no seed input.

## Architecture in one screen

- **Template = plain JSON** (`Template` → `pages[]` → nested `ComponentData`), versioned and zod-validated (`src/core/schema.ts`).
- **Config-driven components**: a `Config` maps type → `{ label, fields, defaultProps, demoProps?, resolveData?, render }`. Inspector UI is generated from `fields`. Slots (`type: 'slot'`) are nested drop zones.
- **One render path**: the same `render` powers the editor canvas, preview, and PDF. Editor-only hints must be gated behind `useRenderMode() === 'edit'`.
- **Layout model**: every zone (page body or slot) is a CSS grid of **24 columns**. A component's width is `span` in 12ths (1–12 = 1/12 … full), placed with `cellProps()` (`src/core/runtime.tsx`); `align` (left/center/right) positions narrower items; `height` is a min-height in mm. Narrower components share rows.
- **Editor**: zustand vanilla store with immer + undo/redo (`src/core/store.ts`), dnd-kit drag with manual hit-testing (`src/editor/Editor.tsx`), selection bar + resize handles + snap guides (`src/editor/Canvas.tsx`), rulers that carry measurements (`src/editor/Rulers.tsx`).
- **PDF**: `src/pdf/export.ts` drives headless Chromium (Playwright) against `print.html`, which renders the same components via `PrintApp`. `server/index.ts` exposes `POST /api/pdf` for the playground.
- **Randomisation**: `resolveTemplate(template, config, { seed })` runs `resolveData` hooks with a per-component seeded RNG; same seed ⇒ same output; the saved template is never mutated.
- **Placeholders vs demo**: builder defaults are generic ("Question", "Option 1", "Statement 1"). Realistic sample content lives in each component's `demoProps` and shows only when the toolbar's **Demo content** toggle is on (never saved or exported).

## Product decisions already made (don't re-litigate)

- Puck-inspired but **own editor code**; HTML + print CSS → PDF via headless Chromium (not react-pdf, not window.print).
- Builder-only, English-only for now; FLN data is mocked/pluggable.
- Zones are grids; resizing snaps the dragged edge to the zone's twelfth lines (page margins for top-level components) with a dotted snap grid; height snaps to page quarters with a red guide; measurements/labels render **on the rulers**, not on the page.
- SVG authoring is on hold: SVG fields exist as raw markup; no upload/asset store yet.
- Text formatting lives on the text, not the component: `<RichText>` stores sanitized HTML (Tiptap editor, code-split, editor-only; the PDF renders the saved HTML). Component-level typography props are only the base size/colour/font. Rich values are edited on the page (inspector shows a read-only hint) and driven by the format bar (`activeEditor` in the store).
- **Output is greyscale: no colour anywhere in text styling** (no colour picker; colours in old templates are dropped by the sanitizer).
- Side handles move the dragged edge and pin the other: the result is saved as an explicit start column `col` (1–24) plus `span`; the Align buttons clear `col`.
- Typography is shared: size presets (H1 24pt, H2 18, H3 14, Normal 12, Small 10, Custom), bold/italic/underline/strike, font family (`src/components/typography.ts`).
- Questions: MCQ and True/False have inline/stacked option layout; MCQ numbering supports A)/a)/1./none (circles only); inspector arrays start collapsed except the first row.

## Commands

```bash
npm run dev        # playground + PDF API (default :5173, auto-moves if busy)
npm test           # vitest (core logic)
npm run typecheck  # tsc --noEmit
```

## Environment gotchas

- On this Mac, `python3` and some Xcode shims fail ("Xcode license not agreed"); use Node scripts for file edits/automation instead.
- `pdftoppm` is not installed, so PDFs can't be rasterised for viewing; inspect page count/size via the PDF bytes or load pages in the browser.
- The preview server may land on :5174 if :5173 is taken; the PDF endpoint uses the server's actual port.
- UI is easiest to verify with the built-in browser pane at ~1400×900 (`resize_window`), driving handles with synthetic PointerEvents (pointer capture is wrapped in try/catch for that).

## Git

The repo is initialised on branch `main`. Only commit when the user asks. Commit messages should end with the attribution lines from the session's instructions.

## Where to go next

See `STEPS.md` ("Hardening / next"). Typical next work: page-overflow warnings, outline panel, e2e tests, asset/SVG upload + asset resolver hook, Indic fonts, packaging as a library.
