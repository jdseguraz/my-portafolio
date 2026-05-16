'use client';

/**
 * Delete project button — client component.
 * ADR-22: NO next-intl. English-only.
 * Calls window.confirm() before invoking the deleteProject Server Action.
 */

import { deleteProject } from '@/app/(admin)/admin/projects/actions';

type Props = {
  id: string;
};

export default function DeleteButton({ id }: Props) {
  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this project? This cannot be undone.',
    );
    if (!confirmed) return;

    // TODO: Storage cleanup deferred to fase 2 (cover + gallery images).
    await deleteProject(id);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="text-xs text-red-600 underline underline-offset-2 hover:opacity-70"
    >
      Delete
    </button>
  );
}
