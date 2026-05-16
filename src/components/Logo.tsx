/**
 * Logo — Server Component
 * FR-122, ADR-47
 *
 * Renders the portfolio initials/name as a home link.
 * ariaLabel is passed from the parent (PublicHeader) which fetches the translation.
 */
import { Link } from '@/i18n/navigation';

interface LogoProps {
  ariaLabel: string;
}

export default function Logo({ ariaLabel }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label={ariaLabel}
      className="text-base font-semibold tracking-tight hover:opacity-70 transition-opacity"
    >
      David Segura
    </Link>
  );
}
