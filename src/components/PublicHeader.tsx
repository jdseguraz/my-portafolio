/**
 * PublicHeader — Server Component
 * FR-122, FR-123, FR-124, ADR-48
 *
 * Renders the global public header: Logo (left) + LocaleSwitcher + ThemeToggle (right).
 * Lives inside NextIntlClientProvider in [locale]/layout.tsx so client sub-components
 * (LocaleSwitcher, ThemeToggle) have access to the intl context.
 */
import { getTranslations } from 'next-intl/server';
import Logo from '@/components/Logo';
import LocaleSwitcher from '@/components/locale-switcher';
import ThemeToggle from '@/components/theme-toggle';

export default async function PublicHeader() {
  const t = await getTranslations('header');

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-foreground/10">
      <Logo ariaLabel={t('logoAlt')} />
      <div className="flex items-center gap-2 sm:gap-3">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
