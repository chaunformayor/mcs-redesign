import { createHash, scryptSync, timingSafeEqual } from 'crypto'
import { prisma } from '../../lib/db.js'
import { signAdminToken, adminCookieHeader, clearAdminCookie } from '../../lib/auth.js'

// No built-in fallback password: if neither a saved password nor ADMIN_PASSWORD exists, nobody
// can log in (this used to fall back to a well-known default).
const ENV_PASSWORD = process.env.ADMIN_PASSWORD || null

function verifyHashed(password, stored) {
  const [salt, hash] = stored.split(':')
  const hashBuf = Buffer.from(hash, 'hex')
  const derived = scryptSync(password, salt, 64)
  return timingSafeEqual(hashBuf, derived)
}

// Constant-time comparison for the plain environment password
function sameText(a, b) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

async function checkPassword(password) {
  const row = await prisma.siteSetting.findUnique({ where: { settingKey: 'admin_password_hash' } }).catch(() => null)
  if (row?.settingValue) return verifyHashed(password, row.settingValue)
  if (!ENV_PASSWORD) return false
  return sameText(password, ENV_PASSWORD)
}

export default async function handler(req, res) {
  // POST /api/admin/auth — login
  if (req.method === 'POST') {
    const { password } = req.body ?? {}
    if (!password || !(await checkPassword(password))) {
      return res.status(401).json({ error: 'Incorrect password' })
    }
    const token = await signAdminToken()
    res.setHeader('Set-Cookie', adminCookieHeader(token))
    return res.json({ success: true })
  }

  // DELETE /api/admin/auth — logout
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearAdminCookie)
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
