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

const secondaryButtonClassName =
  'rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground focus:outline-none focus:ring-2 focus:ring-focus';

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
          <p className="font-medium text-foreground">{opportunity.intent} · {opportunity.priority}</p>
          <p className="mt-1 text-sm text-muted">{opportunity.summary}</p>
          <p className="mt-1 text-sm text-foreground-secondary">Next: {opportunity.recommendedAction}</p>
        </div>
        <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-foreground-secondary">{opportunity.status}</span>
      </div>

      {opportunity.draftReply ? (
        <div className="space-y-2 rounded-md border border-border bg-app-background p-3">
          <label className="grid gap-2 text-sm text-foreground-secondary">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">AI draft — review and edit before sending</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
              className="rounded-md border border-border bg-input px-3 py-2 text-foreground focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </label>
          <button
            type="button"
            disabled={sendMutation.isPending || !draft.trim()}
            onClick={() => sendMutation.mutate()}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendMutation.isPending ? 'Sending…' : 'Send reviewed reply'}
          </button>
          {sendMutation.isError ? <p role="alert" className="text-sm text-danger">Reply was not sent. Live outbound may still be disabled.</p> : null}
          {sendMutation.isSuccess ? <p role="status" className="text-sm text-success">Reply sent.</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('READY_TO_BOOK')} className={`${secondaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}>
          Ready to book
        </button>
        <button
          type="button"
          disabled={statusMutation.isPending}
          onClick={() => statusMutation.mutate('BOOKED')}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark booked
        </button>
        <button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('FOLLOW_UP_LATER')} className={`${secondaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}>
          Follow up later
        </button>
      </div>
    </li>
  );
}

export function OpportunitiesPage(): ReactElement {
  const opportunities = useQuery({ queryKey: ['opportunities'], queryFn: fetchOpportunities, retry: false });

  return (
    <main className="min-h-screen bg-app-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Inbox</p>
            <h1 className="text-2xl font-semibold text-foreground">Opportunities</h1>
          </div>
          <Link to="/" className="text-sm font-medium text-foreground-secondary underline hover:text-foreground focus:outline-none focus:ring-2 focus:ring-focus">
            Dashboard
          </Link>
        </header>
        <section className="rounded-lg border border-border bg-surface">
          {opportunities.isPending ? (
            <p role="status" className="p-5 text-sm text-muted">Loading opportunities…</p>
          ) : opportunities.isError ? (
            <p role="alert" className="p-5 text-sm text-danger">Opportunities could not be loaded.</p>
          ) : opportunities.data.length === 0 ? (
            <p className="p-5 text-sm text-muted">No opportunities yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {opportunities.data.map((opportunity) => <OpportunityCard key={opportunity._id} opportunity={opportunity} />)}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
