/**
 * Dynamic OG image for homepage — /[locale]/opengraph-image
 * FR-181, ADR-70, ADR-71, NFR-41
 *
 * Returns a 1200×630 PNG rendered with Satori/ImageResponse.
 * Locale-aware tagline (EN/ES inline — no messages.json dependency).
 *
 * Font strategy (ADR-71): tryLoadGeist() attempts to load Geist-Regular.ttf
 * from node_modules. On failure (Vercel lambda missing path), falls back to
 * no custom font — ImageResponse renders with its default font. Never throws.
 */
import { ImageResponse } from 'next/og';
import { profile } from '@/lib/profile';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function tryLoadGeist(): Promise<Buffer | null> {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    return await fs.readFile(
      path.join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf'),
    );
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const tagline =
    locale === 'es'
      ? 'Construyendo productos digitales con intención'
      : 'Building thoughtful digital products';

  const fontData = await tryLoadGeist();

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)',
          padding: '80px',
        }}
      >
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 24px 0',
            letterSpacing: '-2px',
            textAlign: 'center',
            fontFamily: fontData ? 'Geist' : 'sans-serif',
          }}
        >
          {profile.name}
        </h1>
        <p
          style={{
            fontSize: '32px',
            color: 'rgba(255,255,255,0.65)',
            margin: 0,
            textAlign: 'center',
            maxWidth: '800px',
            fontFamily: fontData ? 'Geist' : 'sans-serif',
          }}
        >
          {tagline}
        </p>
      </div>
    ),
    fontData
      ? {
          ...size,
          fonts: [{ name: 'Geist', data: fontData, style: 'normal' }],
        }
      : { ...size },
  );
}
