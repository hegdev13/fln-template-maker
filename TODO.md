# Todo

Open work, roughly in priority order. Tick (`[x]`) or delete items as they land and mirror notable changes in CHANGELOG.md.

## Todo

### Release and packaging
- [ ] **Package as a library**: `vite build --lib` (ES + types), an `exports` map, drop `"private": true`, `peerDependencies` for React, publish config; split into workspaces (core / editor / components / pdf) only if publishing separately makes sense.
- [ ] **GitHub Action**: run `npm ci`, `npm run typecheck`, `npm test` and `npm run build` on every push and pull request.
- [ ] Playwright end-to-end tests for drag and drop, resize snapping and PDF export (needs the Action above to be worth it).

### Editor
- [ ] Keyboard use and accessibility: move/reorder components with the keyboard, aria labels and roles across the editor, focus management in dialogs.
- [ ] Outline / tree panel for navigating nested components.
- [ ] Pull content back when a page has room again (overflow only pushes content forward today, so empty trailing pages can be left behind), and pagination for components that are taller than a page.
- [ ] Rich text: alignment, lists and highlight (grey); rich text inside Fill-in-the-blank sentences (needs blank-marker handling) and Header / Match edge cases; Escape/blur edge cases in the in-place editor.
- [ ] Table: merge cells, add or remove rows and columns from the table itself, per-cell shading (grey).
- [ ] Image / SVG upload field type and an asset resolver hook (SVG authoring is on hold).

### Custom components (dev branch)
- [ ] Delete, rename and duplicate custom components from the palette.
- [ ] Per-use editable fields (for example a "Title" shown in the inspector).
- [ ] Optional live-linked definitions (placed copies update when the definition changes) instead of copies only.
- [ ] Categories for custom components; allow nesting custom components inside custom components.

### Data and output
- [ ] `resolveData` error handling and timeouts (a failing resolver should not break the whole render).
- [ ] Custom fonts / Indic scripts in the print route (Latin only for now).

### Docs
- [ ] Add a screenshot or GIF of the editor to the README.

## Done

1. Scaffold project, tooling and docs (single Vite package; layered `src/core|components|editor|pdf` instead of npm workspaces)
2. Core: schema, config types, store with undo/redo, tree ops, seeded RNG, resolver pipeline, unit tests
3. Built-in components (basic, layout, questions)
4. Editor UI: palette, canvas, nested slots, inspector, pages, JSON import/export
5. PDF export: print route + Playwright exporter + server endpoint
6. Playground with mock resolvers
7. Editor polish: duplicate, selection bar, no lingering text-selection haze, snap-to-twelfths width resize
8. Snap-grid overlay, alignment in row, vertical (min-height) resize with quarter guides
9. Rulers with on-ruler measurements and snap labels, demo-content toggle and placeholder defaults, typography, MCQ / True-False layouts, image vertical align
10. Per-letter rich text (Tiptap): format bar island, in-place editing, sanitizer
11. Colour removed (greyscale), free edge resizing (explicit `col`), Table component
12. Custom components: builder pop-up, JSON files in `custom-components/`, palette group with pencil and confirmation, PDF support
13. Automatic page flow: a component that runs past the bottom margin moves to the top of the next page, in the editor and in the exported PDF
14. MIT license, setup guide, README brought up to date
