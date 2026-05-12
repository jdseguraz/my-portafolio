# Juan Segura — Personal Portfolio

A personal portfolio built with Next.js 16, Tailwind CSS v4, next-intl (EN/ES), and Supabase.

See [PRD.md](./PRD.md) for product context, vision, and technical decisions.

## Setup

1. Copy the environment variables template and fill in your values:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to `/en` by default.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once and exit |
| `npm run analyze` | Build with bundle analyzer (opens treemap in browser) |

## Admin auth

The portfolio has a single-admin panel at `/admin`.

**Required environment variables:**

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Plaintext password for the admin user. Minimum 16 characters. |
| `AUTH_SESSION_SECRET` | 32 random bytes, base64url-encoded. Signs the session cookie. |

**Generate `AUTH_SESSION_SECRET`:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Notes:**
- There is no password reset flow. If the password is lost, change `ADMIN_PASSWORD` and redeploy.
- Rotating `AUTH_SESSION_SECRET` immediately invalidates all existing sessions.
- The admin panel is English-only and does not use locale routing.

## Stack

- **Next.js 16** — App Router, TypeScript, Server Components
- **Tailwind CSS v4** — CSS-native configuration, dark mode via `class`
- **next-intl** — Locale routing (`/en`, `/es`)
- **next-themes** — Dark/light toggle, persisted in localStorage
- **Supabase** — Database, Storage, Auth (wired in Fase 1)
- **Vitest + React Testing Library** — Unit tests

## Environment Variables

### Public (used in browser + server)

| Variable | Description | Local dev | Vercel production |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL used for `metadataBase`, sitemap, and robots.txt | `http://localhost:3000` | `https://jdseguraz.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | From Supabase dashboard | Same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | From Supabase dashboard | Same |

### Server-only

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Plaintext password for the admin user (minimum 16 characters) |
| `AUTH_SESSION_SECRET` | 32 random bytes, base64url-encoded — signs the session cookie |

> `NEXT_PUBLIC_SITE_URL` is required for correct canonical URLs in social shares and search engine indexing. If unset, all URLs fall back to `https://jdseguraz.com` (production safe, incorrect for previews).

## Deploy Checklist

Before going live at `jdseguraz.com`:

1. **Replace picsum.photos URLs**: Every project `cover_image_url` and `gallery_images` URL in the Supabase DB must point to a real Supabase Storage public URL. Upload images via the admin UI at `/admin/projects`.

2. **Remove picsum from remotePatterns**: After real images are uploaded, delete the `picsum.photos` and `fastly.picsum.photos` entries from `images.remotePatterns` in `next.config.ts`.

3. **Set `NEXT_PUBLIC_SITE_URL` in Vercel**: Add `NEXT_PUBLIC_SITE_URL=https://jdseguraz.com` to the Vercel project environment variables (Production + Preview environments). Verify this is set before the first production deploy.

4. **Verify DNS**: Confirm `jdseguraz.com` A/CNAME records point to Vercel's IP or `cname.vercel-dns.com`.

5. **Run Lighthouse audit**: After the first production deploy, run Lighthouse (Chrome DevTools or PageSpeed Insights) on `https://jdseguraz.com/en`. Target ≥ 90 on Performance, Accessibility, Best Practices, and SEO.

6. **Verify metadataBase resolves correctly**: Check that `<link rel="canonical">` in the page source points to `https://jdseguraz.com/en` (not `localhost` or a preview URL).

7. **Check sitemap and robots**: Visit `https://jdseguraz.com/sitemap.xml` and `https://jdseguraz.com/robots.txt` to confirm they render correctly with real project slugs.
