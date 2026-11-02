# PDF Template Builder

A drag-and-drop template builder for printable PDFs, in the spirit of [Puck](https://github.com/puckeditor/puck) but built for pages: drag components onto A4 sheets, edit them in place, resize and align them, save the layout as JSON, and export it as a PDF.

It is meant to become a reusable library; it is not published as a package yet, so today you use it by forking the repo or copying `src/` (packaging is on the [todo list](./TODO.md)). Its first consumer is the FLN worksheet project: printable worksheets for children aged 3–12 who are working on foundational literacy and numeracy. Everything FLN-specific (levels, question bank, SVG store) stays in the host app and plugs in through the extension points below.

> New to the codebase? Read [AGENT.md](./AGENT.md) first, then [TREESTRUCTURE.md](./TREESTRUCTURE.md).

## Features

- **Drag and drop** from a palette onto multi-page canvases (A3, A4, A5, Letter, Legal, custom; portrait or landscape). Nest components inside Columns and Box.
- **Resize with guides.** Drag a side handle and that edge moves (the other stays put) while it snaps to the page's twelfth lines (1/12 … full), shown as a dotted snap grid. Drag the bottom handle to set a height that snaps to page quarters (the active guide turns red). Narrower components can sit side by side and be aligned left, centre or right.
- **Automatic page flow.** When a component runs past the bottom margin it moves, with everything after it, to the top of the next page (a page is added if needed), in the editor and in the PDF.
- **Rulers** in mm on the top and left. The selected component's extent shows on them, and snap measurements are drawn from the ruler rather than on the page.
- **Rich text on the text itself.** Click any text and style individual letters: bold, italic, underline, strikethrough, size and font. A base size and font can also be set per component. Output is greyscale, so there is no colour picker.
- **Custom components:** build your own reusable blocks (a school header, a worked-example frame) in a pop-up from the built-in components. They are saved as JSON in `custom-components/`, show up in the palette on their own, and can be edited later from a pencil icon on hover.
- **Tables:** pick rows × columns, type in cells (with the same per-letter formatting), drag column and row borders, header row, border styles.
- **Worksheet components:** multiple choice (inline or stacked, A)/a)/1./no numbering), true/false, match the following, arrange in order, fill in the blanks, practice questions, headers, headings, text, image/SVG, spacer, divider.
- **Answer keys:** every question type can render its answers.
- **Placeholders vs demo content:** components start with generic placeholders ("Question", "Option 1"). A toolbar toggle swaps in realistic sample content for previewing.
- **Undo/redo**, duplicate, zoom, JSON import/export, keyboard shortcuts (⌘Z, ⇧⌘Z, ⌘D, Delete).
- **PDF export** through headless Chromium, using the same components as the editor.
- **Seeded randomisation hook:** components can fetch or shuffle their content per seed (for example one worksheet variant per child).

## Quick start

```bash
npm install
npm run dev        # editor + PDF endpoint at http://localhost:5173
npm test           # unit tests
npm run typecheck
```

More detail in [SETUP.md](./SETUP.md). PDF export needs Chromium. Playwright's bundled browser is used if installed (`npx playwright install chromium`), otherwise it falls back to Google Chrome on the machine.

## How it works

A template is plain JSON:

```jsonc
{
  "version": 1,
  "name": "Counting worksheet",
  "page": { "size": "A4", "orientation": "portrait", "margin": 15, "gap": 4 },
  "metadata": { "levelId": "L3" },          // free-form, passed to your resolvers
  "pages": [
    {
      "id": "p1",
      "content": [
        { "id": "a1", "type": "Heading", "props": { "text": "<strong>Counting</strong>" } },
        { "id": "b2", "type": "Mcq", "span": 6, "align": "center", "height": 40, "props": { "question": "Question", "options": [] } }
      ]
    }
  ]
}
```

`span` (width in 12ths), `col` (start column 1–24, set by dragging an edge), `align` and `height` (mm) are optional layout fields on every component.

### Embed the editor

```tsx
import { Editor, defaultConfig, type Template } from './src'
import './src/styles/document.css'
import './src/styles/editor.css'

<Editor
  config={defaultConfig}
  data={savedTemplate}                 // initial template (optional)
  onChange={(t: Template) => save(t)}  // fires on every committed change
  actions={({ getTemplate }) => <button onClick={() => exportIt(getTemplate())}>Export</button>}
/>
```

