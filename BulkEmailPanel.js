// BulkEmailPanel.js
// Select leads by stage/tag/filter → copy email list, download CSV, or generate a campaign draft.
// No sending. No automation. Pure data prep.
//
// HOW TO ADD TO pages/index.js:
//   1. import BulkEmailPanel from '../components/BulkEmailPanel'
//   2. Add tab: ["bulkemail", "✉ Bulk Email"]
//   3. Render: "bulkemail" === h && <BulkEmailPanel leads={e} toast={ee} />

import { useState, useMemo } from 'react';

const STAGES = [
  'Re-Engagement Buyer',
  'Re-Engagement Seller',
  'Re-Engagement Past Client',
  'Re-Engagement Investor',
  'Re-Engagement Luxury',
  'Hot',
  'Past Client',
  'Sphere',
  'Referral',
  'Closed',
  'New Lead (Fresh)',
];

function buildCampaignDraft(leads, purpose) {
  const names = leads.slice(0, 3).map((l) => l.name.split(' ')[0]).join(', ');
  const count = leads.length;

  const subjects = {
    reengagement: `Checking In — Still Thinking About Real Estate?`,
    market: `Quick Market Update You'll Want to See`,
    listings: `New Listings Just Hit — Here's What I'm Seeing`,
    general: `A Personal Note From Bri Wesley`,
  };

  const bodies = {
    reengagement: `Hi [First Name],

I know life gets busy — I just wanted to personally reach out and see how things are going.

Are your real estate plans still on the radar? The market has shifted in some interesting ways lately and I'd love to share what I'm seeing.

No pressure at all — just want to make sure you have the right information when the time is right.

Would love to reconnect. Feel free to reply here or call/text me directly.

Warm regards,
Bri Wesley
Estēm Realty Group
📱 [Your Phone]`,

    market: `Hi [First Name],

Bri Wesley here from Estēm Realty Group — I wanted to share a quick update on what's happening in the South DFW market.

📊 Here's what I'm seeing right now:
• [Add key market stat]
• [Add inventory note]
• [Add rate/opportunity note]

Whether you're thinking of making a move soon or just staying informed, this is worth knowing.

Happy to set up a quick call if you'd like a more personalized breakdown for your situation.

Warm regards,
Bri Wesley
Estēm Realty Group`,

    listings: `Hi [First Name],

Bri Wesley here — some listings just came on the market that I think are worth your attention.

🏡 [Add listing details here]

If any of these look interesting, reply to this email or text me and I'll set up a showing at your convenience.

Warm regards,
Bri Wesley
Estēm Realty Group`,

    general: `Hi [First Name],

I just wanted to take a moment to personally reach out.

[Add your personal message here]

As always, I'm here for any real estate questions — big or small.

Warm regards,
Bri Wesley
Estēm Realty Group`,
  };

  return { subject: subjects[purpose] || subjects.general, body: bodies[purpose] || bodies.general };
}

