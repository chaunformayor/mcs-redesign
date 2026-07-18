import { prisma } from '../../../lib/db.js'
import { requireAdmin } from '../../../lib/auth.js'

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  const id = parseInt(req.query.id)
  if (!id) return res.status(400).json({ error: 'Invalid ID' })

  if (req.method === 'GET') {
    const post = await prisma.blogPost.findUnique({ where: { id } })
    if (!post) return res.status(404).json({ error: 'Not found' })
    return res.json({ post })
  }

  if (req.method === 'PUT') {
    const b = req.body ?? {}
    if (!b.title || !b.content) return res.status(400).json({ error: 'Title and content are required' })
    await prisma.blogPost.update({
      where: { id },
      data: {
        title:           b.title,
        content:         b.content,
        excerpt:         b.excerpt          ?? '',
        category:        b.category         ?? '',
        featuredImage:   b.featured_image   ?? '',
        status:          b.status           ?? 'draft',
        author:          b.author           ?? 'Admin',
        metaTitle:       b.meta_title       ?? '',
        metaDescription: b.meta_description ?? '',
      },
    })
    return res.json({ success: true })
  }

  if (req.method === 'DELETE') {
    await prisma.blogPost.delete({ where: { id } })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
