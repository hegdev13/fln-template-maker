import { pageDimensions } from './tree'
import type { PageSettings } from './types'

/**
 * Finds the first page whose content runs past its bottom margin and returns the top-level component
 * that crosses it. Measures the rendered DOM (editor canvas or print page), so it works for any
 * component height. Components that are first on their page are skipped: moving them would not help.
 */
export function findOverflow(root: ParentNode, page: PageSettings): { pageId: string; nodeId: string } | null {
  const { width } = pageDimensions(page)
  for (const sheet of Array.from(root.querySelectorAll<HTMLElement>('.ptb-sheet[data-page-id]'))) {
    const sr = sheet.getBoundingClientRect()
    if (!sr.width) continue
    const limit = sr.bottom - page.margin * (sr.width / width) + 1.5 // 1.5px tolerance for rounding
    const cells = Array.from(sheet.querySelectorAll<HTMLElement>(':scope > .ptb-sheet-body > .ptb-page-flow > [data-node-id]'))
    for (let i = 1; i < cells.length; i++) {
      if (cells[i].getBoundingClientRect().bottom > limit) return { pageId: sheet.dataset.pageId!, nodeId: cells[i].dataset.nodeId! }
    }
  }
  return null
}
