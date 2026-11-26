# Missouri Construction Service — Project Context

## About the Owner
Chaun — St. Louis-based real estate investor and contractor, 25+ years experience.
- **Email:** missouriconstructionservice@gmail.com
- **Companies:** Missouri Construction Service, Midwest Investor Services, Luxe Property Solutions, BRRRR8
- **Tech preference:** Plain HTML/CSS/JS. No frameworks, no build steps unless necessary.

## This Project
**Missouri Construction Service** — main company website for the construction/contracting business.

- **Domain:** missouriconstructionservice.com
- **GitHub:** github.com/chaunformayor/mcs-redesign
- **Deployed on (since 2026-11-26):** the Oracle "web" server, as the Docker container `mcs`. Every push to `main` is live about 1–2 minutes later (the server checks GitHub every 2 minutes, rebuilds, health-checks `/healthz`, and rolls back on failure). Server setup, settings and backups are documented in the private `oracle-servers` repo (`web/`).
- **Before that:** Vercel (team: chauns-projects, project `mcs-redesign`). It's kept as a fallback for about 2 weeks, and Vercel still builds `main` there, but the domain no longer points to it.
- **Local path:** `C:\Users\demet\mcs-redesign\`

## Stack
- **Frontend:** Plain HTML/CSS/JS — no framework
- **Backend:** `server.js` (Express) runs the same `api/*.js` handlers Vercel used to run, at the same URLs, serves the pages with clean URLs, and serves only page and image files (never code or notes). It also limits attempts: admin login 5 per 15 min, forms 10 per 15 min.
- **Database:** Neon Postgres (serverless PostgreSQL, free tier). Neon org "MISSOURI CONSTRUCTION SERVICE", project `cold-meadow-76612804`.
- **ORM:** Prisma 5 — schema at `prisma/schema.prisma`
- **Auth:** JWT (via `jose`) in httpOnly cookies — `lib/auth.js`
- **Image uploads:** Vercel Blob (`@vercel/blob`) + formidable for multipart parsing
- **Styling:** `shared.css` used across all pages

## Pages
| File | URL | Notes |
|------|-----|-------|
| `index.html` | `/` | Homepage |
| `about.html` | `/about` | About page |
| `services.html` | `/services` | Services |
| `portfolio.html` | `/portfolio` | Pulls live projects from DB |
| `blog.html` | `/blog` | Pulls published posts from DB |
| `blog-post.html` | `/blog/:slug` | Individual post page (rewrite in vercel.json) |
| `contact.html` | `/contact` | Contact + quote request forms (wired to API) |
| `admin.html` | `/admin` | Admin SPA (JWT protected) |
| `admin-login.html` | `/admin-login` | Login page |
| `estimator.html` | `/estimator` | MCS Rehab Estimator (JWT protected, embedded in admin via iframe under Tools > Rehab Estimator). Tabbed internal cost estimator (Framing/Finishes/Flooring/Kitchen/Bathrooms/Exterior/Fees/Summary) with fully editable line items (name, qty, mat $/unit, labor hrs), add/delete rows, 10% material waste factor, $75/hr 2-person crew labor rate, and a "Generate Client-Facing Estimate" button that produces a Conservative/Full-Scope lump-sum client view (no line-item pricing) with print-to-PDF support. Auth guard pings `/api/admin/dashboard` on load and redirects to `/admin-login` on a 401 (same pattern as admin.html's `api()` helper) since it's a standalone static page outside the SPA shell.

## API Endpoints (12 total — Hobby plan limit)
| File | Route | Purpose |
|------|-------|---------|
| `api/public.js` | `/api/public?type=blog\|post\|projects` | Public data (no auth) |
| `api/inquiries.js` | `/api/inquiries` | Public contact form POST |
| `api/quotes.js` | `/api/quotes` | Public quote request POST |
| `api/admin/auth.js` | `/api/admin/auth` | POST login, DELETE logout |
| `api/admin/dashboard.js` | `/api/admin/dashboard` | Stats overview |
| `api/admin/blog.js` | `/api/admin/blog?id=` | Blog CRUD |
| `api/admin/projects.js` | `/api/admin/projects?id=` | Projects CRUD |
| `api/admin/testimonials.js` | `/api/admin/testimonials?id=` | Testimonials CRUD |
| `api/admin/inquiries.js` | `/api/admin/inquiries?id=` | Inquiries list + status update |
| `api/admin/quotes.js` | `/api/admin/quotes` | Quote requests list |
| `api/admin/settings.js` | `/api/admin/settings` | Site settings GET/POST |
| `api/admin/upload.js` | `/api/admin/upload` | Image upload to Vercel Blob |

**Important:** The [id].js pattern is NOT used. All single-item operations use `?id=` query params on the parent file (e.g. `/api/admin/blog?id=5`). This keeps the function count at 12.

## Database (Neon Postgres)
Tables: `inquiries`, `quote_requests`, `blog_posts`, `projects`, `project_images`, `testimonials`, `site_settings`

Schema: `prisma/schema.prisma`
Seed: `prisma/seed.js` (run once to insert default site settings)

The tables were created by running raw SQL in the Neon SQL Editor (not `prisma db push`).

## Environment Variables (on the web server: `/opt/web/env/mcs.env`, root-only; never in this repo)
```
DATABASE_URL          Neon pooled connection (server.js turns connection_limit=1 into 5)
DIRECT_URL            Neon direct connection (for migrations)
ADMIN_JWT_SECRET      Long random string for signing JWT tokens (generated on the server; required)
ADMIN_PASSWORD        Login password, used only until one is saved in Admin -> Settings (then stored hashed in site_settings). There is no default password.
BLOB_READ_WRITE_TOKEN Vercel Blob store "mcsblob" (photos still live there)
```

## Key Decisions
- **No [id].js files** — consolidated into parent files with `?id=` to stay under the 12-function Hobby plan limit
- **Prisma `token` passed explicitly** to `put()` in upload.js to avoid "access denied" errors
- **Blog posts default to "draft"** — must change to "Published" in admin for them to appear on /blog
- **Projects default to "active"** — visible on /portfolio immediately after creation
- **`outputDirectory: "."` in vercel.json** — tells Vercel static files are in the project root
- **JWT in httpOnly cookies** — stateless auth that works across serverless invocations

## What's Next (suggested)
1. Email notifications when new inquiry/quote arrives (Resend API, free)
2. Pull live testimonials onto homepage from DB
3. Pull latest blog posts onto homepage from DB
4. Wire homepage contact/quote forms to API if not already done
5. SEO meta descriptions on blog post pages
