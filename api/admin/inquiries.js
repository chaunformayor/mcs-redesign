import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

const INQ_STATUSES = ['new', 'contacted', 'quoted', 'closed']
const APP_STATUSES = ['new', 'reviewed', 'interview', 'hired', 'rejected']

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  const section = req.query.section // 'applications' or undefined (default = inquiries)
  const id = req.query.id ? parseInt(req.query.id) : null

  // ── Job Applications ─────────────────────────────────────────
  if (section === 'applications') {
    if (req.method === 'GET') {
      const apps = await prisma.jobApplication.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return res.json({ applications: apps })
    }

    if (req.method === 'PATCH' && id) {
      const { status } = req.body ?? {}
      if (!APP_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      await prisma.jobApplication.update({ where: { id }, data: { status } })
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Inquiries (default) ──────────────────────────────────────
  if (id) {
    if (req.method === 'PATCH') {
      const { status } = req.body ?? {}
      if (!INQ_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      await prisma.inquiry.update({ where: { id }, data: { status } })
      return res.json({ success: true })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
