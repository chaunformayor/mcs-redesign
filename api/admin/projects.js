import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

// The admin sends gallery photos as { path, caption } objects; older callers sent plain URLs.
// Accept both (plain objects used to make every save with new photos fail).
function toImageRows(images) {
  return images
    .map(img => (typeof img === 'string' ? { path: img, caption: null } : img ?? {}))
    .filter(img => typeof img.path === 'string' && img.path)
    .map((img, i) => ({ imagePath: img.path, caption: img.caption || null, sortOrder: i }))
}

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
      // One transaction: if the update fails, the old photos are not left deleted.
      const rows = toImageRows(b.images ?? [])
      await prisma.$transaction([
        prisma.projectImage.deleteMany({ where: { projectId: id } }),
        prisma.project.update({
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
            images: rows.length ? { create: rows } : undefined,
          },
        }),
      ])
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
        images: toImageRows(b.images ?? []).length
          ? { create: toImageRows(b.images ?? []) }
          : undefined,
      },
    })
    return res.status(201).json({ success: true, id: project.id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
