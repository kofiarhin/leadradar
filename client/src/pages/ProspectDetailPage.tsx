import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  fetchLead,
  resolvePolicyReview,
  resolveQualificationReview,
} from '../api/leads';

export function ProspectDetailPage(): ReactElement {
  const { prospectId = '' } = useParams();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ['lead', prospectId],
    queryFn: () => fetchLead(prospectId),
    enabled: Boolean(prospectId),
    retry: false,
  });
  const review = useMutation({
    mutationFn: async (input: { campaignId: string; kind: 'qualification' | 'policy'; decision: string }) => {
      if (input.kind === 'qualification') {
        await resolveQualificationReview(prospectId, input.campaignId, input.decision as 'QUALIFIED' | 'REJECTED');
      } else {
        await resolvePolicyReview(prospectId, input.campaignId, input.decision as 'ALLOWED' | 'BLOCKED');
      }
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['lead', prospectId] }),
  });

  const campaignNames = new Map(detail.data?.campaigns.map((campaign) => [campaign._id, campaign.name]) ?? []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">Prospect</p>
            <h1 className="text-2xl font-semibold text-slate-900">{detail.data?.prospect.identity.displayName ?? 'Loading prospect…'}</h1>
          </div>
          <Link to="/leads" className="text-sm font-medium text-slate-700 underline">Back to leads</Link>
        </header>

        {detail.isError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">Prospect could not be loaded.</p> : null}
        {detail.data ? (
          <>
            <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-4">
              <div><p className="text-xs uppercase text-slate-500">Role</p><p className="mt-1 text-sm text-slate-900">{detail.data.prospect.identity.role ?? 'Unknown'}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Company</p><p className="mt-1 text-sm text-slate-900">{detail.data.prospect.identity.company ?? 'Unknown'}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Contact</p><p className="mt-1 text-sm text-slate-900">{detail.data.prospect.contact.status}</p><p className="text-xs text-slate-500">{detail.data.prospect.contact.businessEmail ?? ''}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Outreach</p><p className="mt-1 text-sm text-slate-900">{detail.data.prospect.outreach.status}</p></div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">Campaign decisions</h2>
              <div className="mt-4 space-y-3">
                {detail.data.campaignProspects.map((row) => (
                  <div key={row._id} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{campaignNames.get(row.campaignId) ?? 'Campaign'}</p>
                        <p className="text-sm text-slate-600">Qualification: {row.qualificationDecision} · Policy: {row.outreachPolicyDecision ?? 'PENDING'} · Release: {row.releaseStatus}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {row.qualificationDecision === 'REVIEW' ? <><button type="button" disabled={review.isPending} onClick={() => review.mutate({ campaignId: row.campaignId, kind: 'qualification', decision: 'QUALIFIED' })} className="rounded-md bg-slate-900 px-3 py-2 text-xs text-white">Qualify</button><button type="button" disabled={review.isPending} onClick={() => review.mutate({ campaignId: row.campaignId, kind: 'qualification', decision: 'REJECTED' })} className="rounded-md border border-slate-300 px-3 py-2 text-xs">Reject</button></> : null}
                        {row.outreachPolicyDecision === 'REVIEW' ? <><button type="button" disabled={review.isPending} onClick={() => review.mutate({ campaignId: row.campaignId, kind: 'policy', decision: 'ALLOWED' })} className="rounded-md bg-slate-900 px-3 py-2 text-xs text-white">Allow outreach</button><button type="button" disabled={review.isPending} onClick={() => review.mutate({ campaignId: row.campaignId, kind: 'policy', decision: 'BLOCKED' })} className="rounded-md border border-slate-300 px-3 py-2 text-xs">Block outreach</button></> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {review.isError ? <p role="alert" className="mt-3 text-sm text-red-700">Review decision could not be saved.</p> : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">Public signals</h2>
              <div className="mt-4 space-y-3">{detail.data.signals.length === 0 ? <p className="text-sm text-slate-600">No signals.</p> : detail.data.signals.map((signal) => <article key={signal._id} className="rounded-md bg-slate-50 p-4"><p className="whitespace-pre-wrap text-sm text-slate-800">{signal.content}</p><a className="mt-2 inline-block text-xs text-blue-700 underline" href={signal.source.postUrl} target="_blank" rel="noreferrer">Source post</a></article>)}</div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">Conversation history</h2>
              <div className="mt-4 space-y-3">{detail.data.messages.length === 0 ? <p className="text-sm text-slate-600">No conversation yet.</p> : detail.data.messages.map((message) => <article key={message._id} className="rounded-md border border-slate-200 p-4"><p className="text-xs font-medium uppercase text-slate-500">{message.direction} · {message.kind}</p>{message.subject ? <p className="mt-1 text-sm font-medium text-slate-900">{message.subject}</p> : null}<p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{message.bodyText}</p></article>)}</div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">Opportunities</h2>
              <div className="mt-4 space-y-3">{detail.data.opportunities.length === 0 ? <p className="text-sm text-slate-600">No opportunity yet.</p> : detail.data.opportunities.map((opportunity) => <article key={opportunity._id} className="rounded-md border border-slate-200 p-4"><p className="font-medium text-slate-900">{opportunity.intent} · {opportunity.status}</p><p className="mt-1 text-sm text-slate-700">{opportunity.summary}</p><p className="mt-1 text-sm text-slate-600">Next: {opportunity.recommendedAction}</p></article>)}</div>
            </section>
          </>
        ) : !detail.isError ? <p role="status" className="text-sm text-slate-600">Loading…</p> : null}
      </div>
    </main>
  );
}
