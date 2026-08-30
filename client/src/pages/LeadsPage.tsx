import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchLeads } from '../api/leads';

export function LeadsPage(): ReactElement {
  const [search, setSearch] = useState('');
  const [qualification, setQualification] = useState('');
  const params = useMemo(() => {
    const value = new URLSearchParams();
    if (search.trim()) value.set('search', search.trim());
    if (qualification) value.set('qualification', qualification);
    return value;
  }, [search, qualification]);
  const leads = useQuery({
    queryKey: ['leads', params.toString()],
    queryFn: () => fetchLeads(params),
    retry: false,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div><p className="text-sm text-slate-600">Database</p><h1 className="text-2xl font-semibold text-slate-900">Leads</h1></div>
          <Link to="/" className="text-sm font-medium text-slate-700 underline">Dashboard</Link>
        </header>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-700">Search<input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2" placeholder="Name, company, role or email" /></label>
            <label className="grid gap-1 text-sm text-slate-700">Qualification<select value={qualification} onChange={(e) => setQualification(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2"><option value="">All</option><option>QUALIFIED</option><option>REVIEW</option><option>REJECTED</option></select></label>
          </div>
        </section>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {leads.isPending ? <p role="status" className="p-5 text-sm text-slate-600">Loading leads…</p> : leads.isError ? <p role="alert" className="p-5 text-sm text-red-700">Leads could not be loaded.</p> : leads.data.length === 0 ? <p className="p-5 text-sm text-slate-600">No matching leads.</p> : <ul className="divide-y divide-slate-200">{leads.data.map((lead) => <li key={lead._id} className="grid gap-2 p-5 md:grid-cols-4"><div><p className="font-medium text-slate-900">{lead.identity.displayName}</p><p className="text-xs text-slate-500">{lead.identity.role ?? 'Role unknown'} · {lead.identity.company ?? 'Company unknown'}</p></div><p className="text-sm text-slate-700">{lead.qualification.status}</p><p className="text-sm text-slate-700">{lead.contact.status}</p><p className="text-sm text-slate-700">{lead.latestIntent?.intent ?? lead.outreach.status}</p></li>)}</ul>}
        </section>
      </div>
    </main>
  );
}
