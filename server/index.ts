import express from 'express'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer as createVite } from 'vite'
import { CUSTOM_ID_RE, customComponentSchema, type CustomComponentDef } from '../src/core/custom'
import { parseTemplate } from '../src/core/schema'
import { exportPdf } from '../src/pdf/export'

const port = Number(process.env.PORT ?? 5173)
/** Where saved custom components live: one `<id>.json` per component, committed with the project. */
const CUSTOM_DIR = resolve('custom-components')

async function readCustomComponents(): Promise<CustomComponentDef[]> {
  let files: string[] = []
  try {
    files = (await readdir(CUSTOM_DIR)).filter((f) => f.endsWith('.json'))
  } catch {} // no folder yet = no custom components
  const defs: CustomComponentDef[] = []
  for (const file of files) {
    try {
      defs.push(customComponentSchema.parse(JSON.parse(await readFile(resolve(CUSTOM_DIR, file), 'utf8'))))
    } catch (err) {
      console.warn(`Skipping invalid custom component ${file}: ${(err as Error).message}`)
    }
  }
  return defs.sort((a, b) => a.name.localeCompare(b.name))
}

const app = express()
app.use(express.json({ limit: '20mb' }))

app.get('/api/custom-components', async (_req, res) => {
  res.json(await readCustomComponents())
})

app.put('/api/custom-components/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!CUSTOM_ID_RE.test(id)) return void res.status(400).send('Invalid component id')
    const def = customComponentSchema.parse({ ...req.body, id })
    await mkdir(CUSTOM_DIR, { recursive: true })
    await writeFile(resolve(CUSTOM_DIR, `${id}.json`), JSON.stringify(def, null, 2) + '\n')
    res.json(def)
  } catch (e) {
    res.status(400).send((e as Error).message)
  }
})

app.post('/api/pdf', async (req, res) => {
  try {
    const template = parseTemplate(req.body.template)
    const pdf = await exportPdf({
      baseUrl: `http://localhost:${port}`,
      template,
      seed: req.body.seed,
      answerKey: !!req.body.answerKey,
      customComponents: await readCustomComponents(), // the print page needs them to render placed copies
    })
    res.type('application/pdf').send(pdf)
  } catch (e) {
    console.error(e)
    res.status(500).send((e as Error).message)
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist')))
} else {
  const vite = await createVite({ server: { middlewareMode: true }, appType: 'mpa' })
  app.use(vite.middlewares)
}

app.listen(port, () => console.log(`PDF template builder: http://localhost:${port}`))
