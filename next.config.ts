import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // FR-82, ADR-31: 5MB limit to allow uploads up to MAX_FILE_SIZE_BYTES (5_242_880).
      // Next.js default is 1MB — without this, uploads >1MB get a 413 before the SA runs.
      bodySizeLimit: '5mb',
    },
  },
};

export default withNextIntl(nextConfig);
