import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // FR-82, ADR-31: 5MB limit to allow uploads up to MAX_FILE_SIZE_BYTES (5_242_880).
      // Next.js default is 1MB — without this, uploads >1MB get a 413 before the SA runs.
      bodySizeLimit: '5mb',
    },
  },
  // FR-125, ADR-45: Allow Next.js <Image> to serve Supabase Storage URLs.
  // Pathname scoped to public-bucket path only — private/signed routes excluded.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // TODO Fase 5/6 cleanup: temporary picsum.photos allowance for seeded test
      // projects. Remove before production deploy once real cover/gallery images
      // are uploaded via the admin UI.
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        pathname: '/**',
      },
    ],
  },
};

export default withAnalyzer(withNextIntl(nextConfig));
