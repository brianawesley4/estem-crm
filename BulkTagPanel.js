// BulkTagPanel.js
// Select leads by stage/filter, apply or remove a tag to all selected.
// All saves go through the existing PATCH /api/leads endpoint — one call per lead.
//
// HOW TO ADD TO pages/index.js:
//   1. import BulkTagPanel from '../components/BulkTagPanel'
//   2. Add a new tab entry in the tabs array:
//        ["bulktag", "⬡ Bulk Tag"]
//   3. Add the tab render:
//        "bulktag" === h && <BulkTagPanel leads={e} toast={ee} onBatchSave={et} onLeadsUpdated={(updated) => t(updated)} />
//
// onLeadsUpdated receives the full updated leads array so the parent state stays in sync.

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

const QUICK_TAGS = [
  'Re-Engagement Priority',
  'Long-Term Reactivation',
  'Revived Lead',
  'Pre-Approved',
  'Hot Buyer',
  'Hot Seller',
  'Follow-up Needed',
  'Appointment Set',
  'Past Client VIP',
  'Investor',
  'Luxury',
  'Do Not Contact',
];

export default function BulkTagPanel({ leads, toast, onBatchSave, onLeadsUpdated }) {
  const [stageFilter, setStageFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [tagInput, setTagInput] = useState('');
  const [mode, setMode] = useState('add'); // 'add' | 'remove'
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
      if (tagFilter && !(l.tags || '').toLowerCase().includes(tagFilter.toLowerCase())) return false;
      if (nameSearch) {
        const s = nameSearch.toLowerCase();
        return (
          (l.name || '').toLowerCase().includes(s) ||
          (l.phone || '').includes(s) ||
          (l.email || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [leads, stageFilter, tagFilter, nameSearch]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.add(l.id));
        return next;
      });
    }
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyBulkTag = async () => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (selected.size === 0) {
      toast && toast('Select at least one lead first');
      return;
    }

    const confirmed = window.confirm(
      `${mode === 'add' ? 'Add' : 'Remove'} tag "${tag}" to ${selected.size} lead(s)?`
    );
    if (!confirmed) return;

    setRunning(true);
    const selectedLeads = leads.filter((l) => selected.has(l.id));
    let done = 0;
    const updatedLeads = [...leads];

    for (const lead of selectedLeads) {
      const currentTags = (lead.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
      let newTags;

      if (mode === 'add') {
        if (currentTags.includes(tag)) {
          done++;
          setProgress(`${done}/${selected.size}`);
          continue;
        }
        newTags = [...currentTags, tag];
      } else {
        newTags = currentTags.filter((t) => t !== tag);
      }

      const newTagStr = newTags.join(', ');
      await onBatchSave({ id: lead.id, tags: newTagStr });

      // Update in local array
      const idx = updatedLeads.findIndex((l) => l.id === lead.id);
      if (idx !== -1) updatedLeads[idx] = { ...updatedLeads[idx], tags: newTagStr };

      done++;
      setProgress(`${done}/${selected.size}`);
    }

    onLeadsUpdated && onLeadsUpdated(updatedLeads);
    setRunning(false);
    setProgress(null);
    setSelected(new Set());
    toast && toast(`✓ Tag "${tag}" ${mode === 'add' ? 'added to' : 'removed from'} ${done} lead(s)`);
  };

  return (
    <div>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 18, marginBottom: 3 }}>
        ⬡ Bulk Tag Manager
      </div>
      <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 14 }}>
        Filter leads, select them, then add or remove a tag across all selected.
      </div>

      {/* Filters */}
      <div style={{ background: 'white', border: '1px solid var(--border)', padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 8 }}>
          Filter Leads
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Search name / phone / email..."
            style={{ padding: '5px 9px', border: '1px solid var(--border2)', background: 'var(--cream)', fontSize: 11, fontFamily: 'Georgia,serif', width: 220, outline: 'none' }}
          />
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Filter by existing tag..."
            style={{ padding: '5px 9px', border: '1px solid var(--border2)', background: 'var(--cream)', fontSize: 11, fontFamily: 'Georgia,serif', width: 180, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['all', ...STAGES].map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              style={{
                padding: '3px 9px',
                border: '1px solid var(--border2)',
                background: stageFilter === s ? 'var(--black)' : 'white',
                color: stageFilter === s ? 'var(--cream)' : 'var(--gray)',
                fontSize: 9,
                cursor: 'pointer',
                fontFamily: 'Georgia,serif',
              }}
            >
              {s === 'all' ? 'All Stages' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Tag action bar */}
      <div style={{ background: 'linear-gradient(135deg,#FAF8F4,#FAF6EC)', border: '1px solid rgba(196,164,90,0.4)', padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 8 }}>
          Apply Tag to {selected.size} Selected Lead{selected.size !== 1 ? 's' : ''}
        </div>

        {/* Quick tag chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {QUICK_TAGS.map((qt) => (
            <button
              key={qt}
              onClick={() => setTagInput(qt)}
              style={{
                padding: '2px 8px',
                fontSize: 9,
                border: '1px solid var(--border2)',
                background: tagInput === qt ? 'var(--black)' : 'white',
                color: tagInput === qt ? 'var(--cream)' : 'var(--gray)',
                cursor: 'pointer',
                fontFamily: 'Georgia,serif',
              }}
            >
              {qt}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Type or select tag above..."
            style={{ padding: '5px 9px', border: '1px solid var(--border2)', background: 'var(--cream)', fontSize: 11, fontFamily: 'Georgia,serif', width: 200, outline: 'none' }}
            onKeyDown={(e) => e.key === 'Enter' && applyBulkTag()}
          />
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 3 }}>
            {['add', 'remove'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '5px 12px',
                  fontSize: 10,
                  border: '1px solid var(--border2)',
                  background: mode === m ? (m === 'add' ? 'var(--black)' : '#A32D2D') : 'white',
                  color: mode === m ? 'white' : 'var(--gray)',
                  cursor: 'pointer',
                  fontFamily: 'Georgia,serif',
                  textTransform: 'capitalize',
                }}
              >
                {m === 'add' ? '+ Add Tag' : '× Remove Tag'}
              </button>
            ))}
          </div>
          <button
            onClick={applyBulkTag}
            disabled={running || !tagInput.trim() || selected.size === 0}
            style={{
              padding: '5px 14px',
              fontSize: 11,
              border: 'none',
              background: running || !tagInput.trim() || selected.size === 0 ? 'var(--gray)' : 'var(--black)',
              color: 'var(--cream)',
              cursor: running || !tagInput.trim() || selected.size === 0 ? 'default' : 'pointer',
              fontFamily: 'Georgia,serif',
            }}
          >
            {running ? `Working... ${progress || ''}` : `Apply to ${selected.size} Lead${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Lead table */}
      <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 6 }}>
        Showing {filtered.length} leads
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            style={{ marginLeft: 10, fontSize: 9, padding: '2px 7px', border: '1px solid var(--border2)', background: 'white', cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            {allSelected ? 'Deselect All' : `Select All (${filtered.length})`}
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              {['', 'Name', 'Stage', 'Phone', 'Tags'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '6px 7px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--gray)',
                    fontSize: 10,
                    fontFamily: 'Georgia,serif',
                    fontWeight: 'normal',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((lead) => (
              <tr
                key={lead.id}
                style={{ background: selected.has(lead.id) ? 'var(--cream)' : 'white' }}
                onMouseEnter={(e) => { if (!selected.has(lead.id)) e.currentTarget.style.background = '#FAF8F4'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = selected.has(lead.id) ? 'var(--cream)' : 'white'; }}
              >
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', width: 30 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                  {lead.name}
                </td>
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', fontSize: 9, color: 'var(--gray)' }}>
                  {lead.stage}
                </td>
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', fontSize: 10 }}>
                  {lead.phone || '—'}
                </td>
                <td style={{ padding: '6px 7px', borderBottom: '1px solid var(--border)', fontSize: 9, color: 'var(--gray)' }}>
                  {(lead.tags || '').split(',').slice(0, 3).join(', ') || '—'}
                </td>
              </tr>
            ))}
            {filtered.length > 100 && (
              <tr>
                <td colSpan={5} style={{ padding: '8px 7px', fontSize: 10, color: 'var(--gray)', fontStyle: 'italic' }}>
                  Showing first 100 of {filtered.length}. Narrow your filter to see more.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
