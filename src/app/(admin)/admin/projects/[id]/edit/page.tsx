/**
 * Admin edit project page — server component.
 * ADR-22: NO next-intl. English-only.
 * ADR-27: params typed as Promise<{id:string}> per Next 16 async dynamic API.
 */
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import ProjectForm from '@/components/admin/ProjectForm';
import { updateProject } from '../../actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit project</h1>
        <p className="text-sm opacity-60 mt-1 font-mono">{data.slug}</p>
      </div>
      <ProjectForm
        mode="edit"
        initial={data}
        projectId={id}
        action={updateProject.bind(null, id)}
      />
    </div>
  );
}
