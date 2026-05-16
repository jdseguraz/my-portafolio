# PRD — Portafolio Personal

> **Documento vivo.** Esto define el QUÉ y el PORQUÉ. El CÓMO (arquitectura, decisiones técnicas finas) va en otros docs cuando llegue el momento.

---

## 1. Visión

Un portafolio personal **minimalista, con estilo, y con una galería de proyectos que se sienta viva**. No el típico grid gris. La estrella del show es la galería: animada, asimétrica (columnas a distintas alturas), elegante.

**Objetivo de negocio:** que cualquier persona que llegue al sitio entienda en menos de 10 segundos quién soy, qué hago, y se sienta atraída a explorar los proyectos.

---

## 2. Referencia de inspiración

- **[dannpetty.com](https://www.dannpetty.com/)** — referencia principal, especialmente:
  - Galería tipo masonry con columnas desalineadas
  - Animación de entrada al hacer scroll
  - Click en proyecto → navega a vista de detalle (NO modal)
  - Tipografía grande y declarativa en el hero
  - Fondo oscuro, tarjetas de proyecto que respiran

> Inspiración, no copia. El estilo se mantiene, el contenido y la identidad son propias.

---

## 3. Stack técnico

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Framework | **Next.js (App Router)** instalado con `npm` | SSR/SSG out-of-the-box, ideal para SEO de portafolio y rutas dinámicas de proyectos |
| Lenguaje | **TypeScript** | Tipado fuerte; menos bugs en data model |
| Estilos | **Tailwind CSS** | Velocidad de iteración + diseño consistente |
| Tipografía | **Geist Sans** (paquete `geist` oficial de Vercel) | Default moderno, técnico; el paquete `geist` trae glyph set completo + font-feature-settings que `next/font/google` no incluye. Lo trae `create-next-app` por defecto en Next 15. |
| Tema (dark/light) | **`next-themes`** | Toggle dark/light en el header, persistente en localStorage, sin parpadeo en SSR |
| i18n | **`next-intl`** | Locale en la URL (`/en`, `/es`), SSR-friendly, type-safe |
| Animaciones galería | **Framer Motion** (a confirmar) | Animaciones de entrada/scroll del masonry |
| DB + Auth + Storage | **Supabase** | Postgres + Storage para imágenes; setup rápido |
| Markdown | **react-markdown** + `remark-gfm` + `rehype-highlight` | Render seguro del campo descripción con syntax highlighting |
| Deploy | **Vercel** (fase de pruebas) | Integra nativo con Next.js, previews por PR |
| Dominio | **`jdseguraz.com`** (comprado en Hostinger) | DNS apuntando a Vercel (registros A / CNAME provistos por Vercel) |
| Auth admin | **Contraseña hardcoded** (env var) | Simple a propósito; reemplazable más adelante |

> ⚠️ **Hostinger** se usa **sólo como registrador de dominio**. El hosting es Vercel mientras estamos en pruebas.

---

## 4. Rutas

Con i18n, todas las rutas públicas viven bajo `[locale]`. El admin queda fuera del locale (sólo se usa en un idioma).

| Ruta | Tipo | Descripción |
|------|------|-------------|
| `/` | Redirect | Detecta locale del navegador → `/en` o `/es` |
| `/[locale]` | Pública | Landing + galería de proyectos (masonry animado) |
| `/[locale]/projects/[slug]` | Pública | Vista de detalle de un proyecto |
| `/admin` | Oculta | Login + CRUD de proyectos (no enlazada desde ningún lado) |
| `/admin/projects/new` | Oculta | Crear proyecto |
| `/admin/projects/[id]/edit` | Oculta | Editar proyecto |

> `/admin` está en `robots.txt` como `disallow` y no se enlaza desde ninguna parte del sitio público.

---

## 5. Modelo de datos

### Tabla `projects` (Supabase)

Los campos traducibles llevan sufijo `_en` / `_es`. Decisión: **columnas duplicadas** (más simple y type-safe que un JSONB de translations para sólo 2 idiomas).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `uuid` (PK) | Generado por DB |
| `slug` | `text` (unique) | Compartido entre idiomas. Para URL `/[locale]/projects/[slug]` |
| `title_en` | `text` | Título en inglés |
| `title_es` | `text` | Título en español |
| `subtitle_en` | `text` | Subtítulo en inglés |
| `subtitle_es` | `text` | Subtítulo en español |
| `description_en` | `text` | Markdown en inglés |
| `description_es` | `text` | Markdown en español |
| `cover_image_url` | `text` | Imagen principal (no se traduce) |
| `gallery_images` | `text[]` | URLs de imágenes alternas (orden importa, no se traduce) |
| `tags` | `text[]` | Tecnologías / categorías (no se traducen — son nombres propios) |
| `display_order` | `int` | Orden en la galería pública (más bajo = primero) |
| `published` | `bool` | Si está `false`, no aparece en `/` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Trigger de update |

**Política de traducción**: si un campo en el locale solicitado está vacío, se hace fallback al otro idioma (con un aviso opcional en consola). En el admin, antes de publicar, se exige que ambos idiomas estén completos.

### Storage (Supabase Storage)

- Bucket `project-images` (público)
- Estructura: `project-images/{project-id}/cover.{ext}`, `project-images/{project-id}/gallery/{n}.{ext}`

---

## 6. Funcionalidades

### 6.1 Sitio público

- **Header global**:
  - Logo / iniciales a la izquierda
  - Toggle **dark/light** (ícono sol/luna) — persiste en localStorage vía `next-themes`
  - Switch **EN/ES** (cambia el locale en la URL: `/en` ⇄ `/es`)
- **Hero**: nombre + tagline + redes sociales (íconos) + email de contacto
- **Galería de proyectos**:
  - Layout masonry animado, columnas a distintas alturas
  - Animación de entrada en scroll (fade + translate suave)
  - Cada card muestra: `cover_image_url` + `title` (en el locale activo) + `tags` (chip pequeño)
  - Click → navega a `/[locale]/projects/[slug]` (no modal)
- **Vista de detalle de proyecto**:
  - Header con `title`, `subtitle`, `tags` (en el locale activo)
  - `description` renderizado como Markdown
  - Carrusel/grid de `gallery_images`
  - Botón "volver a la galería"

### 6.2 Admin (CRUD)

- **`/admin` login**: input de password, compara contra `process.env.ADMIN_PASSWORD`. Si coincide, set cookie HttpOnly firmada (signed JWT simple o similar). TTL: 7 días.
- **Listado** de proyectos con: thumbnail, título, estado (publicado/borrador), acciones (editar/eliminar)
- **Crear/Editar proyecto**:
  - Form con todos los campos del modelo
  - **Tabs por idioma** (EN / ES) para `title`, `subtitle`, `description` — cambiar de tab no pierde datos
  - Upload de `cover_image_url` (un archivo)
  - Upload múltiple de `gallery_images` con reorder (drag & drop)
  - Editor de `description` con preview Markdown lado a lado (o tabs internas)
  - Editor de `tags` (chips, agregar/quitar)
  - Toggle `published` — bloqueado si falta alguna traducción requerida
- **Eliminar**: con confirmación, borra fila + archivos del Storage

---

## 7. Auth admin (detalles)

- Password en `.env.local` como `ADMIN_PASSWORD` (nunca commiteado)
- Cookie de sesión HttpOnly, Secure, SameSite=Lax
- Middleware en `/admin/*` que valida cookie. Si no es válida → redirect a `/admin` (login)
- **Sin recuperación de password** (es hardcoded; si se pierde, se cambia en env y se redeploya)

> Esto es **deliberadamente simple**. No es un SaaS multiusuario. Es un admin para una persona. Si crece, se reemplaza por Supabase Auth.

---

## 8. SEO y metadatos

- `metadata` API de Next.js (`generateMetadata` por locale)
- OpenGraph + Twitter Card por proyecto en ambos idiomas
- `sitemap.xml` autogenerado con entradas por locale (`/en/projects/[slug]` + `/es/projects/[slug]`)
- `<link rel="alternate" hreflang="..."/>` para que Google entienda las versiones
- `robots.txt` con `Disallow: /admin`
- Imagen OG: `cover_image_url` del proyecto
- Dominio canónico: **`https://jdseguraz.com`**

---

## 9. Performance

- Imágenes servidas vía `next/image` (optimización automática)
- Galería pública con `revalidate` (ISR) — ej. `revalidate = 60`
- Storage de Supabase como CDN de imágenes
- Lighthouse target: **≥ 90** en Performance, Accessibility, Best Practices, SEO

---

## 10. No-goals (lo que NO hacemos)

- ❌ Multiusuario / roles
- ❌ Comentarios / likes
- ❌ Analytics propio (puede sumarse Vercel Analytics más adelante)
- ❌ Blog / sistema de posts
- ❌ Migración a otra DB
- ❌ PWA / offline
- ❌ Más de 2 idiomas (sólo EN + ES)
- ❌ Auto-traducción (las traducciones las escribe el admin a mano en ambas tabs)

---

## 11. Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Idioma | **EN + ES** con i18n (locale en URL) y toggle en header |
| Tipografía | **Geist Sans** (paquete `geist` — `geist/font/sans` + `geist/font/mono`) |
| Paleta | **Dark + Light** con toggle en el header (`next-themes`) — defaults: dark mode al estilo Dann Petty (negro/grises) + light mode editorial limpio |
| Dominio | **`jdseguraz.com`** comprado en Hostinger, DNS apuntando a Vercel |
| Markdown | Sí, con syntax highlighting (`rehype-highlight`) |

---

## 12. Roadmap propuesto (fases)

| Fase | Entregable |
|------|------------|
| **0. Setup** | `create-next-app` con `npm`, Tailwind, Geist Sans, `next-themes`, `next-intl`, conexión Supabase, env vars |
| **1. Modelo + Admin mínimo** | Tabla en Supabase con campos `_en`/`_es`, login `/admin` con cookie, CRUD básico sin upload (tabs por idioma) |
| **2. Storage** | Upload de cover + gallery a Supabase Storage |
| **3. Galería pública** | Masonry animado en `/[locale]`, click → `/[locale]/projects/[slug]`, toggle dark/light + EN/ES funcionando |
| **4. Detalle de proyecto** | Render Markdown (con highlight) + galería de imágenes |
| **5. Pulido** | SEO multi-locale, sitemap, OG images, hreflang, performance audit |
| **6. Deploy** | Vercel + env vars + apuntar `jdseguraz.com` desde Hostinger (registros A/CNAME) |

---

## 13. Riesgos

- **Animación de galería**: Framer Motion es potente, pero un masonry animado mal hecho puede dar tirones. Prototipo temprano.
- **Imágenes pesadas**: si subo PNG sin comprimir desde admin, mato performance. Mitigación: validación de tamaño + recomendación de WebP en el form.
- **Password hardcoded**: aceptable para v1, pero documentar que NO debe quedar así para siempre.
- **Doble carga de traducción**: tener que escribir cada proyecto en EN y ES puede ralentizar la subida. Mitigación: permitir guardar como borrador con un solo idioma; bloquear el `published = true` hasta que ambas traducciones estén completas.
- **Flash of unstyled theme**: si el toggle dark/light no se aplica antes del primer paint, se ve un parpadeo. Mitigación: usar `next-themes` con `suppressHydrationWarning` en `<html>` y un script `beforeInteractive`.
