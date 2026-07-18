import { signAdminToken, adminCookieHeader, clearAdminCookie } from '../../lib/auth.js'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme123'

export default async function handler(req, res) {
  // POST /api/admin/auth — login
  if (req.method === 'POST') {
    const { password } = req.body ?? {}
    if (!password || password !== ADMIN_PASSWORD) {
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