export default function BulkEmailPanel({ leads, toast }) {
  const [stageFilter, setStageFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [emailOnly, setEmailOnly] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [draftPurpose, setDraftPurpose] = useState('reengagement');
  const [showDraft, setShowDraft] = useState(false);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [copied, setCopied] = useState('');

  const filtered = useMemo(() => {
    let list = leads.filter((l) => !l.is_archived);
    if (emailOnly) list = list.filter((l) => l.email && l.email.trim());
    if (stageFilter !== 'all') list = list.filter((l) => l.stage === stageFilter);
    if (tagFilter) list = list.filter((l) => (l.tags || '').toLowerCase().includes(tagFilter.toLowerCase()));
    if (nameSearch) {
      const s = nameSearch.toLowerCase();
      list = list.filter((l) =>
        (l.name || '').toLowerCase().includes(s) ||
        (l.email || '').toLowerCase().includes(s) ||
        (l.tags || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [leads, stageFilter, tagFilter, nameSearch, emailOnly]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const selectedLeads = filtered.filter((l) => selected.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((l) => n.delete(l.id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((l) => n.add(l.id)); return n; });
    }
  };

  const copyEmails = () => {
    const emails = selectedLeads.map((l) => l.email).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emails);
    setCopied('emails');
    setTimeout(() => setCopied(''), 2500);
    toast && toast(`✓ ${selectedLeads.length} email addresses copied`);
  };

  const copyEmailsNewline = () => {
    const emails = selectedLeads.map((l) => l.email).filter(Boolean).join('\n');
    navigator.clipboard.writeText(emails);
    setCopied('newline');
    setTimeout(() => setCopied(''), 2500);
    toast && toast(`✓ ${selectedLeads.length} emails copied (one per line)`);
  };

  const downloadCSV = () => {
    const rows = [
      ['Name', 'Email', 'Phone', 'Stage', 'Tags'].join(','),
      ...selectedLeads.map((l) =>
        [
          `"${l.name || ''}"`,
          `"${l.email || ''}"`,
          `"${l.phone || ''}"`,
          `"${l.stage || ''}"`,
          `"${(l.tags || '').replace(/"/g, "'")}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estem-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast && toast(`✓ CSV downloaded — ${selectedLeads.length} leads`);
  };

  const generateDraft = () => {
    const draft = buildCampaignDraft(selectedLeads, draftPurpose);
    setDraftSubject(draft.subject);
    setDraftBody(draft.body);
    setShowDraft(true);
  };

  const copyDraft = () => {
    const full = `Subject: ${draftSubject}\n\n${draftBody}`;
    navigator.clipboard.writeText(full);
    setCopied('draft');
    setTimeout(() => setCopied(''), 2500);
    toast && toast('✓ Email draft copied');
  };

  return (
    <div>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 18, marginBottom: 3 }}>✉ Bulk Email</div>
      <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 14 }}>
        Filter leads → select → copy email list, download CSV, or generate a campaign draft.
      </div>

      {/* Filter bar */}
      <div style={{ background: 'white', border: '1px solid var(--border)', padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          <input
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Search name / email / tag..."
            style={{ padding: '5px 9px', border: '1px solid var(--border2)', background: 'var(--cream)', fontSize: 11, fontFamily: 'Georgia,serif', width: 220, outline: 'none' }}
          />
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Filter by tag..."
            style={{ padding: '5px 9px', border: '1px solid var(--border2)', background: 'var(--cream)', fontSize: 11, fontFamily: 'Georgia,serif', width: 160, outline: 'none' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--gray)', cursor: 'pointer' }}>
            <input type="checkbox" checked={emailOnly} onChange={(e) => setEmailOnly(e.target.checked)} />
            Email addresses only
          </label>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['all', ...STAGES].map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              style={{
                padding: '3px 9px', fontSize: 9,
                border: '1px solid var(--border2)',
                background: stageFilter === s ? 'var(--black)' : 'white',
                color: stageFilter === s ? 'var(--cream)' : 'var(--gray)',
                cursor: 'pointer', fontFamily: 'Georgia,serif',
              }}
            >
              {s === 'all' ? 'All Stages' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div style={{ background: 'linear-gradient(135deg,#FAF8F4,#FAF6EC)', border: '1px solid rgba(196,164,90,0.4)', padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--gray)', marginBottom: 8 }}>
          <strong style={{ color: 'var(--black)' }}>{selected.size}</strong> selected
          {' · '}
          {selectedLeads.filter((l) => l.email).length} with email
        </div>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={copyEmails}
            disabled={selectedLeads.length === 0}
            style={{ padding: '5px 12px', fontSize: 10, border: 'none', background: selected.size ? 'var(--black)' : 'var(--gray)', color: 'white', cursor: selected.size ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}
          >
            {copied === 'emails' ? '✓ Copied!' : '📋 Copy Emails (comma)'}
          </button>
          <button
            onClick={copyEmailsNewline}
            disabled={selectedLeads.length === 0}
            style={{ padding: '5px 12px', fontSize: 10, border: '1px solid var(--border2)', background: 'white', color: 'var(--black)', cursor: selected.size ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}
          >
            {copied === 'newline' ? '✓ Copied!' : '📋 Copy (one per line)'}
          </button>
          <button
            onClick={downloadCSV}
            disabled={selectedLeads.length === 0}
            style={{ padding: '5px 12px', fontSize: 10, border: '1px solid var(--border2)', background: 'white', color: 'var(--black)', cursor: selected.size ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}
          >
            ⬇ Download CSV
          </button>
        </div>

        {/* Campaign draft section */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(196,164,90,0.3)' }}>
          <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 6 }}>
            Generate Campaign Draft
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              ['reengagement', '↻ Re-Engagement'],
              ['market', '📊 Market Update'],
              ['listings', '🏡 New Listings'],
              ['general', '✉ General'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDraftPurpose(val)}
                style={{
                  padding: '3px 9px', fontSize: 9,
                  border: '1px solid var(--border2)',
                  background: draftPurpose === val ? 'var(--black)' : 'white',
                  color: draftPurpose === val ? 'var(--cream)' : 'var(--gray)',
                  cursor: 'pointer', fontFamily: 'Georgia,serif',
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={generateDraft}
              disabled={selectedLeads.length === 0}
              style={{ padding: '5px 12px', fontSize: 10, border: 'none', background: selected.size ? 'var(--gold)' : 'var(--gray)', color: 'white', cursor: selected.size ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}
            >
              Generate Draft →
            </button>
          </div>
        </div>
      </div>

      {/* Draft output */}
      {showDraft && (
        <div style={{ background: 'white', border: '1px solid var(--border)', padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 13 }}>Campaign Draft</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={copyDraft} style={{ fontSize: 9, padding: '3px 9px', border: 'none', background: copied === 'draft' ? 'var(--green)' : 'var(--black)', color: 'white', cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                {copied === 'draft' ? '✓ Copied!' : '📋 Copy Draft'}
              </button>
              <button onClick={() => setShowDraft(false)} style={{ fontSize: 9, padding: '3px 9px', border: '1px solid var(--border2)', background: 'white', cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                ✕ Close
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray)', marginBottom: 3 }}>Subject</div>
            <input
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border2)', fontFamily: 'Georgia,serif', fontSize: 11, outline: 'none', background: 'var(--cream)' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray)', marginBottom: 3 }}>Body (edit before sending)</div>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={14}
              style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--border2)', fontFamily: 'Georgia,serif', fontSize: 11, outline: 'none', resize: 'vertical', background: '#FFFEF8', lineHeight: 1.7 }}
            />
          </div>
          <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>
            Replace [First Name] and [bracketed items] before sending · {selectedLeads.filter(l => l.email).length} recipients with email addresses
          </div>
        </div>
      )}

      {/* Lead table */}
      <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        Showing {filtered.length} leads
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            style={{ fontSize: 9, padding: '2px 7px', border: '1px solid var(--border2)', background: 'white', cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            {allSelected ? 'Deselect All' : `Select All (${filtered.length})`}
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              {['', 'Name', 'Email', 'Stage', 'Tags'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 7px', borderBottom: '1px solid var(--border)', color: 'var(--gray)', fontSize: 10, fontFamily: 'Georgia,serif', fontWeight: 'normal' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map((lead) => (
              <tr
                key={lead.id}
                style={{ background: selected.has(lead.id) ? 'var(--cream)' : 'white' }}
              >
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', width: 30 }}>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => setSelected(prev => { const n = new Set(prev); n.has(lead.id) ? n.delete(lead.id) : n.add(lead.id); return n; })} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>{lead.name}</td>
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', fontSize: 10, color: lead.email ? 'var(--black)' : 'var(--gray)', fontStyle: lead.email ? 'normal' : 'italic' }}>
                  {lead.email || 'No email'}
                </td>
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', fontSize: 9, color: 'var(--gray)' }}>{lead.stage}</td>
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', fontSize: 9, color: 'var(--gray)' }}>
                  {(lead.tags || '').split(',').slice(0, 2).join(', ') || '—'}
                </td>
              </tr>
            ))}
            {filtered.length > 150 && (
              <tr><td colSpan={5} style={{ padding: '8px 7px', fontSize: 10, color: 'var(--gray)', fontStyle: 'italic' }}>Showing first 150 — narrow your filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
