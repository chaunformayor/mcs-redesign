import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

function makeSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function uniqueSlug(base) {
  let slug = base, i = 1
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`
  }
  return slug
}

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  const id = req.query.id ? parseInt(req.query.id) : null

  // Single-item operations
  if (id) {
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

  // Collection operations
  if (req.method === 'GET') {
    const { status } = req.query
    const posts = await prisma.blogPost.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ posts })
  }

  if (req.method === 'POST') {
    const b = req.body ?? {}
    if (!b.title) return res.status(400).json({ error: 'Title is required' })
    const slug = await uniqueSlug(makeSlug(b.title))
    const post = await prisma.blogPost.create({
      data: {
        title:           b.title,
        slug,
        content:         b.content         ?? '',
        excerpt:         b.excerpt          ?? '',
        category:        b.category         ?? '',
        featuredImage:   b.featured_image   ?? '',
        status:          b.status           ?? 'draft',
        author:          b.author           ?? 'Admin',
        metaTitle:       b.meta_title       ?? '',
        metaDescription: b.meta_description ?? '',
      },
    })
    return res.status(201).json({ success: true, id: post.id, slug: post.slug })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
