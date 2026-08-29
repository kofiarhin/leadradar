import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UpdateVerticalProfileRequest } from '@leadradar/shared';

import { fetchVerticalProfile, saveVerticalProfile } from '../api/vertical-profile';
import { fetchWorkspace } from '../api/workspace';
import { useLogout } from '../features/auth/useLogin';

const verticalProfileQueryKey = ['vertical-profile'] as const;

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function DashboardPage(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const workspace = useQuery({ queryKey: ['workspace'], queryFn: fetchWorkspace, retry: false });
  const profile = useQuery({
    queryKey: verticalProfileQueryKey,
    queryFn: fetchVerticalProfile,
    retry: false,
  });

  const [name, setName] = useState('Primary ICP');
  const [offer, setOffer] = useState('');
  const [roles, setRoles] = useState('');
  const [industries, setIndustries] = useState('');
  const [regions, setRegions] = useState('');
  const [positiveSignals, setPositiveSignals] = useState('');
  const [negativeSignals, setNegativeSignals] = useState('');
  const [tone, setTone] = useState('Concise, relevant and professional');

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name);
    setOffer(profile.data.offer);
    setRoles(profile.data.targetRoles.join(', '));
    setIndustries(profile.data.targetIndustries.join(', '));
    setRegions(profile.data.targetRegions.join(', '));
    setPositiveSignals(profile.data.positiveSignals.join(', '));
    setNegativeSignals(profile.data.negativeSignals.join(', '));
    setTone(profile.data.outreachTone);
  }, [profile.data]);

  const saveMutation = useMutation({
    mutationFn: saveVerticalProfile,
    onSuccess: async (saved) => {
      queryClient.setQueryData(verticalProfileQueryKey, saved);
      await queryClient.invalidateQueries({ queryKey: verticalProfileQueryKey });
    },
  });

  async function handleSignOut(): Promise<void> {
    await logoutMutation.mutateAsync();
    await navigate('/login', { replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input: UpdateVerticalProfileRequest = {
      name,
      offer,
      targetRoles: splitList(roles),
      targetIndustries: splitList(industries),
      targetRegions: splitList(regions),
      positiveSignals: splitList(positiveSignals),
      negativeSignals: splitList(negativeSignals),
      outreachGoal: 'BOOK_CALL',
      outreachTone: tone,
    };
    await saveMutation.mutateAsync(input);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">Workspace</p>
            {workspace.isPending ? (
              <p role="status" aria-live="polite" className="text-sm text-slate-600">Loading…</p>
            ) : workspace.isError ? (
              <p role="alert" className="text-sm text-red-700">The workspace could not be loaded.</p>
            ) : (
              <h1 className="text-2xl font-semibold text-slate-900">{workspace.data.name}</h1>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={logoutMutation.isPending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-60"
          >
            {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Vertical profile</h2>
            <p className="mt-1 text-sm text-slate-600">
              Define who LeadRadar should qualify and what the outreach is trying to achieve.
            </p>
          </div>

          {profile.isPending ? (
            <p role="status" aria-live="polite" className="text-sm text-slate-600">Loading profile…</p>
          ) : profile.isError ? (
            <p role="alert" className="text-sm text-red-700">The vertical profile could not be loaded.</p>
          ) : (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-1 text-sm text-slate-700">
                Profile name
                <input value={name} onChange={(e) => setName(e.target.value)} required className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Outreach tone
                <input value={tone} onChange={(e) => setTone(e.target.value)} required className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                Offer
                <textarea value={offer} onChange={(e) => setOffer(e.target.value)} required rows={3} className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Target roles
                <input value={roles} onChange={(e) => setRoles(e.target.value)} required placeholder="Founder, Head of Sales" className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Target industries
                <input value={industries} onChange={(e) => setIndustries(e.target.value)} required placeholder="SaaS, Agencies" className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                Target regions
                <input value={regions} onChange={(e) => setRegions(e.target.value)} required placeholder="United Kingdom, United States" className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Positive signals
                <textarea value={positiveSignals} onChange={(e) => setPositiveSignals(e.target.value)} required rows={3} placeholder="Hiring salespeople, discussing pipeline" className="rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Negative signals
                <textarea value={negativeSignals} onChange={(e) => setNegativeSignals(e.target.value)} required rows={3} placeholder="Student, recruiter, direct competitor" className="rounded-md border border-slate-300 px-3 py-2" />
              </label>

              <div className="flex items-center gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Saving…' : profile.data ? 'Save changes' : 'Create profile'}
                </button>
                {saveMutation.isSuccess ? <p role="status" className="text-sm text-green-700">Profile saved.</p> : null}
                {saveMutation.isError ? <p role="alert" className="text-sm text-red-700">The profile could not be saved.</p> : null}
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
