'use client';

/**
 * Project create/edit form — client component.
 * ADR-24: EN/ES tabs use hidden attribute (no remount). Both locales in useState.
 * ADR-22: NO next-intl. English-only.
 * ADR-19: Client pre-fills slug on title_en blur (server cleanses on submit).
 *
 * Submit strategy: approach (a) — hidden <input> mirrors of React state so
 * FormData is populated correctly when the native form submits. This avoids
 * any Server Action signature changes and keeps FormData as the wire format.
 */

import { useState, useRef, useEffect } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MarkdownEditor from './MarkdownEditor';
import TagsEditor from './TagsEditor';
import PublishToggle from './PublishToggle';
import CoverUploader from './CoverUploader';
import GalleryUploader from './GalleryUploader';
import { slugify } from '@/lib/projects/slug';
import type { Database } from '@/lib/supabase/database.types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

type LocaleData = {
  title: string;
  subtitle: string;
  description: string;
};

type FormState = {
  en: LocaleData;
  es: LocaleData;
  slug: string;
  tags: string[];
  display_order: number;
  cover_image_url: string;
  gallery_images: string[];
  published: boolean;
  live_url: string;
  repo_url: string;
};

type ActionResult =
  | { ok: true; data: { id: string } }
  | { ok: false; errors: Record<string, string> }
  | null;

type Props = {
  initial?: Partial<ProjectRow> | null;
  action: (formData: FormData) => Promise<ActionResult>;
  mode: 'create' | 'edit';
  projectId?: string | null;
};

function defaultState(initial?: Partial<ProjectRow> | null): FormState {
  return {
    en: {
      title: initial?.title_en ?? '',
      subtitle: initial?.subtitle_en ?? '',
      description: initial?.description_en ?? '',
    },
    es: {
      title: initial?.title_es ?? '',
      subtitle: initial?.subtitle_es ?? '',
      description: initial?.description_es ?? '',
    },
    slug: initial?.slug ?? '',
    tags: initial?.tags ?? [],
    display_order: initial?.display_order ?? 0,
    cover_image_url: initial?.cover_image_url ?? '',
    gallery_images: initial?.gallery_images ?? [],
    published: initial?.published ?? false,
    live_url: initial?.live_url ?? '',
    repo_url: initial?.repo_url ?? '',
  };
}

