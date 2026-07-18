import { SignJWT, jwtVerify } from 'jose'

const getSecret = () =>
  new TextEncoder().encode(process.env.ADMIN_JWT_SECRET ?? 'dev-secret-change-in-production')

// ── Token helpers ────────────────────────────────────────────────────────────

export async function signAdminToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyAdminToken(token) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === 'admin' ? payload : null
  } catch {
    return null
  }
}

// ── Cookie helpers ───────────────────────────────────────────────────────────

export function parseCookies(req) {
  const header = req.headers?.cookie ?? ''
  return Object.fromEntries(
    header.split(';')
      .map(c => c.trim().split('='))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k.trim(), v.join('=')])
  )
}

// Cookie string for setting the admin session (7 days)
export function adminCookieHeader(token) {
  const maxAge = 7 * 24 * 60 * 60
  return `mcs_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
}

// Cookie string for clearing the admin session
export const clearAdminCookie =
  'mcs_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'

// ── Auth guard ───────────────────────────────────────────────────────────────

/**
 * Call at the start of any protected API handler.
 * Returns true if authenticated, false if it already sent a 401 response.
 */
export async function requireAdmin(req, res) {
  const cookies = parseCookies(req)
  const payload = await verifyAdminToken(cookies.mcs_admin)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}
