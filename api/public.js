import { prisma } from '../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { type, slug } = req.query

  if (type === 'blog') {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, excerpt: true, category: true, featuredImage: true, author: true, createdAt: true },
    })
    return res.json({ posts })
  }

  if (type === 'post' && slug) {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: 'published' },
    })
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
