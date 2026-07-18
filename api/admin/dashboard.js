import { prisma } from '../../lib/db.js'
import { requireAdmin } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const [
    inquiryTotal, inquiryNew,
    quoteTotal,   quoteNew,
    blogTotal,    blogPublished, blogDraft,
    projectTotal, projectActive,
    testimonialTotal, testimonialActive,
    recentInquiries,
    recentQuotes,
  ] = await Promise.all([
    prisma.inquiry.count(),
    prisma.inquiry.count({ where: { status: 'new' } }),
    prisma.quoteRequest.count(),
    prisma.quoteRequest.count({ where: { status: 'new' } }),
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { status: 'published' } }),
    prisma.blogPost.count({ where: { status: 'draft' } }),
    prisma.project.count(),
    prisma.project.count({ where: { status: 'active' } }),
    prisma.testimonial.count(),
    prisma.testimonial.count({ where: { status: 'active' } }),
    prisma.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, service: true, status: true, createdAt: true },
    }),
    prisma.quoteRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, service: true, status: true, createdAt: true },
    }),
  ])

  return res.json({
    inquiries:         { total: inquiryTotal,     new: inquiryNew },
    quotes:            { total: quoteTotal,        new: quoteNew },
    blog_posts:        { total: blogTotal,         published: blogPublished, draft: blogDraft },
    projects:          { total: projectTotal,      active: projectActive },
    testimonials:      { total: testimonialTotal,  active: testimonialActive },
    recent_inquiries:  recentInquiries,
    recent_quotes:     recentQuotes,
  })
}
