/**
 * Minimal allow-list sanitizer for rich text HTML (no DOM needed, so it works in Node tests too).
 * Allowed: p, br, strong/b, em/i, u, s/strike, span[style]. Only font-size and font-family survive (output is greyscale, so colour is dropped).
 */
const TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span'])
/** Each allowed property and the only value shape it may take (no url(), expression(), semicolons...). */
const STYLE_PROPS: Record<string, RegExp> = {
  'font-size': /^\d+(\.\d+)?(pt|px|em|rem|%)$/,
  'font-family': /^[\w\s,'"-]+$/,
}

function cleanStyle(raw: string): string {
  return raw
    .split(';')
    .map((d) => d.split(':'))
    .filter((p) => p.length === 2)
    .map(([k, v]) => [k.trim().toLowerCase(), v.trim()] as const)
    .filter(([k, v]) => STYLE_PROPS[k]?.test(v) && !/url|expression|javascript/i.test(v))
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')
}

export function sanitizeRichHtml(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((tok) => {
      if (!tok.startsWith('<')) return tok.replace(/>/g, '&gt;')
      const m = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*)>$/.exec(tok)
      if (!m) return ''
      const [, closing, rawName, attrs] = m
      const name = rawName.toLowerCase()
      if (!TAGS.has(name)) return ''
      if (closing) return name === 'br' ? '' : `</${name}>`
      if (name === 'br') return '<br>'
      if (name === 'span') {
        const style = /style\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)
        const clean = style ? cleanStyle(style[1] ?? style[2] ?? '') : ''
        return clean ? `<span style="${clean.replace(/"/g, '&quot;')}">` : '<span>'
      }
      return `<${name}>`
    })
    .join('')
}

/** True when the value is plain text (no markup), so it can be rendered as a normal React text node. */
export const isPlainText = (v: string) => !/[<&]/.test(v)

/** Plain-text version of rich HTML (for summaries and labels). */
export function stripRichHtml(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
