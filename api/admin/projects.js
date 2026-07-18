import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  const id = req.query.id ? parseInt(req.query.id) : null

  // Single-item operations
  if (id) {
    if (req.method === 'GET') {
      const project = await prisma.project.findUnique({
        where: { id },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      })
      if (!project) return res.status(404).json({ error: 'Not found' })
      return res.json({ project })
    }

    if (req.method === 'PUT') {
      const b = req.body ?? {}
      if (!b.title) return res.status(400).json({ error: 'Title is required' })
      await prisma.projectImage.deleteMany({ where: { projectId: id } })
      await prisma.project.update({
        where: { id },
        data: {
          title:         b.title,
          category:      b.category      ?? '',
          service:       b.service       ?? '',
          location:      b.location      ?? '',
          duration:      b.duration      ?? '',
          description:   b.description   ?? '',
          featuredImage: b.featured_image ?? '',
          status:        b.status        ?? 'active',
          sortOrder:     b.sort_order    ?? 0,
          images: b.images?.length
            ? { create: b.images.map((url, i) => ({ imagePath: url, sortOrder: i })) }
            : undefined,
        },
      })
      return res.json({ success: true })
    }

    if (req.method === 'DELETE') {
      await prisma.project.delete({ where: { id } })
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Collection operations
  if (req.method === 'GET') {
    const projects = await prisma.project.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    })
    return res.json({ projects })
  }

  if (req.method === 'POST') {
    const b = req.body ?? {}
    if (!b.title) return res.status(400).json({ error: 'Title is required' })
    const project = await prisma.project.create({
      data: {
        title:         b.title,
        category:      b.category      ?? '',
        service:       b.service       ?? '',
        location:      b.location      ?? '',
        duration:      b.duration      ?? '',
        description:   b.description   ?? '',
        featuredImage: b.featured_image ?? '',
        status:        b.status        ?? 'active',
        sortOrder:     b.sort_order    ?? 0,
        images: b.images?.length
          ? { create: b.images.map((url, i) => ({ imagePath: url, sortOrder: i })) }
          : undefined,
      },
    })
    return res.status(201).json({ success: true, id: project.id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
