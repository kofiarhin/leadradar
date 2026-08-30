import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchCampaign } from '../api/campaigns';

export function CampaignDetailPage(): ReactElement {
  const { campaignId = '' } = useParams();
  const campaign = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => fetchCampaign(campaignId),
    enabled: Boolean(campaignId),
    retry: false,
    refetchInterval: (query) =>
      ['DISCOVERING', 'PROCESSING'].includes(query.state.data?.status ?? '') ? 5_000 : false,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">Campaign</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {campaign.data?.name ?? 'Loading campaign…'}
            </h1>
          </div>
          <Link to="/" className="text-sm font-medium text-slate-700 underline">Dashboard</Link>
        </div>

        {campaign.isError ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">Campaign could not be loaded.</p>
        ) : campaign.data ? (
          <>
            <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3">
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 font-medium text-slate-900">{campaign.data.status}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Signals</p><p className="mt-1 font-medium text-slate-900">{campaign.data.metricsSnapshot.signals}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Apify run</p><p className="mt-1 break-all text-sm text-slate-700">{campaign.data.discovery?.runId ?? 'Queued'}</p></div>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">Source post</h2>
              <a href={campaign.data.source.postUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-blue-700 underline">{campaign.data.source.postUrl}</a>
              {campaign.data.discovery?.errorCode ? <p role="alert" className="mt-4 text-sm text-red-700">Discovery failed: {campaign.data.discovery.errorCode}</p> : null}
              {['DISCOVERING', 'PROCESSING'].includes(campaign.data.status) ? <p role="status" className="mt-4 text-sm text-slate-600">LeadRadar is processing public comments in the background.</p> : null}
            </section>
          </>
        ) : (
          <p role="status" className="text-sm text-slate-600">Loading…</p>
        )}
      </div>
    </main>
  );
}
