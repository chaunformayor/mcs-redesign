import { prisma } from '../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const b = req.body ?? {}
  if (!b.name || !b.email || !b.phone || !b.service) {
    return res.status(400).json({ error: 'Name, email, phone, and service are required' })
  }

  await prisma.quoteRequest.create({
    data: {
      name:               b.name.trim(),
      email:              b.email.trim().toLowerCase(),
      phone:              b.phone.trim(),
      service:            b.service,
      projectDescription: b.project_description ?? '',
      address:            b.address  ?? '',
      timeline:           b.timeline ?? '',
      budget:             b.budget   ?? '',
    },
  })

  return res.status(201).json({ success: true })
}
