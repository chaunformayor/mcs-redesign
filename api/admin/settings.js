import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

const ALLOWED_KEYS = ['phone', 'email', 'address', 'hours_weekday', 'hours_weekend']

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  if (req.method === 'GET') {
    const rows = await prisma.siteSetting.findMany()
    const settings = Object.fromEntries(rows.map(r => [r.settingKey, r.settingValue]))
    return res.json(settings)
  }

  if (req.method === 'POST') {
    const body = req.body ?? {}
    await Promise.all(
      Object.entries(body)
        .filter(([k]) => ALLOWED_KEYS.includes(k))
        .map(([k, v]) =>
          prisma.siteSetting.upsert({
            where:  { settingKey: k },
            update: { settingValue: String(v).trim() },
            create: { settingKey: k, settingValue: String(v).trim() },
          })
        )
    )
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
