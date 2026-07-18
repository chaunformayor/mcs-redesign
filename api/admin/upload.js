import { put } from '@vercel/blob'
import formidable from 'formidable'
import { createReadStream } from 'fs'
import { requireAdmin } from '../../lib/auth.js'

// Disable Vercel's default body parser so formidable can handle multipart
export const config = { api: { bodyParser: false } }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const form = formidable({ maxFileSize: MAX_SIZE })

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'Upload failed: ' + err.message })
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) return res.status(400).json({ error: 'No file provided' })

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' })
    }

    const folder = (Array.isArray(fields.type) ? fields.type[0] : fields.type) || 'uploads'
    const ext    = file.originalFilename?.split('.').pop() || 'jpg'
    const name   = `${folder}/${Date.now()}.${ext}`

    try {
      const stream = createReadStream(file.filepath)
      const blob   = await put(name, stream, {
        access:      'public',
        contentType: file.mimetype,
      })
      return res.json({
        success: true,
        url:     blob.url,
        name:    file.originalFilename,
        size:    file.size,
        type:    file.mimetype,
      })
    } catch (e) {
      return res.status(500).json({ error: 'Blob upload failed: ' + e.message })
    }
  })
}
