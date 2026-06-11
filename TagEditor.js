// TagEditor.js
// Inline tag chip editor for the lead detail panel.
// Props:
//   lead       — the current lead object
//   onSave     — async fn(updatedLead) — uses the existing PATCH /api/leads endpoint
//   toast      — fn(msg) — uses the existing toast system
//
// HOW TO ADD TO pages/index.js:
//   1. import TagEditor from '../components/TagEditor'
//   2. In the LeadDetailPanel (component A), find the "Tags" section that renders:
//        (t.tags || "").split(",").map(...)
//      Replace that entire block with:
//        <TagEditor lead={t} onSave={async (updated) => { await et(updated); _(updated); t(leads => leads.map(l => l.id === updated.id ? updated : l)); }} toast={ee} />
//
// ZERO changes to save/load logic, API routes, or Supabase schema.
// tags column already exists as text (comma-separated) in leads table.

import { useState, useRef } from 'react';

const inputStyle = {
  fontFamily: 'Georgia,serif',
  fontSize: 11,
  padding: '4px 7px',
  border: '1px solid var(--border2)',
  background: 'var(--cream)',
  color: 'var(--black)',
  outline: 'none',
  width: 130,
};

const chipStyle = (color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 7px',
  fontSize: 9,
  border: `1px solid ${color || 'var(--border2)'}`,
  background: 'var(--cream2)',
  color: 'var(--black)',
  marginRight: 4,
  marginBottom: 4,
});

// Suggested quick-add tags based on Bri's workflow
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

export default function TagEditor({ lead, onSave, toast }) {
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const currentTags = (lead.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const filteredSuggestions = inputVal.length > 0
    ? QUICK_TAGS.filter(
        (qt) =>
          qt.toLowerCase().includes(inputVal.toLowerCase()) &&
          !currentTags.includes(qt)
      )
    : QUICK_TAGS.filter((qt) => !currentTags.includes(qt));

  const saveNewTags = async (newTagsArray) => {
    setSaving(true);
    const newTagStr = newTagsArray.join(', ');
    const updated = { ...lead, tags: newTagStr };
    await onSave({ id: lead.id, tags: newTagStr });
    setSaving(false);
  };

  const addTag = async (tag) => {
    const trimmed = tag.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    const newTags = [...currentTags, trimmed];
    setInputVal('');
    setShowSuggestions(false);
    await saveNewTags(newTags);
    if (toast) toast('✓ Tag added');
  };

  const removeTag = async (tag) => {
    const newTags = currentTags.filter((t) => t !== tag);
    await saveNewTags(newTags);
    if (toast) toast('Tag removed');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Current tag chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 6 }}>
        {currentTags.length === 0 && (
          <span style={{ fontSize: 10, color: 'var(--gray)', fontStyle: 'italic' }}>
            No tags yet
          </span>
        )}
        {currentTags.map((tag) => (
          <span key={tag} style={chipStyle()}>
            {tag}
            <button
              onClick={() => removeTag(tag)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 10,
                color: 'var(--gray)',
                padding: '0 1px',
                lineHeight: 1,
              }}
              title={`Remove "${tag}"`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Add tag..."
            style={inputStyle}
          />
          {/* Suggestion dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 500,
                background: 'white',
                border: '1px solid var(--border2)',
                minWidth: 180,
                maxHeight: 180,
                overflowY: 'auto',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              {filteredSuggestions.map((s) => (
                <div
                  key={s}
                  onMouseDown={() => addTag(s)}
                  style={{
                    padding: '5px 9px',
                    fontSize: 10,
                    cursor: 'pointer',
                    fontFamily: 'Georgia,serif',
                    color: 'var(--black)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => addTag(inputVal)}
          disabled={!inputVal.trim() || saving}
          style={{
            fontFamily: 'Georgia,serif',
            fontSize: 9,
            padding: '4px 9px',
            border: '1px solid var(--border2)',
            background: inputVal.trim() ? 'var(--black)' : 'var(--cream2)',
            color: inputVal.trim() ? 'var(--cream)' : 'var(--gray)',
            cursor: inputVal.trim() ? 'pointer' : 'default',
          }}
        >
          {saving ? '...' : '+ Add'}
        </button>
      </div>

      {/* Hint */}
      <div style={{ fontSize: 9, color: 'var(--gray)', marginTop: 3 }}>
        Press Enter or comma to add · Click × to remove
      </div>
    </div>
  );
}
