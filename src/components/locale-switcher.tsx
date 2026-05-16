'use client';

import { useLocale } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const target = locale === 'en' ? 'es' : 'en';

  return (
    <Link
      href={pathname}
      locale={target}
      aria-label={`Switch to ${target.toUpperCase()}`}
      className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-w-[2.25rem]"
    >
      {target.toUpperCase()}
    </Link>
  );
}
