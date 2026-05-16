'use client';

/**
 * Publish toggle checkbox — client component.
 * ADR-22: NO next-intl. English-only.
 * ADR-20: Disabled (with tooltip) when validateForPublish returns errors.
 * Calls validateForPublish client-side as a UX hint; server enforces authoritative check.
 */

import { validateForPublish, type ProjectInput } from '@/lib/projects/validation';

type Props = {
  fields: ProjectInput;
  value: boolean;
  onChange: (next: boolean) => void;
};

export default function PublishToggle({ fields, value, onChange }: Props) {
  const validation = validateForPublish(fields);
  const canPublish = validation.ok;
  const missingFields = !validation.ok
    ? Object.keys(validation.errors)
    : [];

  const isDisabled = !canPublish && !value; // can always unpublish

  const tooltipText = isDisabled
    ? `Complete required fields to publish: ${missingFields.join(', ')}`
    : undefined;

  return (
    <div className="flex items-center gap-3">
      <div className="relative" title={tooltipText}>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={value}
            disabled={isDisabled}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border disabled:opacity-40"
            aria-label="Publish this project"
          />
          <span className={`text-sm font-medium ${isDisabled ? 'opacity-40' : ''}`}>
            {value ? 'Published' : 'Draft'}
          </span>
        </label>
      </div>

      {isDisabled && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Missing: {missingFields.join(', ')}
        </p>
      )}
    </div>
  );
}
