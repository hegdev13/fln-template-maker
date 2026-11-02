import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../components'
import { resolveTemplate } from './resolve'
import { createRng } from './rng'
import { parseTemplate } from './schema'
import { createEditorStore } from './store'
import { createEmptyTemplate } from './tree'

const cfg = { ...defaultConfig, components: { ...defaultConfig.components, Sequence: { ...defaultConfig.components.Sequence, resolveData: (p: any, { rng }: any) => ({ ...p, displayOrder: rng.shuffle(p.items.map((_: any, i: number) => i)) }) } } }

describe('rng', () => {
  it('is deterministic per seed', () => {
    expect(createRng('a').shuffle([1, 2, 3, 4, 5, 6])).toEqual(createRng('a').shuffle([1, 2, 3, 4, 5, 6]))
  })
})

describe('store', () => {
  it('adds, nests, moves, undoes', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    const cols = s.getState().addComponent('Columns')!
    const h = s.getState().addComponent('Heading')!
    s.getState().moveComponent(h, { parentId: cols, slot: 'col1' }, 0)
    const t = s.getState().template
    expect(t.pages[0].content).toHaveLength(1)
    expect(t.pages[0].content[0].props.col1[0].id).toBe(h)
    s.getState().undo()
    expect(s.getState().template.pages[0].content).toHaveLength(2)
  })
  it('refuses to drop a node into itself', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    const cols = s.getState().addComponent('Columns')!
    s.getState().moveComponent(cols, { parentId: cols, slot: 'col1' }, 0)
    expect(s.getState().template.pages[0].content[0].id).toBe(cols)
  })
  it('round-trips through the schema', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    s.getState().addComponent('Mcq')
    expect(parseTemplate(JSON.parse(JSON.stringify(s.getState().template)))).toEqual(s.getState().template)
  })
})

describe('resolveTemplate', () => {
  it('is deterministic per seed, does not mutate input, varies across seeds', async () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    s.getState().addComponent('Sequence')
    s.getState().updateProps(s.getState().template.pages[0].content[0].id, { items: Array.from({ length: 8 }, (_, i) => ({ text: `e${i}` })) })
    const t = s.getState().template
    const a = await resolveTemplate(t, cfg, { seed: 'x' })
    const b = await resolveTemplate(t, cfg, { seed: 'x' })
    const c = await resolveTemplate(t, cfg, { seed: 'y' })
    expect(a).toEqual(b)
    expect(a.pages[0].content[0].props.displayOrder).not.toEqual(c.pages[0].content[0].props.displayOrder)
    expect(t.pages[0].content[0].props.displayOrder).toEqual([])
  })
})

describe('duplicate & resize', () => {
  it('duplicates immediately below, with fresh ids, keeping width and nested content', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    const cols = s.getState().addComponent('Columns')!
    const h = s.getState().addComponent('Heading')!
    s.getState().moveComponent(h, { parentId: cols, slot: 'col1' }, 0)
    s.getState().addComponent('Text')
    s.getState().setSpan(cols, 6)
    s.getState().duplicateComponent(cols)
    const c = s.getState().template.pages[0].content
    expect(c.map((n) => n.type)).toEqual(['Columns', 'Columns', 'Text'])
    expect(c[1].id).not.toBe(c[0].id)
    expect(c[1].span).toBe(6)
    expect(c[1].props.col1[0].id).not.toBe(h)
    expect(s.getState().selectedId).toBe(c[1].id)
  })
  it('snaps ratios to allowed spans', async () => {
    const { nearestSpan } = await import('./tree')
    expect([0.2, 0.34, 0.5, 0.6, 0.7, 0.8, 0.95, 1].map((r) => nearestSpan(r))).toEqual([2, 4, 6, 7, 8, 10, 11, 12])
  })
})

