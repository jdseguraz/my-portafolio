/**
 * Admin project list page — server component.
 * ADR-22: NO next-intl. English-only.
 * Reads via createAdminClient() (service role bypasses RLS — shows drafts too).
 */
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocalizedField } from '@/lib/i18n/fallback';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function AdminProjectsPage() {
  const supabase = createAdminClient();
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('display_order');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Link
          href="/admin/projects/new"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
        >
          New project
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          Failed to load projects: {error.message}
        </p>
      )}

      {!error && (!projects || projects.length === 0) && (
        <p className="text-sm opacity-60">No projects yet. Create one to get started.</p>
      )}

      {projects && projects.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left opacity-60">
                <th className="pb-2 pr-4 font-medium">Title (EN | ES)</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Slug</th>
                <th className="pb-2 pr-4 font-medium">Updated</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <span className="font-medium">
                      {getLocalizedField(project, 'title', 'en') || (
                        <em className="opacity-40">(untitled)</em>
                      )}
                    </span>
                    {project.title_en && project.title_es && (
                      <>
                        {' | '}
                        <span className="opacity-70">{project.title_es}</span>
                      </>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        project.published
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {project.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs opacity-70">{project.slug}</td>
                  <td className="py-3 pr-4 text-xs opacity-60">
                    {new Date(project.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/projects/${project.id}/edit`}
                        className="text-xs underline underline-offset-2 hover:opacity-70"
                      >
                        Edit
                      </Link>
                      <DeleteButton id={project.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
