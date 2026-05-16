/**
 * Admin new project page — server component.
 * ADR-22: NO next-intl. English-only.
 * Renders <ProjectForm mode="create"> with empty initial state.
 */
import ProjectForm from '@/components/admin/ProjectForm';
import { createProject } from '../actions';

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New project</h1>
        <p className="text-sm opacity-60 mt-1">Fill in the details below to create a new project.</p>
      </div>
      <ProjectForm mode="create" action={createProject} />
    </div>
  );
}
