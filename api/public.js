import { prisma } from '../lib/db.js'
import { put } from '@vercel/blob'
import formidable from 'formidable'
import { createReadStream } from 'fs'

// Disable body parser so formidable can handle multipart POSTs
export const config = { api: { bodyParser: false } }

const ALLOWED_IMG = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_DOC = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_IMG = 8 * 1024 * 1024   // 8 MB
const MAX_DOC = 10 * 1024 * 1024  // 10 MB

export default async function handler(req, res) {
  const { type, slug } = req.query

  // ── Public data reads (GET) ──────────────────────────────────
  if (req.method === 'GET') {
    if (type === 'blog') {
      const posts = await prisma.blogPost.findMany({
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, slug: true, excerpt: true, category: true, featuredImage: true, author: true, createdAt: true },
      })
      return res.json({ posts })
    }

    if (type === 'post' && slug) {
      const post = await prisma.blogPost.findFirst({ where: { slug, status: 'published' } })
      if (!post) return res.status(404).json({ error: 'Post not found' })
      return res.json({ post })
    }

    if (type === 'projects') {
      const projects = await prisma.project.findMany({
        where: { status: 'active' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      })
      return res.json({ projects })
    }

    return res.status(400).json({ error: 'Invalid type' })
  }

  // ── Job application submission (POST) ────────────────────────
  if (req.method === 'POST' && type === 'apply') {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) return res.status(500).json({ error: 'Upload service not configured' })

    return new Promise((resolve) => {
      const form = formidable({ maxFileSize: MAX_DOC, multiples: true })

      form.parse(req, async (err, fields, files) => {
        if (err) {
          res.status(400).json({ error: 'Form parse error: ' + err.message })
          return resolve()
        }

        const f = (key) => (Array.isArray(fields[key]) ? fields[key][0] : fields[key]) || ''

        // Upload portfolio images
        const portfolioUrls = []
        const rawPortfolio = files.portfolio
        const portfolioFiles = rawPortfolio
          ? (Array.isArray(rawPortfolio) ? rawPortfolio : [rawPortfolio])
          : []

        for (const img of portfolioFiles.slice(0, 5)) {
          if (!ALLOWED_IMG.includes(img.mimetype)) continue
          if (img.size > MAX_IMG) continue
          const ext = img.originalFilename?.split('.').pop() || 'jpg'
          const name = `applications/portfolio/${Date.now()}-${portfolioUrls.length}.${ext}`
          try {
            const blob = await put(name, createReadStream(img.filepath), { access: 'public', contentType: img.mimetype, token })
            portfolioUrls.push(blob.url)
          } catch (_) {}
        }

        // Upload resume
        let resumeUrl = null
        const rawResume = files.resume
        const resumeFile = Array.isArray(rawResume) ? rawResume[0] : rawResume
        if (resumeFile && ALLOWED_DOC.includes(resumeFile.mimetype) && resumeFile.size <= MAX_DOC) {
          const ext = resumeFile.originalFilename?.split('.').pop() || 'pdf'
          const name = `applications/resumes/${Date.now()}.${ext}`
          try {
            const blob = await put(name, createReadStream(resumeFile.filepath), { access: 'public', contentType: resumeFile.mimetype, token })
            resumeUrl = blob.url
          } catch (_) {}
        }

        // Save to database
        try {
          await prisma.jobApplication.create({
            data: {
              name: f('name'),
              email: f('email'),
              phone: f('phone') || null,
              position: f('position') || null,
              experience: f('experience') || null,
              availability: f('availability') || null,
              employmentType: f('employment_type') || null,
              licensed: f('licensed') === 'yes',
              licenseDetails: f('license_details') || null,
              about: f('about') || null,
              workHistory: f('work_history') || null,
              references: f('references') || null,
              portfolioUrls,
              resumeUrl,
            },
          })
          res.json({ success: true })
        } catch (e) {
          res.status(500).json({ error: 'Database error: ' + e.message })
        }
        resolve()
      })
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
