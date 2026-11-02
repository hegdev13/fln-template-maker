# Tree structure

```
.
├── README.md                 Overview, features, quick start, embedding / resolver / PDF examples
├── AGENT.md                  Hand-off: project vision, FLN flow, architecture, rules (read first)
├── CLAUDE.md                 Pointer to AGENT.md with the short rules
├── SRS.md                    Software requirements specification
├── SETUP.md                  Requirements, install, commands, troubleshooting
├── TODO.md                   Open work (packaging, CI, editor, data) and the done list
├── LICENSE                   MIT license
├── CHANGELOG.md              Keep-a-Changelog history
├── TREESTRUCTURE.md          This file
├── package.json              Scripts (dev/build/test/typecheck) and deps
├── tsconfig.json             TypeScript config (strict, noEmit)
├── vite.config.ts            Vite multi-page build (index + print) and vitest config
├── index.html                Playground entry page (editor)
├── print.html                Print entry page loaded by headless Chromium for PDF export
├── .claude/launch.json       Dev server config for the preview pane
├── custom-components/
│   └── README.md             Format of saved custom components; the builder writes <id>.json files here
├── server/
│   └── index.ts              Express: Vite middleware (dev)/static (prod); POST /api/pdf; GET/PUT /api/custom-components (JSON files in ./custom-components)
├── playground/
│   ├── config.ts             Demo host config: built-ins + seeded shuffle resolvers (extension-point example)
│   ├── main.tsx              Playground app: <Editor>, localStorage autosave, PDF buttons, seed input
│   └── print.tsx             Print page bootstrap: renders <PrintApp> from window.__PTB__
└── src/
    ├── index.ts              Public library API (re-exports)
    ├── vite-env.d.ts         Vite client types (css imports)
    ├── core/
    │   ├── types.ts          Template, ComponentData, Field, ComponentConfig, Config, ResolveContext
    │   ├── custom.ts         Custom component definition, schema, slugify/uniqueId, withCustomComponents()
    │   ├── overflow.ts       findOverflow(): measures rendered pages and finds the component that runs past the bottom margin
    │   ├── sanitize.ts       Allow-list sanitizer + plain-text helpers for rich text HTML
    │   ├── schema.ts         zod schema, parseTemplate(), migration hook
    │   ├── rng.ts            Seeded RNG (mulberry32) with shuffle/sample/pick
    │   ├── tree.ts           Pure tree ops: find/walk/insert/move/remove/duplicate, zones, page dimensions, spillToNextPage()
    │   ├── store.ts          Zustand vanilla editor store: selection, pages, mutations, undo/redo (immer)
    │   ├── resolve.ts        resolveTemplate(): runs async resolveData hooks per seed (non-mutating)
    │   ├── runtime.tsx       Render runtime: context, RenderComponent, PageSheet, Document, ViewZone
    │   └── core.test.ts      Vitest: RNG, store ops, schema round-trip, resolver determinism
    ├── components/
    │   ├── index.ts          defaultConfig (registry + palette categories)
    │   ├── RichText.tsx      <RichText>: per-letter formatted text; static in view/PDF, in-place editor (lazy) in the editor
    │   ├── typography.ts     Font size presets, style toggles, textStyle() and shared inspector fields
    │   ├── basic.tsx         Header, Heading, Text, Image/SVG, Spacer, Divider
    │   ├── layout.tsx        Columns, Box (slot containers)
    │   ├── table.tsx         Table (Layout): rows × cols, rich-text cells, draggable column/row borders
    │   └── questions.tsx     Mcq, TrueFalse, Match, Sequence, FillBlank, Practice (placeholder defaults + demoProps)
    ├── editor/
    │   ├── Editor.tsx        <Editor>: DndContext, hit-testing drop targets, toolbar, shortcuts
    │   ├── Canvas.tsx        Editable page view: EditorNode (select/drag/resize/snap guides) and EditorZone (drop area)
    │   ├── RichEditor.tsx    Tiptap in-place editor behind <RichText> (code-split; editor only)
    │   ├── FormatBar.tsx     Floating island (between top ruler and page) that formats the selected letters of the active text
    │   ├── Rulers.tsx        Top/side mm rulers: selection extent and snap labels drawn from the ruler
    │   ├── CustomBuilder.tsx Pop-up that makes/edits a custom component (nested editor, variant="component")
    │   ├── Modal.tsx         Portal dialog used for the confirm and builder pop-ups
    │   ├── Palette.tsx       Draggable component list (+ dummy "+ Custom" button and WIP popup)
    │   ├── Inspector.tsx     Props panel (component) or document settings panel
    │   ├── Fields.tsx        Field-type inputs (text, number, select, styleToggles, collapsible arrays, showIf, ...)
    │   └── context.tsx       Store React context + hooks
    ├── pdf/
    │   ├── PrintApp.tsx      Resolves data then renders Document; sets __PTB_READY__
    │   └── export.ts         exportPdf(): Playwright renders print.html -> PDF buffer (Node only)
    └── styles/
        ├── document.css      Page/component styles shared by editor, preview, PDF
        └── editor.css        Editor chrome styles
```
