import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchOpportunities,
  sendOpportunityReply,
  updateOpportunityStatus,
  type OpportunityRow,
} from '../api/opportunities';

function OpportunityCard({ opportunity }: { opportunity: OpportunityRow }): ReactElement {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(opportunity.draftReply ?? '');
  const statusMutation = useMutation({
    mutationFn: (status: string) => updateOpportunityStatus(opportunity._id, status),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['opportunities'] }),
  });
  const sendMutation = useMutation({
    mutationFn: () => sendOpportunityReply(opportunity._id, { body: draft }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['opportunities'] }),
  });

  return (
    <li className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{opportunity.intent} · {opportunity.priority}</p>
          <p className="mt-1 text-sm text-slate-600">{opportunity.summary}</p>
          <p className="mt-1 text-sm text-slate-700">Next: {opportunity.recommendedAction}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{opportunity.status}</span>
      </div>

      {opportunity.draftReply ? (
        <div className="space-y-2 rounded-md bg-slate-50 p-3">
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">AI draft — review and edit before sending</span>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} className="rounded-md border border-slate-300 bg-white px-3 py-2" />
          </label>
          <button type="button" disabled={sendMutation.isPending || !draft.trim()} onClick={() => sendMutation.mutate()} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {sendMutation.isPending ? 'Sending…' : 'Send reviewed reply'}
          </button>
          {sendMutation.isError ? <p role="alert" className="text-sm text-red-700">Reply was not sent. Live outbound may still be disabled.</p> : null}
          {sendMutation.isSuccess ? <p role="status" className="text-sm text-green-700">Reply sent.</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('READY_TO_BOOK')} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Ready to book</button>
        <button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('BOOKED')} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">Mark booked</button>
        <button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('FOLLOW_UP_LATER')} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Follow up later</button>
      </div>
    </li>
  );
}

export function OpportunitiesPage(): ReactElement {
  const opportunities = useQuery({ queryKey: ['opportunities'], queryFn: fetchOpportunities, retry: false });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div><p className="text-sm text-slate-600">Inbox</p><h1 className="text-2xl font-semibold text-slate-900">Opportunities</h1></div>
          <Link to="/" className="text-sm font-medium text-slate-700 underline">Dashboard</Link>
        </header>
        <section className="rounded-lg border border-slate-200 bg-white">
          {opportunities.isPending ? <p role="status" className="p-5 text-sm text-slate-600">Loading opportunities…</p> : opportunities.isError ? <p role="alert" className="p-5 text-sm text-red-700">Opportunities could not be loaded.</p> : opportunities.data.length === 0 ? <p className="p-5 text-sm text-slate-600">No opportunities yet.</p> : <ul className="divide-y divide-slate-200">{opportunities.data.map((opportunity) => <OpportunityCard key={opportunity._id} opportunity={opportunity} />)}</ul>}
        </section>
      </div>
    </main>
  );
}
