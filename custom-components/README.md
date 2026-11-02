# custom-components

Saved custom components, one JSON file per component (`<id>.json`). The builder (palette → **+ Custom**) writes them here through the dev server; commit them with the project.

Each file is a `CustomComponentDef` (see `src/core/custom.ts`):

```jsonc
{
  "version": 1,
  "id": "school-header",              // slug = file name; the component's type is "custom:school-header"
  "name": "School header",            // shown in the palette
  "createdAt": "2026-10-31T17:46:20.649Z",
  "updatedAt": "2026-10-31T17:46:41.489Z",
  "content": [                        // the saved blocks (built-in component types only)
    { "id": "z8189g8i", "type": "Header", "props": { "title": "My School" } },
    { "id": "wba9hjve", "type": "Divider", "span": 6, "props": {} }
  ]
}
```

- Placing a custom component drops a copy of `content` (with fresh ids) into the page, so each use is editable in place.
- Editing a definition changes what is added from then on; copies already placed keep their own content.
- Files that fail validation are skipped (a warning is logged by the server).
