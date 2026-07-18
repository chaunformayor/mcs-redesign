import { prisma } from '../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const b = req.body ?? {}
  if (!b.name || !b.email || !b.message) {
    return res.status(400).json({ error: 'Name, email, and message are required' })
  }

  await prisma.inquiry.create({
    data: {
      name:    b.name.trim(),
      email:   b.email.trim().toLowerCase(),
      phone:   b.phone   ?? '',
      service: b.service ?? '',
      message: b.message.trim(),
      source:  b.source  ?? 'contact-form',
    },
  })

  return res.status(201).json({ success: true })
}
