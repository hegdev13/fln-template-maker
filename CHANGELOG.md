# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/).
Newest first. Add every user-visible or API-visible change under `[Unreleased]` as you make it.

## [Unreleased]

### Added
- Width now snaps to any twelfth of the zone (1/12 … full) instead of only 1/4, 1/3, 1/2, 2/3, 3/4, full. The snap lines are fixed lines of the page's 12-column grid (measured from the page margins for top-level components), not distances from the component itself; the dragged edge lands on the nearest line and the ruler labels the active width (and 1/4, 1/3, 1/2, 2/3, 3/4). The inspector's Width dropdown lists all twelfths.
- "+ Custom" button at the end of the palette's Questions group. It is a placeholder: it opens a "Work in progress" popup. Needs discussion (see STEPS.md).
- Table component (Layout): choose rows × columns, type in cells with the same per-letter formatting, drag column borders (neighbouring columns trade width) and row borders (minimum heights), optional shaded header row, borders (all / outside / none), text align, cell padding. Resizes like any component (width snaps, bottom handle sets height and rows share it).
- Per-letter text formatting: click any text on the page and style individual letters (bold, italic, underline, strikethrough, size, colour, font) from a new Text format bar under the toolbar. Backed by Tiptap; stored as sanitized HTML in the component's props and rendered the same way in the editor, preview and PDF. Used by Heading, Text, MCQ question/options, True/False statements, Match items, Sequence captions, and instructions/titles/questions in Fill-in-the-blank and Practice. New `richtext` field type, `<RichText>` component and `sanitizeRichHtml()`.
- README.md with overview, quick start and embedding / resolver / PDF examples.
- Git repository initialised.
- Rulers (mm) on the top and left of the canvas, aligned to the active page. The selected component's extent and size show as a band on both rulers; width snap labels (1/4…3/4) and height quarter labels (1/4, 1/2, 3/4) are drawn on the rulers instead of on the page. The active snap is red.
- Image: vertical alignment (top / middle / bottom) inside a taller box, in addition to horizontal alignment.
- Demo content toggle in the toolbar: shows each component's `demoProps` sample content; builder defaults are now generic placeholders ("Question", "Option 1", "Statement 1", "Left 1"…). New optional `ComponentConfig.demoProps`.
- Typography: font size presets (H1 24pt, H2 18pt, H3 14pt, Normal 12pt, Small 10pt, Custom), bold / italic / underline / strikethrough toggles, text colour and font family on Heading, Text and all question components (`src/components/typography.ts`).
- MCQ and True/False: Inline / Stacked option layout. MCQ numbering: new "None (circles only)".
- Inspector arrays: only the first row starts expanded (`defaultOpen`), new rows open, summaries are numbered ("2. Option 2"), and new items get numbered text via function-valued `defaultItemProps`. New field features: `showIf`, `styleToggles`.
- AGENT.md: hand-off doc with project vision, FLN flow, architecture, decisions and working rules (read TREESTRUCTURE.md before grepping).
- Vertical snap guides: while resizing height, dotted lines divide the page body into quarters (1/4, 1/2, 3/4); the bottom edge locks onto a line when within 8px and that line turns red (smart-guide feel). Hold Alt to resize freely.
- Snap grid overlay while resizing width: a translucent dotted 12-column grid over the parent zone with labelled snap lines (1/4, 1/3, 1/2, 2/3, 3/4), current snap highlighted.
- Alignment of narrower components within their row (left / center / right) via the selection bar and inspector; optional `align` on `ComponentData`.
- Vertical resize: drag the bottom handle to set a minimum height in mm (double-click the handle or use "Auto" in the inspector to reset); optional `height` on `ComponentData`. The component stretches to fill the height in editor, preview and PDF.
- Width resizing: drag the left/right handles of a selected component; width snaps to 1/4, 1/3, 1/2, 2/3, 3/4 or full of its zone. Also settable from the inspector ("Width"). Stored as optional `span` (12ths) on `ComponentData`; components with partial width flow side by side.
- Selected-component bar shows the current width and stays a constant on-screen size at any canvas zoom.
- Drop-position hit-testing is row-aware for side-by-side components.

### Changed
- The Text format bar now appears only when text is relevant: while text is being edited, or when the selected component has formatable text (Heading, Text, Table, and the question components). It is hidden for images, spacers, dividers, columns, boxes and when nothing is selected. New optional `ComponentConfig.hasRichText` (defaults to true when a field is `richtext`).
- Resizing: dragging a side handle now moves that edge and keeps the opposite edge fixed, regardless of alignment (previously the left side stayed put and the width changed from the right). The result is stored as `col` (start column) with `span`; the Align buttons clear it. Width is limited to the room available, and the snap guides/ruler labels are measured from the fixed edge. Optional `col` added to `ComponentData`.
- Component-level text settings are now a *base* (size / colour / font) in the inspector; bold, italic, underline and strikethrough moved onto the text itself. Heading is bold through its default text (`<strong>`), so letters can be un-bolded. Text, question, option and similar text fields are edited on the page; the inspector shows a read-only hint.
- MCQ defaults to 4 options; all question components default to placeholder text instead of demo questions.
- Heading "level" and Text "size/bold" are replaced by the shared typography props (older saved templates still render).
- Removed the seed input from the playground toolbar; previews and exports use a fixed seed until a host generates real worksheets.
- Zones (page body and slots) are now 24-column CSS grids instead of flex columns (widths are still stored in 12ths, so centre/right alignment lands on whole columns); view/PDF output wraps each component in a `.ptb-cell` element.
- Selected-component bar (name / duplicate / delete) is larger.

### Removed
- Colour from text styling: the colour picker, "Base text colour" and the Color extension are gone (output is greyscale). The sanitizer now drops `color` / `background-color`.

### Fixed
- Duplicate did nothing (structuredClone threw on an immer draft); duplicates now appear immediately below the original, keep their width and nested content, and get selected.
- Text selection (blue haze) lingering after drag-and-drop: selection is disabled on the canvas/palette and cleared during and after drags.

## [0.1.0] - 2026-10-27

### Added
- Template model: versioned JSON (`Template`, pages, nested `ComponentData`) with zod validation and a migration hook (`src/core/schema.ts`).
- Config-driven component registry (`Config` / `ComponentConfig`: fields, defaultProps, render, optional async `resolveData`).
- Seeded RNG and `resolveTemplate()` so hosts can fetch/randomise content deterministically per seed without mutating the saved template.
- Drag-and-drop editor (`<Editor>`): palette, multi-page A4/A3/A5/Letter/Legal/Custom canvas, nested slots, reorder/move, duplicate, delete, inspector generated from `fields`, undo/redo, zoom, JSON import/export, keyboard shortcuts.
- Built-in components: Page header, Heading, Text, Image/SVG, Spacer, Divider, Columns, Box, Multiple choice, True/False, Match the following, Arrange in order, Fill in the blanks, Practice questions (all with answer-key rendering).
- PDF export: print route (`print.html`, `PrintApp`) + Playwright `exportPdf()`; Express endpoint `POST /api/pdf` in the playground; answer-key mode.
- Playground app demonstrating host integration with seeded shuffling resolvers.
- Project docs: SRS.md, TREESTRUCTURE.md, STEPS.md, CLAUDE.md.
