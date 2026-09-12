import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { UpdateVerticalProfileRequest } from '@leadradar/shared';

import { fetchCampaigns } from '../api/campaigns';
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

const fieldClassName =
  'rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus';
const secondaryButtonClassName =
  'rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-app-background';

export function DashboardPage(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const workspace = useQuery({ queryKey: ['workspace'], queryFn: fetchWorkspace, retry: false });
  const profile = useQuery({ queryKey: verticalProfileQueryKey, queryFn: fetchVerticalProfile, retry: false });
  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: fetchCampaigns, retry: false });

  const totals = useMemo(() => {
    const rows = campaigns.data ?? [];
    return rows.reduce(
      (acc, campaign) => ({
        activeCampaigns: acc.activeCampaigns + (['DISCOVERING', 'PROCESSING', 'READY_FOR_REVIEW', 'APPROVED', 'SENDING'].includes(campaign.status) ? 1 : 0),
        qualified: acc.qualified + campaign.metricsSnapshot.qualified,
        verified: acc.verified + campaign.metricsSnapshot.verified,
        replies: acc.replies + campaign.metricsSnapshot.replies,
        opportunities: acc.opportunities + campaign.metricsSnapshot.opportunities,
        readyToBook: acc.readyToBook + campaign.metricsSnapshot.readyToBook,
        booked: acc.booked + campaign.metricsSnapshot.booked,
      }),
      { activeCampaigns: 0, qualified: 0, verified: 0, replies: 0, opportunities: 0, readyToBook: 0, booked: 0 },
    );
  }, [campaigns.data]);

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
    <main className="min-h-screen bg-app-background px-4 py-10 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Workspace</p>
            {workspace.isPending ? (
              <p role="status" aria-live="polite" className="text-sm text-muted">Loading…</p>
            ) : workspace.isError ? (
              <p role="alert" className="text-sm text-danger">The workspace could not be loaded.</p>
            ) : (
              <h1 className="text-2xl font-semibold text-foreground">{workspace.data.name}</h1>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/leads" className={secondaryButtonClassName}>Leads</Link>
            <Link to="/opportunities" className={secondaryButtonClassName}>Opportunities</Link>
            <Link to="/campaigns/new" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-app-background">New campaign</Link>
            <button type="button" onClick={handleSignOut} disabled={logoutMutation.isPending} className={`${secondaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-60`}>{logoutMutation.isPending ? 'Signing out…' : 'Sign out'}</button>
          </div>
        </header>

        <section aria-label="Outcome metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Active campaigns', totals.activeCampaigns],
            ['Qualified prospects', totals.qualified],
            ['Verified prospects', totals.verified],
            ['Replies', totals.replies],
            ['Positive opportunities', totals.opportunities],
            ['Ready to book', totals.readyToBook],
            ['Booked calls', totals.booked],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-foreground">Recent campaigns</h2><p className="text-sm text-muted">Public LinkedIn discovery runs and processing state.</p></div>
          </div>
          {campaigns.isPending ? <p role="status" className="text-sm text-muted">Loading campaigns…</p> : campaigns.isError ? <p role="alert" className="text-sm text-danger">Campaigns could not be loaded.</p> : campaigns.data.length === 0 ? <p className="text-sm text-muted">No campaigns yet.</p> : <ul className="divide-y divide-border">{campaigns.data.slice(0, 5).map((campaign) => <li key={campaign.id} className="flex items-center justify-between gap-4 py-3"><div><Link to={`/campaigns/${campaign.id}`} className="font-medium text-foreground underline">{campaign.name}</Link><p className="text-xs text-muted">{campaign.status}</p></div><span className="text-sm text-foreground-secondary">{campaign.metricsSnapshot.signals} signals</span></li>)}</ul>}
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-5"><h2 className="text-lg font-semibold text-foreground">Vertical profile</h2><p className="mt-1 text-sm text-muted">Define who LeadRadar should qualify and what the outreach is trying to achieve.</p></div>
          {profile.isPending ? <p role="status" className="text-sm text-muted">Loading profile…</p> : profile.isError ? <p role="alert" className="text-sm text-danger">The vertical profile could not be loaded.</p> : (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-1 text-sm text-foreground-secondary">Profile name<input value={name} onChange={(e) => setName(e.target.value)} required className={fieldClassName} /></label>
              <label className="grid gap-1 text-sm text-foreground-secondary">Outreach tone<input value={tone} onChange={(e) => setTone(e.target.value)} required className={fieldClassName} /></label>
              <label className="grid gap-1 text-sm text-foreground-secondary md:col-span-2">Offer<textarea value={offer} onChange={(e) => setOffer(e.target.value)} required rows={3} className={fieldClassName} /></label>
              <label className="grid gap-1 text-sm text-foreground-secondary">Target roles<input value={roles} onChange={(e) => setRoles(e.target.value)} required placeholder="Founder, Head of Sales" className={fieldClassName} /></label>
              <label className="grid gap-1 text-sm text-foreground-secondary">Target industries<input value={industries} onChange={(e) => setIndustries(e.target.value)} required placeholder="SaaS, Agencies" className={fieldClassName} /></label>
              <label className="grid gap-1 text-sm text-foreground-secondary md:col-span-2">Target regions<input value={regions} onChange={(e) => setRegions(e.target.value)} required placeholder="United Kingdom, United States" className={fieldClassName} /></label>
              <label className="grid gap-1 text-sm text-foreground-secondary">Positive signals<textarea value={positiveSignals} onChange={(e) => setPositiveSignals(e.target.value)} required rows={3} placeholder="Hiring salespeople, discussing pipeline" className={fieldClassName} /></label>
              <label className="grid gap-1 text-sm text-foreground-secondary">Negative signals<textarea value={negativeSignals} onChange={(e) => setNegativeSignals(e.target.value)} required rows={3} placeholder="Student, recruiter, direct competitor" className={fieldClassName} /></label>
              <div className="flex items-center gap-3 md:col-span-2"><button type="submit" disabled={saveMutation.isPending} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60">{saveMutation.isPending ? 'Saving…' : profile.data ? 'Save changes' : 'Create profile'}</button>{saveMutation.isSuccess ? <p role="status" className="rounded-md bg-success-surface px-2 py-1 text-sm text-success">Profile saved.</p> : null}{saveMutation.isError ? <p role="alert" className="rounded-md bg-danger-surface px-2 py-1 text-sm text-danger">The profile could not be saved.</p> : null}</div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