describe('alignment & height', () => {
  it('maps span/align to whole 24-col grid placements', async () => {
    const { cellProps } = await import('./runtime')
    const n = (span: number, align?: any, height?: number) => ({ id: 'x', type: 'Text', props: {}, span, align, height })
    expect(cellProps(n(12)).style).toBeUndefined()
    expect(cellProps(n(6)).style).toEqual({ gridColumn: 'span 12' })
    expect(cellProps(n(6, 'center')).style).toEqual({ gridColumn: '7 / span 12' })
    expect(cellProps(n(6, 'right')).style).toEqual({ gridColumn: '13 / span 12' })
    expect(cellProps(n(3, 'center')).style).toEqual({ gridColumn: '10 / span 6' })
    expect(cellProps(n(9, 'right')).style).toEqual({ gridColumn: '7 / span 18' })
    expect(cellProps(n(12, undefined, 40))).toEqual({ style: { minHeight: '40mm' }, 'data-sized': '' })
  })
  it('sets, clears, duplicates align and height', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    const id = s.getState().addComponent('Text')!
    s.getState().setSpan(id, 6)
    s.getState().setAlign(id, 'center')
    s.getState().setHeight(id, 40.3)
    s.getState().duplicateComponent(id)
    const [a, b] = s.getState().template.pages[0].content
    expect(a).toMatchObject({ span: 6, align: 'center', height: 40.5 })
    expect(b).toMatchObject({ span: 6, align: 'center', height: 40.5 })
    s.getState().setAlign(id, 'left')
    s.getState().setHeight(id, undefined)
    const t = s.getState().template.pages[0].content[0]
    expect(t.align).toBeUndefined()
    expect(t.height).toBeUndefined()
    expect(parseTemplate(JSON.parse(JSON.stringify(s.getState().template)))).toEqual(s.getState().template)
  })
})

describe('typography & placeholders', () => {
  it('maps presets, custom sizes, legacy numbers and style toggles to CSS', async () => {
    const { textStyle } = await import('../components/typography')
    expect(textStyle({ size: 'h1' }).fontSize).toBe('24pt')
    expect(textStyle({ size: 'small' }).fontSize).toBe('10pt')
    expect(textStyle({ size: 'custom', customSize: 31 }).fontSize).toBe('31pt')
    expect(textStyle({ size: 18 }).fontSize).toBe('18pt') // legacy numeric size
    expect(textStyle({}).fontSize).toBe('12pt')
    const s = textStyle({ styles: ['bold', 'italic', 'underline', 'strike'] })
    expect(s).toMatchObject({ fontWeight: 700, fontStyle: 'italic', textDecoration: 'underline line-through' })
  })
  it('builder defaults are generic placeholders; sample content is demo-only', () => {
    const { Mcq, TrueFalse } = defaultConfig.components
    expect(Mcq.defaultProps.question).toBe('Question')
    expect(Mcq.defaultProps.options.map((o: any) => o.text)).toEqual(['Option 1', 'Option 2', 'Option 3', 'Option 4'])
    expect(Mcq.defaultProps.numbering).toBe('A')
    expect(Mcq.demoProps?.question).toBeTruthy()
    expect(TrueFalse.defaultProps.statements[0].text).toBe('Statement 1')
    const field: any = Mcq.fields.options
    expect(field.defaultItemProps(4).text).toBe('Option 5')
    expect(field.defaultOpen).toBe(1)
  })
})

