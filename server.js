// MCS website as a long-running server (the Oracle "web" server, see oracle-servers/web).
// It does what Vercel did for this repo:
//   - serves the pages with clean URLs (/about -> about.html; /about.html redirects to /about)
//   - runs the Vercel-style handlers in api/ (api/admin/blog.js answers /api/admin/blog)
//   - parses JSON bodies, except for handlers that set config.api.bodyParser = false (uploads)
// and adds what Vercel couldn't: login and form attempt limits that hold on one long-running server.
// Only page and image files are served; code, config and notes in the repo never are.
// Vercel ignores this file.
import express from 'express'
import rateLimit from 'express-rate-limit'
import { existsSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, extname, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3000

// Vercel needed connection_limit=1 for Neon (one connection per short-lived function). A long-running
// server can share a small pool instead.
if (process.env.DATABASE_URL?.includes('connection_limit=1')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('connection_limit=1', 'connection_limit=5')
}

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1) // Caddy is the one proxy in front; req.ip is the visitor

app.get('/healthz', (req, res) => res.type('text').send('ok'))

// ── Attempt limits (per visitor IP) ──────────────────────────────────────────
const limit = (max, minutes, message) =>
  rateLimit({ windowMs: minutes * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { error: message } })
app.post('/api/admin/auth', limit(5, 15, 'Too many login attempts. Try again in 15 minutes.'))
app.post(['/api/inquiries', '/api/quotes'], limit(10, 15, 'Too many submissions. Please try again later.'))
app.post('/api/public', limit(5, 15, 'Too many submissions. Please try again later.'))
app.use('/api', limit(300, 15, 'Too many requests. Please try again later.'))

// ── API: api/<path>.js answers /api/<path> ───────────────────────────────────
function findHandlers(dir, base = '/api') {
  const routes = {}
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) Object.assign(routes, findHandlers(full, `${base}/${entry.name}`))
    else if (entry.name.endsWith('.js')) routes[`${base}/${entry.name.slice(0, -3)}`] = full
  }
  return routes
}
const jsonBody = [express.json({ limit: '2mb' }), express.urlencoded({ extended: true, limit: '2mb' })]
for (const [route, file] of Object.entries(findHandlers(join(ROOT, 'api')))) {
  const mod = await import(pathToFileURL(file).href)
  const parseBody = mod.config?.api?.bodyParser !== false
  app.all(route, ...(parseBody ? jsonBody : []), async (req, res, next) => {
    try {
      await mod.default(req, res)
    } catch (err) {
      next(err)
    }
  })
}
app.all('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }))

// ── Pages and images ─────────────────────────────────────────────────────────
// Only these file types are ever served as files. No .js/.md/.json/.prisma/.sql, so the code,
// config and notes in this repo are never downloadable.
const PUBLIC_EXT = new Set(['.html', '.css', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico',
  '.pdf', '.txt', '.xml', '.woff', '.woff2', '.webmanifest'])
const PRIVATE_DIRS = new Set(['api', 'lib', 'prisma', 'node_modules', 'vercel'])

function publicFile(urlPath) {
  const file = join(ROOT, urlPath)
  const rel = relative(ROOT, file)
  if (rel.startsWith('..') || rel.split(sep).some(part => part.startsWith('.'))) return null
  if (PRIVATE_DIRS.has(rel.split(sep)[0])) return null
  if (!PUBLIC_EXT.has(extname(file).toLowerCase())) return null
  try { return statSync(file).isFile() ? file : null } catch { return null }
}

const REWRITES = { '/admin': '/admin.html', '/admin-login': '/admin-login.html', '/careers': '/careers.html' }

app.get('*', (req, res, next) => {
  let p
  try { p = decodeURIComponent(req.path) } catch { return res.status(400).end() }
  const query = req.originalUrl.slice(req.path.length)

  // trailingSlash: false and cleanUrls: true, as on Vercel
  if (p.length > 1 && p.endsWith('/')) return res.redirect(308, p.replace(/\/+$/, '') + query)
  if (p.endsWith('.html')) {
    const clean = p.replace(/(\/index)?\.html$/, '') || '/'
    return res.redirect(308, clean + query)
  }

  const target = REWRITES[p] ?? p
  const candidates = target === '/' ? ['/index.html'] : [target, `${target}.html`, `${target}/index.html`]
  for (const c of candidates) {
    const file = publicFile(c)
    if (file) {
      if (extname(file) === '.html') res.set('Cache-Control', 'no-cache')
      else if (c.startsWith('/portfolio-photos/')) res.set('Cache-Control', 'public, max-age=604800')
      return res.sendFile(file)
    }
  }
  next()
})

app.use((req, res) => res.status(404).type('text').send('Page not found'))

app.use((err, req, res, next) => {
  console.error('[server error]', req.method, req.path, err?.message)
  if (!res.headersSent) res.status(500).json({ error: 'Server error' })
})

app.listen(PORT, () => console.log(`MCS site listening on :${PORT}`))