export default function ProjectForm({ initial, action, mode, projectId = null }: Props) {
  const [state, setState] = useState<FormState>(defaultState(initial));
  const [tab, setTab] = useState<'en' | 'es'>('en');
  const slugTouched = useRef(false);

  // Submit strategy: use the native FormData (so file inputs from CoverUploader
  // and GalleryUploader flow through naturally) and overlay React state on top.
  // `set` is used so re-submits don't accumulate duplicate text fields.
  async function handleAction(_prev: ActionResult, nativeFormData: FormData): Promise<ActionResult> {
    nativeFormData.set('title_en', state.en.title);
    nativeFormData.set('title_es', state.es.title);
    nativeFormData.set('subtitle_en', state.en.subtitle);
    nativeFormData.set('subtitle_es', state.es.subtitle);
    nativeFormData.set('description_en', state.en.description);
    nativeFormData.set('description_es', state.es.description);
    nativeFormData.set('slug', state.slug);
    nativeFormData.set('tags', JSON.stringify(state.tags));
    nativeFormData.set('display_order', String(state.display_order));
    nativeFormData.set('cover_image_url', state.cover_image_url);
    nativeFormData.set('gallery_images', JSON.stringify(state.gallery_images));
    nativeFormData.set('published', String(state.published));
    nativeFormData.set('live_url', state.live_url);
    nativeFormData.set('repo_url', state.repo_url);
    // Native multi-file <input name="gallery"> entries remain intact via FormData.getAll('gallery').
    // Native <input name="cover"> file remains intact via FormData.get('cover').
    return await action(nativeFormData);
  }

  const [result, formAction, pending] = useActionState<ActionResult, FormData>(
    handleAction,
    null,
  );

  // After a successful create, navigate to the new project's edit page so the
  // user sees the persisted state (uploaded cover/gallery URLs, real DB id)
  // instead of being stranded on /new with stale blob previews.
  const router = useRouter();
  useEffect(() => {
    if (mode === 'create' && result?.ok && result.data?.id) {
      router.push(`/admin/projects/${result.data.id}/edit`);
    }
  }, [mode, result, router]);

  function handleTitleEnBlur() {
    if (!slugTouched.current && state.en.title) {
      setState((s) => ({ ...s, slug: slugify(s.en.title) }));
    }
  }

  function setEn(partial: Partial<LocaleData>) {
    setState((s) => ({ ...s, en: { ...s.en, ...partial } }));
  }

  function setEs(partial: Partial<LocaleData>) {
    setState((s) => ({ ...s, es: { ...s.es, ...partial } }));
  }

  const publishFields = {
    title_en: state.en.title,
    title_es: state.es.title,
    subtitle_en: state.en.subtitle,
    subtitle_es: state.es.subtitle,
    description_en: state.en.description,
    description_es: state.es.description,
    slug: state.slug,
    cover_image_url: state.cover_image_url, // FR-96: cover is now required to publish
  };

  const globalError =
    result && !result.ok && result.errors._form ? result.errors._form : null;
  const fieldError = (key: string) =>
    result && !result.ok ? result.errors[key] : undefined;

  return (
    <form action={formAction} className="space-y-8 max-w-3xl">
      {/* Locale tabs */}
      <div className="space-y-4">
        <div className="flex gap-1 border-b pb-1 text-sm">
          <button
            type="button"
            onClick={() => setTab('en')}
            aria-pressed={tab === 'en'}
            className={`px-4 py-1.5 rounded-t font-medium transition-colors ${
              tab === 'en' ? 'bg-foreground text-background' : 'opacity-60 hover:opacity-90'
            }`}
          >
            English (EN)
          </button>
          <button
            type="button"
            onClick={() => setTab('es')}
            aria-pressed={tab === 'es'}
            className={`px-4 py-1.5 rounded-t font-medium transition-colors ${
              tab === 'es' ? 'bg-foreground text-background' : 'opacity-60 hover:opacity-90'
            }`}
          >
            Spanish (ES)
          </button>
        </div>

        {/* EN tab — ADR-24: hidden attr keeps DOM mounted, preserving state */}
        <div hidden={tab !== 'en'} className="space-y-4">
          <Field label="Title (EN)" error={fieldError('title_en')}>
            <input
              type="text"
              value={state.en.title}
              onChange={(e) => setEn({ title: e.target.value })}
              onBlur={handleTitleEnBlur}
              className="input-base"
              placeholder="Project title"
            />
          </Field>
          <Field label="Subtitle (EN)" error={fieldError('subtitle_en')}>
            <input
              type="text"
              value={state.en.subtitle}
              onChange={(e) => setEn({ subtitle: e.target.value })}
              className="input-base"
              placeholder="Short description"
            />
          </Field>
          <Field label="Description (EN)" error={fieldError('description_en')}>
            <MarkdownEditor
              value={state.en.description}
              onChange={(v) => setEn({ description: v })}
            />
          </Field>
        </div>

        {/* ES tab */}
        <div hidden={tab !== 'es'} className="space-y-4">
          <Field label="Title (ES)" error={fieldError('title_es')}>
            <input
              type="text"
              value={state.es.title}
              onChange={(e) => setEs({ title: e.target.value })}
              className="input-base"
              placeholder="Título del proyecto"
            />
          </Field>
          <Field label="Subtitle (ES)" error={fieldError('subtitle_es')}>
            <input
              type="text"
              value={state.es.subtitle}
              onChange={(e) => setEs({ subtitle: e.target.value })}
              className="input-base"
              placeholder="Descripción corta"
            />
          </Field>
          <Field label="Description (ES)" error={fieldError('description_es')}>
            <MarkdownEditor
              value={state.es.description}
              onChange={(v) => setEs({ description: v })}
            />
          </Field>
        </div>
      </div>

      {/* Shared fields */}
      <div className="space-y-4 border-t pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60">Shared</h2>

        <Field label="Slug" error={fieldError('slug')}>
          <input
            type="text"
            value={state.slug}
            onChange={(e) => {
              slugTouched.current = true;
              setState((s) => ({ ...s, slug: e.target.value }));
            }}
            className="input-base font-mono"
            placeholder="url-friendly-slug"
          />
          <p className="text-xs opacity-50 mt-1">
            Auto-filled from EN title. Server cleanses on save.
          </p>
        </Field>

        <Field label="Tags">
          <TagsEditor
            value={state.tags}
            onChange={(tags) => setState((s) => ({ ...s, tags }))}
          />
        </Field>

        <Field label="Display order">
          <input
            type="number"
            value={state.display_order}
            onChange={(e) =>
              setState((s) => ({ ...s, display_order: parseInt(e.target.value, 10) || 0 }))
            }
            className="input-base w-24"
            min={0}
          />
        </Field>

        <Field label="Live URL (optional)" error={fieldError('live_url')}>
          <input
            type="url"
            value={state.live_url}
            onChange={(e) => setState((s) => ({ ...s, live_url: e.target.value }))}
            className="input-base"
            placeholder="https://example.com"
            inputMode="url"
          />
          <p className="text-xs opacity-50 mt-1">
            Production URL of the real site. Shown as an external-link icon on the gallery card and a button on the project detail page. Leave empty to hide.
          </p>
        </Field>

        <Field label="Repo URL (optional)" error={fieldError('repo_url')}>
          <input
            type="url"
            value={state.repo_url}
            onChange={(e) => setState((s) => ({ ...s, repo_url: e.target.value }))}
            className="input-base"
            placeholder="https://github.com/user/repo"
            inputMode="url"
          />
          <p className="text-xs opacity-50 mt-1">
            Source-code repository URL. Shown as a GitHub icon on the gallery card and a secondary &quot;View source&quot; button on the project detail page. Leave empty to hide.
          </p>
        </Field>

        <Field label="Cover image" error={fieldError('cover_image_url')}>
          <CoverUploader
            projectId={projectId}
            value={state.cover_image_url || null}
            onChange={(url) => setState((s) => ({ ...s, cover_image_url: url }))}
          />
        </Field>

        <Field label="Gallery images">
          <GalleryUploader
            projectId={projectId}
            value={state.gallery_images}
            onChange={(urls) => setState((s) => ({ ...s, gallery_images: urls }))}
          />
        </Field>
      </div>

      {/* Publish toggle */}
      <div className="border-t pt-6">
        <PublishToggle
          fields={publishFields}
          value={state.published}
          onChange={(v) => setState((s) => ({ ...s, published: v }))}
        />
      </div>

      {/* Global error */}
      {globalError && (
        <p className="text-sm text-red-600" role="alert">
          {globalError}
        </p>
      )}

      {/* Success feedback */}
      {result?.ok && (
        <p className="text-sm text-green-600" role="status">
          Saved successfully.
        </p>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4 border-t pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-6 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? 'Saving…' : mode === 'create' ? 'Create project' : 'Save changes'}
        </button>
        <Link href="/admin/projects" className="text-sm underline underline-offset-2 opacity-70 hover:opacity-100">
          Cancel
        </Link>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Simple field wrapper with label + optional error message
// ---------------------------------------------------------------------------
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
