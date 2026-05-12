/**
 * Hero — Server Component data wrapper.
 * FR-108, FR-109, ADR-46, ADR-47
 *
 * Reads translations server-side via getTranslations('hero').
 * Imports profile constants from src/lib/profile.ts.
 * Passes resolved serializable props to HeroMotion (Client Component).
 */

import { getTranslations } from 'next-intl/server';
import { profile } from '@/lib/profile';
import HeroMotion from '@/components/HeroMotion';

export default async function Hero() {
  const t = await getTranslations('hero');

  return (
    <HeroMotion
      title={t('title')}
      tagline={t('tagline')}
      name={profile.name}
      email={profile.email}
      githubUrl={profile.githubUrl}
      linkedinUrl={profile.linkedinUrl}
    />
  );
}
