/**
 * Server Component — empty gallery state.
 * FR-117b, ADR-51
 *
 * No 'use client' — this is a Server Component.
 * Renders a localized message when no published projects exist.
 * No CTA, no animation (ADR-51: keep it minimal).
 */
import { getTranslations } from 'next-intl/server';

export default async function EmptyState() {
  const t = await getTranslations('gallery');

  return (
    <section className="text-center py-24">
      <p className="text-lg text-muted-foreground">{t('empty')}</p>
    </section>
  );
}
