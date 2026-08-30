import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  approveCampaign,
  fetchCampaign,
  generateCampaignSequence,
  updateCampaignSequence,
} from '../api/campaigns';

export function CampaignDetailPage(): ReactElement {
  const { campaignId = '' } = useParams();
  const queryClient = useQueryClient();
  const campaign = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => fetchCampaign(campaignId),
    enabled: Boolean(campaignId),
    retry: false,
    refetchInterval: (query) =>
      ['DISCOVERING', 'PROCESSING'].includes(query.state.data?.status ?? '') ? 5_000 : false,
  });
  const [steps, setSteps] = useState<Array<{ order: number; delayDays: number; subject?: string; body: string }>>([]);

  useEffect(() => {
    if (campaign.data) setSteps(campaign.data.sequence.steps);
  }, [campaign.data]);

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
  };
  const generate = useMutation({ mutationFn: () => generateCampaignSequence(campaignId), onSuccess: refresh });
  const save = useMutation({ mutationFn: () => updateCampaignSequence(campaignId, { steps }), onSuccess: refresh });
  const approve = useMutation({ mutationFn: () => approveCampaign(campaignId), onSuccess: refresh });

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
            <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-4">
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 font-medium text-slate-900">{campaign.data.status}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Signals</p><p className="mt-1 font-medium text-slate-900">{campaign.data.metricsSnapshot.signals}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Qualified</p><p className="mt-1 font-medium text-slate-900">{campaign.data.metricsSnapshot.qualified}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Eligible</p><p className="mt-1 font-medium text-slate-900">{campaign.data.metricsSnapshot.eligible}</p></div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">Source post</h2>
              <a href={campaign.data.source.postUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-blue-700 underline">{campaign.data.source.postUrl}</a>
              {campaign.data.discovery?.errorCode ? <p role="alert" className="mt-4 text-sm text-red-700">Discovery failed: {campaign.data.discovery.errorCode}</p> : null}
              {['DISCOVERING', 'PROCESSING'].includes(campaign.data.status) ? <p role="status" className="mt-4 text-sm text-slate-600">LeadRadar is processing public comments in the background.</p> : null}
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-semibold text-slate-900">Outreach sequence</h2><p className="text-sm text-slate-600">Approval: {campaign.data.sequence.approvalStatus} · draft v{campaign.data.sequence.draftVersion}</p></div>
                <button type="button" onClick={() => generate.mutate()} disabled={generate.isPending} className="rounded-md border border-slate-300 px-3 py-2 text-sm">{generate.isPending ? 'Generating…' : 'Generate sequence'}</button>
              </div>

              {steps.map((step, index) => (
                <div key={step.order} className="grid gap-3 rounded-md border border-slate-200 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-sm text-slate-700">Delay days<input type="number" min={0} value={step.delayDays} onChange={(event) => setSteps((current) => current.map((value, i) => i === index ? { ...value, delayDays: Number(event.target.value) } : value))} className="rounded-md border border-slate-300 px-3 py-2" /></label>
                    <label className="grid gap-1 text-sm text-slate-700">Subject<input value={step.subject ?? ''} onChange={(event) => setSteps((current) => current.map((value, i) => i === index ? { ...value, subject: event.target.value || undefined } : value))} className="rounded-md border border-slate-300 px-3 py-2" /></label>
                  </div>
                  <label className="grid gap-1 text-sm text-slate-700">Body<textarea rows={6} value={step.body} onChange={(event) => setSteps((current) => current.map((value, i) => i === index ? { ...value, body: event.target.value } : value))} className="rounded-md border border-slate-300 px-3 py-2" /></label>
                </div>
              ))}

              {steps.length > 0 ? <div className="flex flex-wrap gap-3"><button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="rounded-md border border-slate-300 px-4 py-2 text-sm">{save.isPending ? 'Saving…' : 'Save edits'}</button><button type="button" onClick={() => approve.mutate()} disabled={approve.isPending || campaign.data.sequence.approvalStatus === 'APPROVED'} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{approve.isPending ? 'Approving…' : 'Approve campaign'}</button></div> : null}
              {(generate.isError || save.isError || approve.isError) ? <p role="alert" className="text-sm text-red-700">The sequence action could not be completed.</p> : null}
            </section>
          </>
        ) : (
          <p role="status" className="text-sm text-slate-600">Loading…</p>
        )}
      </div>
    </main>
  );
}