describe('rich text sanitizer', () => {
  it('keeps formatting Tiptap produces', async () => {
    const { sanitizeRichHtml } = await import('./sanitize')
    const html = '<p>Hi <span style="font-size: 24pt; font-family: Georgia;"><strong><em><u>says</u></em></strong></span> <s>moo</s></p>'
    expect(sanitizeRichHtml(html)).toBe('<p>Hi <span style="font-size: 24pt; font-family: Georgia">' + '<strong><em><u>says</u></em></strong></span> <s>moo</s></p>')
    // greyscale output: colour (from older templates) is dropped
    expect(sanitizeRichHtml('<span style="color: rgb(214, 51, 108); font-size: 9pt">c</span>')).toBe('<span style="font-size: 9pt">c</span>')
    expect(sanitizeRichHtml('<span style="font-family: Georgia, \'Times New Roman\', serif">x</span>')).toContain("font-family: Georgia")
  })
  it('strips scripts, handlers, links, images and dangerous styles', async () => {
    const { sanitizeRichHtml, stripRichHtml, isPlainText } = await import('./sanitize')
    const bad = '<img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:x">l</a><span onclick="x" style="color: red; background: url(http://e/x); font-size: 9pt; position: fixed">t</span>'
    const out = sanitizeRichHtml(bad)
    expect(out).not.toMatch(/img|script|onerror|onclick|href|url\(|position|<a/i)
    expect(out).toContain('<span style="font-size: 9pt">t</span>')
    expect(stripRichHtml('<p>a <strong>b</strong></p><p>c &amp; d</p>')).toBe('a b c & d')
    expect(isPlainText('plain')).toBe(true)
    expect(isPlainText('<p>x</p>')).toBe(false)
  })
})

describe('free edge resizing & table', () => {
  it('nearestSpan respects the room available', async () => {
    const { nearestSpan } = await import('./tree')
    expect(nearestSpan(0.9, 6)).toBe(6) // only half the row is free
    expect(nearestSpan(0.5, 0)).toBeUndefined()
  })
  it('setLayout keeps the dragged edge: explicit column replaces align, col 1 returns to flow', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    const id = s.getState().addComponent('Text')!
    s.getState().setAlign(id, 'center')
    s.getState().setLayout(id, 6, 13) // right half, e.g. after dragging the left handle
    let n = s.getState().template.pages[0].content[0]
    expect(n).toMatchObject({ span: 6, col: 13 })
    expect(n.align).toBeUndefined()
    s.getState().setLayout(id, 3, 22) // clamped inside the 24-column grid (25 - 2*3 = 19)
    n = s.getState().template.pages[0].content[0]
    expect(n.col).toBe(19)
    s.getState().setLayout(id, 4, 1)
    expect(s.getState().template.pages[0].content[0].col).toBeUndefined()
    s.getState().setAlign(id, 'right')
    expect(s.getState().template.pages[0].content[0].col).toBeUndefined()
  })
  it('places a component by explicit column in the grid', async () => {
    const { cellProps } = await import('./runtime')
    const n = { id: 'x', type: 'Text', props: {}, span: 6, col: 13 }
    expect(cellProps(n).style).toEqual({ gridColumn: '13 / span 12' })
  })
  it('creates missing containers when writing a nested prop (table cells)', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    const id = s.getState().addComponent('Table')!
    s.getState().setPropAt(id, ['cells', 1, 2], 'x')
    const cells = s.getState().template.pages[0].content[0].props.cells
    expect(cells[1][2]).toBe('x')
    expect(defaultConfig.categories?.layout.components).toContain('Table')
  })
})

describe('twelfth snapping', () => {
  it('labels every twelfth', async () => {
    const { spanLabel, SPANS } = await import('./tree')
    expect(SPANS).toHaveLength(12)
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(spanLabel)).toEqual(['1/12', '1/6', '1/4', '1/3', '5/12', '1/2', '7/12', '2/3', '3/4', '5/6', '11/12', 'Full'])
  })
  it('snaps a dragged edge to the nearest column line, keeping the other edge fixed', async () => {
    const { snapEdgeSpan } = await import('./tree')
    // full-width block (cols 1-24). Dragging the right edge to line 15 -> 7/12 wide (14 columns -> line 14)
    expect(snapEdgeSpan('right', 1, 24, 14.8)).toBe(7)
    // dragging the left edge of cols 1-24 to line 5 -> 10/12 (the 20 columns 5..24 -> line 4)
    expect(snapEdgeSpan('left', 1, 24, 4.6)).toBe(10)
    // right half block (cols 13-24): left edge can't go past the page start (room = 24 columns)
    expect(snapEdgeSpan('left', 13, 24, -5)).toBe(12)
    // block starting at col 13: only half the row is free to the right
    expect(snapEdgeSpan('right', 13, 24, 30)).toBe(6)
    expect(snapEdgeSpan('right', 24, 24, 24)).toBeUndefined()
  })
})

describe('page overflow', () => {
  it('moves a component and the ones after it to the top of the next page', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    const ids = ['Heading', 'Text', 'Divider', 'Spacer'].map((t) => s.getState().addComponent(t)!)
    const before = s.getState().template
    s.getState().spillOver(before.pages[0].id, ids[2])
    const after = s.getState().template
    expect(after.pages).toHaveLength(2)
    expect(after.pages[0].content.map((n) => n.id)).toEqual(ids.slice(0, 2))
    expect(after.pages[1].content.map((n) => n.id)).toEqual(ids.slice(2))
    expect(before.pages[0].content).toHaveLength(4) // input untouched
    // overflow into an existing page goes in front of its content
    s.getState().spillOver(after.pages[0].id, ids[1])
    expect(s.getState().template.pages[1].content.map((n) => n.id)).toEqual([ids[1], ids[2], ids[3]])
  })

  it('never moves the first component of a page', () => {
    const s = createEditorStore(cfg, createEmptyTemplate())
    const id = s.getState().addComponent('Heading')!
    s.getState().spillOver(s.getState().template.pages[0].id, id)
    expect(s.getState().template.pages).toHaveLength(1)
  })
})
