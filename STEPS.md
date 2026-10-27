# Steps

Status: `[x]` done, `[ ]` todo. Update as work proceeds; mirror notable changes in CHANGELOG.md.

1. [x] Scaffold project, tooling, docs (single Vite package; layered `src/core|components|editor|pdf` instead of npm workspaces — split into packages later if publishing separately)
2. [x] Core: schema, config types, store with undo/redo, tree ops, seeded RNG, resolver pipeline, unit tests
3. [x] Built-in components (basic, layout, questions)
4. [x] Editor UI: palette, canvas, nested slots, inspector, pages, import/export JSON
5. [x] PDF export: print route + Playwright exporter + server endpoint (verified: 2-page A4 PDF)
6. [x] Playground with mock resolvers
7. [x] Editor polish: working duplicate, larger selection bar, no lingering text-selection haze, snap-to-fraction width resize (12-column grid zones)
8. [x] Snap-grid overlay, alignment in row, vertical (min-height) resize
9. [x] Rulers with on-ruler measurements, demo-content toggle + placeholder defaults, typography, MCQ/True-False layouts and collapsible option lists, image vertical align, seed input removed, AGENT.md
10. [x] Per-letter rich text (Tiptap): format bar, in-place editing, sanitizer, README, git init
11. [x] Colour removed (greyscale), free edge resizing (explicit `col`), Table component
12. [x] "+ Custom" button under Questions (dummy: shows a "Work in progress" popup), format bar only appears for components that have text
13. [ ] Hardening / next
   - [ ] **DISCUSSION NEEDED — "+ Custom" question type.** Currently a dummy button in the palette's Questions group that only opens a "Work in progress" popup. Open questions before building it: what is a custom question (a host-registered component, a user-defined layout of existing blocks, or a form-style builder); where its definition is stored and how it reaches `resolveData` / the FLN database; how it appears in the palette; whether authors or developers create it.
   - [ ] Table: merge cells, add/remove rows and columns from the table itself, per-cell shading (grey)
   - [ ] Rich text for Fill-in-the-blank sentences (needs blank-marker handling) and Header/Match edge cases
   - [ ] Highlight colour, alignment and lists in rich text
   - [ ] Auto page-overflow indicator in editor (warn when a page's content exceeds its height)
   - [ ] Component `resolveData` error handling/timeouts
   - [ ] Sibling reorder via keyboard; outline/tree panel
   - [ ] Playwright e2e for drag/drop and export
   - [ ] Package build (`vite build --lib`) and publish config; split into workspaces if needed
   - [ ] Custom fonts / Indic scripts support in print route
   - [ ] Image/SVG upload field type and asset resolver hook
