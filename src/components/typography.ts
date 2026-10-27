import type { CSSProperties } from 'react'
import type { Field } from '../core/types'

/** Font size presets in pt. */
export const SIZE_PRESETS = { h1: 24, h2: 18, h3: 14, normal: 12, small: 10 } as const
export type SizePreset = keyof typeof SIZE_PRESETS | 'custom'

export const FONT_STACKS = {
  sans: "'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
} as const

export interface TypographyProps {
  /** A preset name, or (legacy) a number of pt. */
  size: SizePreset | number
  customSize: number
  /** Any of 'bold' | 'italic' | 'underline' | 'strike'. */
  styles: string[]
  font: keyof typeof FONT_STACKS
}

export const typographyDefaults = (size: SizePreset = 'normal', styles: string[] = []): TypographyProps => ({
  size,
  customSize: 14,
  styles,
  font: 'sans',
})

/**
 * Inspector fields for a component's BASE text look (default size / font). Bold, italic,
 * underline, strikethrough and per-letter size / font are applied to the text itself via
 * the format bar (see RichText); `styles` is still honoured for older templates.
 */
export const typographyFields: Record<string, Field> = {
  size: {
    type: 'select',
    label: 'Base font size',
    options: [
      { label: 'Heading 1 (24pt)', value: 'h1' },
      { label: 'Heading 2 (18pt)', value: 'h2' },
      { label: 'Heading 3 (14pt)', value: 'h3' },
      { label: 'Normal (12pt)', value: 'normal' },
      { label: 'Small (10pt)', value: 'small' },
      { label: 'Custom…', value: 'custom' },
    ],
  },
  customSize: { type: 'number', label: 'Custom size (pt)', min: 6, max: 96, showIf: (p) => p.size === 'custom' },
  font: {
    type: 'select',
    label: 'Base font',
    options: [
      { label: 'Sans-serif', value: 'sans' },
      { label: 'Serif', value: 'serif' },
      { label: 'Monospace', value: 'mono' },
    ],
  },
}

/** CSS for a component's text styling. Tolerates missing props (older templates). */
export function textStyle(p: Partial<TypographyProps> & Record<string, any>): CSSProperties {
  const size = p.size ?? 'normal'
  const pt = typeof size === 'number' ? size : size === 'custom' ? (p.customSize ?? 14) : (SIZE_PRESETS[size] ?? 12)
  const styles: string[] = p.styles ?? []
  const decorations = [styles.includes('underline') && 'underline', styles.includes('strike') && 'line-through'].filter(Boolean)
  return {
    fontSize: `${pt}pt`,
    fontFamily: FONT_STACKS[p.font ?? 'sans'],
    fontWeight: styles.includes('bold') ? 700 : undefined,
    fontStyle: styles.includes('italic') ? 'italic' : undefined,
    textDecoration: decorations.length ? decorations.join(' ') : undefined,
  }
}
