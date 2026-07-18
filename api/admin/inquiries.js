import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

const VALID_STATUSES = ['new', 'contacted', 'quoted', 'closed']

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  const id = req.query.id ? parseInt(req.query.id) : null

  // Single-item operations
  if (id) {
    if (req.method === 'PATCH') {
      const { status } = req.body ?? {}
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      await prisma.inquiry.update({ where: { id }, data: { status } })
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Collection operations
  if (req.method === 'GET') {
    const { status } = req.query
    const inquiries = await prisma.inquiry.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ inquiries })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