### Define your own components

A config maps a type name to how it is edited and rendered. The inspector is generated from `fields`.

```tsx
import { RichText, type Config } from './src'

const config: Config = {
  components: {
    Banner: {
      label: 'Banner',
      fields: {
        text: { type: 'richtext', label: 'Text' },      // edited on the page, per-letter formatting
        border: { type: 'select', label: 'Border', options: [{ label: 'Solid', value: 'solid' }, { label: 'Dashed', value: 'dashed' }] },
        body: { type: 'slot' },                         // nested drop zone
      },
      defaultProps: { text: 'Banner', border: 'solid', body: [] },
      demoProps: { text: 'Welcome back!' },             // shown only in Demo mode
      render: ({ id, text, border, body }) => (
        <div style={{ border: `1.5px ${border} #222` }}>
          <RichText id={id} path={['text']} value={text} />
          {body}
        </div>
      ),
    },
  },
}
```

Field types: `text`, `textarea`, `number`, `boolean`, `color`, `select`, `radio`, `array` (collapsible rows, `defaultOpen`, per-item defaults), `slot`, `richtext`, `styleToggles`, `custom`. Any field can use `showIf(props)`.

### Fetch and randomise content per child

Give a component `resolveData`; it runs when you call `resolveTemplate`, never while editing, and the saved template is not modified.

```ts
const config = {
  components: {
    ...defaultConfig.components,
    Match: {
      ...defaultConfig.components.Match,
      resolveData: async (props, { rng, metadata }) => {
        const pairs = await fetchPairs(metadata.levelId)               // your database
        return { ...props, pairs, rightOrder: rng.shuffle(pairs.map((_, i) => i)) }
      },
    },
  },
}

const worksheet = await resolveTemplate(template, config, { seed: 'child-42' })
// same template + same seed => the same worksheet every time
```

### Export a PDF

Server side (Node):

```ts
import { exportPdf } from './src/pdf/export'

const pdf = await exportPdf({ baseUrl: 'http://localhost:5173', template, seed: 'child-42', answerKey: false })
```

`exportPdf` opens the app's `print.html` in headless Chromium (see `playground/print.tsx` for the page that renders `<PrintApp>` with your config), so the PDF uses the same components as the editor. The playground server exposes this as `POST /api/pdf`.

### Custom components

```tsx
<Editor
  config={defaultConfig}
  customComponents={{
    items,                                   // CustomComponentDef[] you loaded (the playground reads ./custom-components)
    onSave: async (def) => { await save(def); /* then update `items` */ },
  }}
/>
```

For PDF export, pass the same definitions to `exportPdf({ ..., customComponents })` and build the print page's config with `withCustomComponents(config, defs)` (see `playground/print.tsx`). The file format is described in [custom-components/README.md](./custom-components/README.md).

### Security: dev server only

The included Express server (`server/index.ts`) is a development playground. It has **no authentication**: `POST /api/pdf` launches a headless browser, and `PUT /api/custom-components/:id` writes files to disk. Do not expose it to the internet or an untrusted network. A production host should run its own authenticated endpoints and call `exportPdf` itself.

## Project layout

See [TREESTRUCTURE.md](./TREESTRUCTURE.md) for every file. In short: `src/core` (types, schema, store, resolver, render runtime), `src/components` (built-in components), `src/editor` (editor UI), `src/pdf` (print page and exporter), `playground` (demo host) and `server` (dev server with the PDF endpoint).

## Status and limits

Early (v0.1), first release. Known limits: not yet packaged as a library, no CI or end-to-end tests, no outline panel or keyboard reordering, images and SVGs are URL or markup only (no upload), Latin fonts only, content is pushed to the next page but never pulled back, and components taller than a page are not split. Fill-in-the-blank sentences and answer keys stay plain text (blanks are marked with `___`). The full list is in [TODO.md](./TODO.md).

## Docs

- [AGENT.md](./AGENT.md) — project vision, rules and architecture (start here)
- [SRS.md](./SRS.md) — requirements
- [CHANGELOG.md](./CHANGELOG.md) — what changed
- [TODO.md](./TODO.md) — open work and what is done
- [SETUP.md](./SETUP.md) — install and run
- [TREESTRUCTURE.md](./TREESTRUCTURE.md) — file map

## License

[MIT](./LICENSE)
