import { prisma } from '../../../lib/db.js'
import { requireAdmin } from '../../../lib/auth.js'

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  const id = parseInt(req.query.id)
  if (!id) return res.status(400).json({ error: 'Invalid ID' })

  if (req.method === 'PUT') {
    const b = req.body ?? {}
    if (!b.name || !b.content) return res.status(400).json({ error: 'Name and content are required' })
    await prisma.testimonial.update({
      where: { id },
      data: {
        name:     b.name,
        location: b.location ?? '',
        rating:   Math.min(5, Math.max(1, parseInt(b.rating ?? 5))),
        content:  b.content,
        status:   b.status ?? 'active',
      },
    })
    return res.json({ success: true })
  }

  if (req.method === 'DELETE') {
    await prisma.testimonial.delete({ where: { id } })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
