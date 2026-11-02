import { z } from 'zod'
import type { ComponentData, PageSettings, Template } from './types'

export const componentSchema: z.ZodType<ComponentData> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.string(), z.any()),
    span: z.number().int().min(1).max(12).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    col: z.number().int().min(1).max(24).optional(),
    height: z.number().positive().optional(),
  }),
)

export const pageSettingsSchema: z.ZodType<PageSettings> = z.object({
  size: z.enum(['A3', 'A4', 'A5', 'Letter', 'Legal', 'Custom']),
  orientation: z.enum(['portrait', 'landscape']),
  customWidth: z.number().positive().optional(),
  customHeight: z.number().positive().optional(),
  margin: z.number().min(0),
  gap: z.number().min(0),
})

export const templateSchema: z.ZodType<Template> = z.object({
  version: z.literal(1),
  name: z.string(),
  page: pageSettingsSchema,
  metadata: z.record(z.string(), z.any()),
  pages: z.array(z.object({ id: z.string(), content: z.array(componentSchema) })).min(1),
})

/** Validates (and, in future, migrates) arbitrary JSON into a Template. Throws on invalid input. */
export function parseTemplate(input: unknown): Template {
  return templateSchema.parse(migrate(input))
}

/** Hook for version upgrades. v1 is current, so this is the identity for now. */
function migrate(input: unknown): unknown {
  return input
}
