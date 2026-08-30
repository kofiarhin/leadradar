import { useMutation, useQuery } from '@tanstack/react-query';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { createCampaign } from '../api/campaigns';
import { fetchVerticalProfile } from '../api/vertical-profile';

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
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">Campaign</p>
            <h1 className="text-2xl font-semibold text-slate-900">Find prospects</h1>
          </div>
          <Link to="/" className="text-sm font-medium text-slate-700 underline">Back</Link>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="mb-4 text-sm text-slate-600">
            Active vertical: {profile.data?.name ?? 'Configure your vertical profile first.'}
          </p>
          <form className="space-y-4" onSubmit={submit}>
            <label className="grid gap-1 text-sm text-slate-700">
              Campaign name
              <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              Public LinkedIn post URL
              <input required type="url" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/..." className="rounded-md border border-slate-300 px-3 py-2" />
            </label>
            {mutation.isError ? <p role="alert" className="text-sm text-red-700">Campaign could not be created.</p> : null}
            <button disabled={mutation.isPending || !profile.data} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {mutation.isPending ? 'Starting discovery…' : 'Find Prospects'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
