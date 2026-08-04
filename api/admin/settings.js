import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

const ALLOWED_KEYS = ['phone', 'email', 'address', 'hours_weekday', 'hours_weekend']
const ENV_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme123'

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyHashed(password, stored) {
  const [salt, hash] = stored.split(':')
  const hashBuf = Buffer.from(hash, 'hex')
  const derived = scryptSync(password, salt, 64)
  return timingSafeEqual(hashBuf, derived)
}

async function checkCurrentPassword(password) {
  const row = await prisma.siteSetting.findUnique({ where: { settingKey: 'admin_password_hash' } }).catch(() => null)
  if (row?.settingValue) return verifyHashed(password, row.settingValue)
  return password === ENV_PASSWORD
}

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

  // PATCH /api/admin/settings — change password
  if (req.method === 'PATCH') {
    const { currentPassword, newPassword } = req.body ?? {}
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }
    if (!(await checkCurrentPassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    const hashed = hashPassword(newPassword)
    await prisma.siteSetting.upsert({
      where:  { settingKey: 'admin_password_hash' },
      update: { settingValue: hashed },
      create: { settingKey: 'admin_password_hash', settingValue: hashed },
    })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
