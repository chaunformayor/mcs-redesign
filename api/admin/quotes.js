import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  if (req.method === 'GET') {
    const { status } = req.query
    const quotes = await prisma.quoteRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ quotes })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
