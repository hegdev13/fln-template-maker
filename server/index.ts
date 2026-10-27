import express from 'express'
import { createServer as createVite } from 'vite'
import { resolve } from 'node:path'
import { exportPdf } from '../src/pdf/export'
import { parseTemplate } from '../src/core/schema'

const port = Number(process.env.PORT ?? 5173)
const app = express()
app.use(express.json({ limit: '20mb' }))

app.post('/api/pdf', async (req, res) => {
  try {
    const template = parseTemplate(req.body.template)
    const pdf = await exportPdf({
      baseUrl: `http://localhost:${port}`,
      template,
      seed: req.body.seed,
      answerKey: !!req.body.answerKey,
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
