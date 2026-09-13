import { useMutation, useQuery } from '@tanstack/react-query';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { createCampaign } from '../api/campaigns';
import { fetchVerticalProfile } from '../api/vertical-profile';

const fieldClassName =
  'rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus';

export function NewCampaignPage(): ReactElement {
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ['vertical-profile'], queryFn: fetchVerticalProfile, retry: false });
  const [name, setName] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const mutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: async (campaign) => navigate(`/campaigns/${campaign.id}`),
  });

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await mutation.mutateAsync({ name, postUrl });
  }

  return (
    <main className="min-h-screen bg-app-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Campaign</p>
            <h1 className="text-2xl font-semibold text-foreground">Find prospects</h1>
          </div>
          <Link
            to="/"
            className="text-sm font-medium text-foreground-secondary underline hover:text-foreground focus:outline-none focus:ring-2 focus:ring-focus"
          >
            Back
          </Link>
        </div>

        <section className="rounded-lg border border-border bg-surface p-6">
          <p className="mb-4 text-sm text-muted">
            Active vertical: {profile.data?.name ?? 'Configure your vertical profile first.'}
          </p>
          <form className="space-y-4" onSubmit={submit}>
            <label className="grid gap-1 text-sm text-foreground-secondary">
              Campaign name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-1 text-sm text-foreground-secondary">
              Public LinkedIn post URL
              <input
                required
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.linkedin.com/posts/..."
                className={fieldClassName}
              />
            </label>
            {mutation.isError ? (
              <p role="alert" className="text-sm text-danger">
                Campaign could not be created.
              </p>
            ) : null}
            <button
              disabled={mutation.isPending || !profile.data}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? 'Starting discovery…' : 'Find Prospects'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
