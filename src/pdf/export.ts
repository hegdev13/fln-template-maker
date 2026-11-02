/**
 * Server-side PDF export (Node only). Renders the app's /print route in headless Chromium
 * and returns a PDF buffer. Template + seed are passed to the page via window.__PTB__.
 */
import type { CustomComponentDef } from '../core/custom'
import type { Template } from '../core/types'
import { pageDimensions } from '../core/tree'

export interface ExportPdfOptions {
  /** Base URL of a server that serves print.html (e.g. http://localhost:5173). */
  baseUrl: string
  template: Template
  seed?: string | number
  /** Forces showAnswers=true on every component that supports it (answer key). */
  answerKey?: boolean
  /** Saved custom components, so the print page can render placed copies of them. */
  customComponents?: CustomComponentDef[]
  /** Path to a Chrome/Chromium executable; defaults to Playwright's bundled browser, then system Chrome. */
  executablePath?: string
}

export async function exportPdf(opts: ExportPdfOptions): Promise<Buffer> {
  const { chromium } = await import('playwright')
  const launch = async () => {
    if (opts.executablePath) return chromium.launch({ executablePath: opts.executablePath })
    try {
      return await chromium.launch()
    } catch {
      return chromium.launch({ channel: 'chrome' })
    }
  }
  const browser = await launch()
  try {
    const page = await browser.newPage()
    await page.addInitScript(
      (payload) => {
        ;(window as any).__PTB__ = payload
      },
      { template: opts.template, seed: opts.seed ?? 'default', answerKey: !!opts.answerKey, customComponents: opts.customComponents ?? [] },
    )
    await page.goto(`${opts.baseUrl.replace(/\/$/, '')}/print.html`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => (window as any).__PTB_READY__ === true, undefined, { timeout: 30000 })
    await page.evaluate(() => document.fonts.ready)
    const { width, height } = pageDimensions(opts.template.page)
    return await page.pdf({
      width: `${width}mm`,
      height: `${height}mm`,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
  } finally {
    await browser.close()
  }
}
