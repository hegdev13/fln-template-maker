# Software Requirements Specification — PDF Template Builder

## 1. Purpose
A reusable, Puck-style drag-and-drop builder for printable PDF templates. Hosts embed the editor, define components, store templates as JSON, and render/export PDFs (optionally with dynamic, seeded content). First intended consumer: FLN worksheet generation (levels, question/SVG DB, per-child randomisation) — implemented by the host, not this project.

## 2. Scope
In: editor UI, component framework, built-in components, template schema, resolver pipeline, PDF export, playground.
Out: FLN data/DB/APIs, auth, multi-user collaboration, template storage backend, non-Latin font bundles (v0.1).

## 3. Users
- **Template author** (teacher/designer): composes pages by drag-and-drop, edits properties, saves/loads JSON, previews, exports.
- **Host developer**: supplies a `Config` of components, resolvers, and storage; embeds `<Editor>`; calls `exportPdf`/`PrintApp`.

## 4. Functional requirements
- FR1 Drag components from a palette onto pages; reorder and move between pages' zones and nested slots.
- FR2 Multiple pages; add, duplicate, reorder, delete.
- FR3 Page settings: size (A3/A4/A5/Letter/Legal/Custom), orientation, margin, block gap.
- FR4 Property editing generated from component `fields` (text, textarea, number, boolean, color, select, radio, array, slot, custom).
- FR5 Select, duplicate, delete; undo/redo; zoom; keyboard shortcuts.
- FR6 Templates serialise to versioned JSON, validated on import; migration hook.
- FR7 Components may declare async `resolveData(props, ctx)`; `resolveTemplate(template, config, {seed})` returns a resolved copy; same seed ⇒ same output; resolved data is never saved into the template.
- FR8 Template `metadata` bag is passed to resolvers.
- FR9 PDF export via headless Chromium with exact page size, backgrounds, no extra blank pages; blocks may opt out of splitting (`ptb-avoid-break`).
- FR10 Answer-key rendering mode.
- FR11 Built-in components: header, heading, text, image/SVG (URL or inline), spacer, divider, columns, box, MCQ, true/false, match the following, arrange in order, fill in the blanks, practice questions.
- FR13 Components have a width of 1/12 … full of their zone (superseded in detail by FR25), set by dragging side handles (snapping) or from the inspector; narrower components share rows.
- FR14 Narrower components can be aligned left/centre/right within their row; components can be given a minimum height by dragging a bottom handle.
- FR15 While resizing width, a dotted translucent snap grid shows the available widths.
- FR16 While resizing height, quarter lines of the page body are shown; the bottom edge snaps to them and the active line turns red.
- FR17 Rulers (mm) on both axes show the selected component's extent; resize measurements and snap labels are drawn on the rulers.
- FR18 Components may define `demoProps`; a Demo toggle swaps placeholder content for sample content in the editor only.
- FR19 Shared text styling: size presets + custom size, bold/italic/underline/strike, font family (no colour: output is greyscale).
- FR20 MCQ/True-False support inline or stacked options; MCQ numbering supports A)/a)/1./none.
- FR21 Images can be aligned vertically (top/middle/bottom) within a taller box.
- FR22 Text can be formatted per letter (bold, italic, underline, strikethrough, size, font) by editing it in place on the page; formatting is saved as sanitized HTML and rendered identically in the editor, preview and PDF.
- FR25 The dragged edge snaps to any twelfth line (1/12 … full) of the zone's grid — the page content area for top-level components — rather than to distances measured from the component.
- FR23 Dragging a side handle moves that edge while the opposite edge stays fixed (stored as an explicit start column `col`); the width still snaps to the allowed fractions and is limited to the room available.
- FR24 Table component (Layout): choose rows × columns, edit cells with rich text, resize columns and rows by dragging borders, header row, border style.
- FR12 Hosts can add/replace components and categories, and supply custom field renderers.

## 5. Non-functional requirements
- NFR1 One render path: editor, preview, and PDF use the same component `render`.
- NFR2 Deterministic output per (template, seed).
- NFR3 Typed public API (TypeScript strict); core logic unit-tested.
- NFR4 Print output uses physical units (mm/pt) so it is resolution independent.
- NFR5 Editor remains responsive with ~100 blocks.
- NFR7 Rich text HTML from templates is sanitized with an allow-list before rendering (no scripts, links, images, or arbitrary CSS).
- NFR6 No server needed for editing; server needed only for PDF export (Node + Chromium).

## 6. Constraints / assumptions
React 18+, modern Chromium for rendering. Chrome/Chromium must be available to Playwright. Inline SVG content is trusted host data (rendered with innerHTML) — hosts must sanitise untrusted SVG.

## 7. Extension requirements
Per-component resolvers, custom fields, metadata, host-provided component sets, seed-driven randomisation, host-controlled storage (`onChange`, `data`).

## 8. Known gaps (see STEPS.md)
No overflow warning when a page's content exceeds its height; no outline panel; no upload/asset fields; Latin fonts only; no e2e tests yet.
