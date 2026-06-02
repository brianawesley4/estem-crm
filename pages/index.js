import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

const STAGES = ['Re-Engagement Buyer','Re-Engagement Seller','Re-Engagement Past Client','Re-Engagement Investor','Re-Engagement Luxury','Hot','Past Client','Sphere','Referral','Closed','New Lead (Fresh)']
const SOURCES = ['Facebook','Referral','Zillow','Zurple/IDX','Open House','Sphere','Instagram','Sign Call','Other','Import/Legacy','Unknown','Compass Referral','Company']
const TYPES = ['Buyer','Seller','Buyer, Seller','Investor','Renter','Vendor','Lender','Unclassified']
const TEAM = ['Bri','Joseph','Deena','Unassigned']
const NOTE_TYPES = [{v:'note',l:'📝 Note'},{v:'call',l:'📞 Call Made'},{v:'text',l:'💬 Text Sent'},{v:'email',l:'✉️ Email Sent'},{v:'appointment',l:'📅 Appointment Set'},{v:'voicemail',l:'🔔 Voicemail Left'}]

const bc = s => { const m = {'Re-Engagement Buyer':'reb','Re-Engagement Seller':'res','Re-Engagement Past Client':'rep','Re-Engagement Investor':'rei','Re-Engagement Luxury':'rel','Hot':'hot','Past Client':'past','Sphere':'sphere','Referral':'referral','Closed':'closed'}; return m[s]||'new' }
const gc = g => g==='A+'?'gAP':g==='A'?'gA':g==='B'?'gB':g==='C'?'gC':'gD'
const sc = s => s>=80?'var(--green)':s>=65?'var(--blue)':s>=50?'var(--gold2)':s>=35?'var(--gray)':'var(--red)'
const isRE = l => (l?.stage||'').startsWith('Re-Engagement')
const isRevived = l => (l?.tags||'').includes('Revived Lead')
const fmtDate = iso => { if(!iso)return'—'; try{const d=new Date(iso),mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()],hr=d.getHours(),mn=String(d.getMinutes()).padStart(2,'0'),ap=hr>=12?'PM':'AM';return`${mo} ${d.getDate()}, ${d.getFullYear()} | ${hr%12||12}:${mn} ${ap}`}catch{return iso} }
const uid = () => 'l'+Date.now()+Math.random().toString(36).slice(2,6)

export default function CRM() {
  const [leads, setLeads] = useState([])
  const [arch, setArch] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('exec')
  const [user, setUser] = useState('Bri')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({col:'score',dir:-1})
  const [viewLead, setViewLead] = useState(null)
  const [notes, setNotes] = useState([])
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [editLead, setEditLead] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const PER = 50

  // Load all leads on mount
  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setLeads(data.filter(l => !l.is_archived))
        setArch(data.filter(l => l.is_archived))
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2800) }

  // Save lead (patch)
  const saveLead = async (lead) => {
    setSaving(true)
    await fetch('/api/leads', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(lead) })
    setSaving(false)
  }

  // Add note
  const addNote = async () => {
    if (!noteText.trim() || !viewLead) return
    const entry = { lead_id: viewLead.id, text: noteText.trim(), type: noteType, user_name: user }
    await fetch('/api/notes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(entry) })
    setNotes(prev => [{ ...entry, created_at: new Date().toISOString(), id: uid() }, ...prev])
    setNoteText('')
    showToast('✓ Note saved')
  }

  // Open lead — load notes
  const openLead = async (lead) => {
    setViewLead(lead)
    setNotes([])
    const r = await fetch(`/api/notes?lead_id=${lead.id}`)
    const data = await r.json()
    if (!data.error) setNotes(data)
  }

  // Mark revived
  const markRevived = async (lead) => {
    const tags = lead.tags?.includes('Revived Lead') ? lead.tags : (lead.tags ? lead.tags + ', Revived Lead' : 'Revived Lead')
    const updated = { ...lead, tags, is_revived: true }
    setLeads(prev => prev.map(l => l.id === lead.id ? updated : l))
    setViewLead(updated)
    await saveLead({ id: lead.id, tags, is_revived: true })
    showToast('🌟 ' + lead.name + ' marked as Revived')
  }

  // Archive lead
  const archiveLead = async (lead) => {
    const updated = { ...lead, is_archived: true, archived_on: new Date().toISOString().slice(0,10) }
    setLeads(prev => prev.filter(l => l.id !== lead.id))
    setArch(prev => [updated, ...prev])
    setViewLead(null)
    await saveLead({ id: lead.id, is_archived: true, archived_on: updated.archived_on })
    showToast(lead.name + ' archived')
  }

  // Restore from archive
  const restoreLead = async (lead) => {
    const updated = { ...lead, is_archived: false, archived_on: '' }
    setArch(prev => prev.filter(l => l.id !== lead.id))
    setLeads(prev => [updated, ...prev])
    await saveLead({ id: lead.id, is_archived: false, archived_on: '' })
    showToast(lead.name + ' restored')
  }

  // Save edit form
  const saveEdit = async (form) => {
    const updated = { ...editLead, ...form }
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    if (viewLead?.id === updated.id) setViewLead(updated)
    setEditLead(null)
    await saveLead(updated)
    showToast('✓ Lead updated')
  }

  // Add new lead
  const addNewLead = async (form) => {
    const lead = { ...form, id: uid(), score: 50, grade: 'C', is_archived: false, is_revived: false, added: new Date().toISOString().slice(0,10), orig_stage: form.stage }
    setLeads(prev => [lead, ...prev])
    await fetch('/api/leads', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(lead) })
    showToast('✓ Lead added')
  }

  // Filtered leads
  const filtered = leads.filter(l => {
    if (stageFilter !== 'all' && l.stage !== stageFilter) return false
    if (tagFilter && !(l.tags||'').toLowerCase().includes(tagFilter.toLowerCase())) return false
    if (search) {
      const q = search.toLowerCase()
      return (l.name||'').toLowerCase().includes(q) || (l.phone||'').includes(q) || (l.email||'').toLowerCase().includes(q) || (l.tags||'').toLowerCase().includes(q) || (l.city||'').toLowerCase().includes(q)
    }
    return true
  }).sort((a,b) => {
    if (sort.col === 'score') return ((b.score||0)-(a.score||0)) * sort.dir
    const av=(a[sort.col]||'').toLowerCase(), bv=(b[sort.col]||'').toLowerCase()
    return av<bv?-sort.dir:av>bv?sort.dir:0
  })

  const pages = Math.ceil(filtered.length / PER)
  const paged = filtered.slice((page-1)*PER, page*PER)
  const top5 = [...leads].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5)
  const revived = leads.filter(isRevived)
  const reLeads = leads.filter(isRE)

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen error={error} />

  return (
    <>
      <Head><title>Estēm Realty Group — CRM</title></Head>
      <div style={{fontFamily:'Georgia,serif',background:'var(--cream)',minHeight:'100vh',fontSize:13}}>

        {/* HEADER */}
        <div style={{background:'var(--black)',padding:'0 22px',display:'flex',alignItems:'center',justifyContent:'space-between',height:50,position:'sticky',top:0,zIndex:200}}>
          <div style={{color:'var(--cream)',fontSize:16,letterSpacing:1}}>Est<span style={{color:'var(--gold)'}}>ē</span>m Realty Group</div>
          <div style={{display:'flex',alignItems:'center',gap:10,fontSize:10,color:'var(--gray2)'}}>
            {saving && <span style={{color:'var(--gold)'}}>Saving...</span>}
            <span>{leads.length} CONTACTS</span>
          </div>
        </div>

        {/* NAV */}
        <div style={{background:'var(--cream2)',borderBottom:'1px solid var(--border)',display:'flex',padding:'0 22px',overflowX:'auto'}}>
          {[['exec','★ Executive'],['priorities','▲ AI Priorities'],['leads','All Leads'],['reactivation','↻ Reactivation'],['revived','✓ Revived'],['isa','ISA — Deena'],['archive','Archive']].map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{padding:'10px 13px',border:'none',background:'none',fontSize:11,color:tab===k?'var(--black)':'var(--gray)',borderBottom:tab===k?'2px solid var(--black)':'2px solid transparent',fontWeight:tab===k?'bold':'normal',whiteSpace:'nowrap',cursor:'pointer'}}>
              {l}
            </button>
          ))}
        </div>

        {/* USER BAR */}
        <div style={{background:'var(--black2)',padding:'4px 22px',display:'flex',alignItems:'center',gap:12,fontSize:10,color:'var(--gray2)'}}>
          <span>Logged in as: <strong style={{color:'var(--gold)'}}>{user}</strong></span>
          <span style={{marginLeft:'auto'}}>Switch:</span>
          {TEAM.filter(u=>u!=='Unassigned').map(u=>(
            <button key={u} onClick={()=>setUser(u)} style={{background:user===u?'var(--gold2)':'none',border:'1px solid var(--gray)',color:user===u?'white':'var(--gray2)',padding:'2px 8px',fontSize:9,fontFamily:'Georgia,serif',cursor:'pointer'}}>{u}</button>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{padding:'18px 22px',maxWidth:1500,margin:'0 auto'}}>

          {tab === 'exec' && <ExecTab leads={leads} revived={revived} reLeads={reLeads} top5={top5} openLead={openLead} />}
          {tab === 'priorities' && <PrioritiesTab leads={leads} revived={revived} openLead={openLead} />}
          {tab === 'leads' && (
            <LeadsTab
              paged={paged} filtered={filtered} leads={leads} search={search} setSearch={v=>{setSearch(v);setPage(1)}}
              stageFilter={stageFilter} setStageFilter={v=>{setStageFilter(v);setPage(1)}}
              tagFilter={tagFilter} setTagFilter={v=>{setTagFilter(v);setPage(1)}}
              sort={sort} setSort={setSort} page={page} setPage={setPage} pages={pages}
              openLead={openLead} archiveLead={archiveLead}
              markRevived={markRevived} setEditLead={setEditLead}
              addNewLead={addNewLead}
            />
          )}
          {tab === 'reactivation' && <ReactivationTab leads={leads} openLead={openLead} />}
          {tab === 'revived' && <RevivedTab revived={revived} openLead={openLead} />}
          {tab === 'isa' && <ISATab leads={leads} openLead={openLead} />}
          {tab === 'archive' && <ArchiveTab arch={arch} restoreLead={restoreLead} />}

        </div>

        {/* LEAD VIEW MODAL */}
        {viewLead && (
          <LeadModal
            lead={viewLead} notes={notes} user={user}
            noteText={noteText} setNoteText={setNoteText}
            noteType={noteType} setNoteType={setNoteType}
            addNote={addNote} markRevived={markRevived}
            archiveLead={archiveLead} setEditLead={setEditLead}
            close={()=>setViewLead(null)}
          />
        )}

        {/* EDIT MODAL */}
        {editLead && (
          <EditModal lead={editLead} saveEdit={saveEdit} close={()=>setEditLead(null)} />
        )}

        {/* TOAST */}
        {toast && (
          <div style={{position:'fixed',bottom:18,right:18,background:'var(--black)',color:'var(--cream)',padding:'8px 14px',fontSize:11,zIndex:3000,borderRadius:2}}>
            {toast}
          </div>
        )}
      </div>
    </>
  )
}

// ── LOADING / ERROR ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{position:'fixed',inset:0,background:'var(--black)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif'}}>
      <div style={{fontSize:22,color:'var(--cream)',letterSpacing:2,marginBottom:12}}>Est<span style={{color:'#C4A45A'}}>ē</span>m Realty Group</div>
      <div style={{fontSize:12,color:'#C4A45A',letterSpacing:1,marginBottom:20}}>AI OPERATING SYSTEM</div>
      <div style={{fontSize:11,color:'#9A9A96'}}>Loading your leads...</div>
    </div>
  )
}

function ErrorScreen({error}) {
  return (
    <div style={{position:'fixed',inset:0,background:'#1a0a0a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',color:'#f5f0e8',padding:32,textAlign:'center'}}>
      <div style={{fontSize:28,marginBottom:16}}>⚠</div>
      <div style={{fontSize:18,color:'#c0392b',marginBottom:12}}>Connection Error</div>
      <div style={{fontSize:13,background:'#2a1010',padding:16,borderRadius:4,maxWidth:480,lineHeight:1.8}}>{error}</div>
      <button onClick={()=>window.location.reload()} style={{marginTop:24,padding:'10px 28px',background:'#8B7355',color:'white',border:'none',fontFamily:'Georgia,serif',fontSize:14,cursor:'pointer',borderRadius:2}}>Retry</button>
    </div>
  )
}

// ── EXEC TAB ──────────────────────────────────────────────────────────────────
function ExecTab({leads,revived,reLeads,top5,openLead}) {
  const hot = leads.filter(l=>l.stage==='Hot')
  const past = leads.filter(l=>l.stage==='Past Client')
  const aplus = leads.filter(l=>l.grade==='A+'||l.grade==='A')
  return (
    <div>
      <div style={{fontFamily:'Georgia,serif',fontSize:18,marginBottom:3}}>Executive Command Center <em style={{color:'var(--gold2)',fontStyle:'italic'}}>— Estēm Realty Group</em></div>
      <div style={{fontSize:11,color:'var(--gray)',marginBottom:14}}>Reality-based AI briefing for Briana Wesley</div>
      <div style={{background:'linear-gradient(135deg,#FAF8F4,#F5EFE8)',border:'1px solid rgba(196,164,90,0.4)',borderLeft:'3px solid var(--gold)',padding:'12px 16px',marginBottom:14,fontSize:11,lineHeight:1.7}}>
        <div style={{fontFamily:'Georgia,serif',fontSize:13,color:'var(--gold2)',marginBottom:5}}>Current Reality of Your Database</div>
        749 of 821 leads are in Re-Engagement status. A lead is only "Active" when confirmed engagement has occurred. Use the Reactivation Pipeline to work through dormant leads systematically.
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:9,marginBottom:14}}>
        {[['Total Contacts',leads.length,'All records',''],['In Reactivation',reLeads.length,'Dormant','gold'],['Revived',revived.length,'Re-engaged','green'],['Hot',hot.length,'Verified active','red'],['Past Clients',past.length,'Preserved','blue'],['A/A+ Grade',aplus.length,'Top leads','']].map(([l,v,s,c])=>(
          <div key={l} style={{background:'white',border:'1px solid var(--border)',padding:'13px 15px'}}>
            <div style={{fontSize:9,letterSpacing:1,textTransform:'uppercase',color:'var(--gray)',marginBottom:4}}>{l}</div>
            <div style={{fontFamily:'Georgia,serif',fontSize:24,lineHeight:1,color:c==='gold'?'var(--gold2)':c==='green'?'var(--green)':c==='red'?'var(--red)':c==='blue'?'var(--blue)':'var(--black)'}}>{v}</div>
            <div style={{fontSize:10,color:'var(--gray2)',marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{background:'white',border:'1px solid var(--border)',padding:14}}>
          <div style={{fontSize:14,fontFamily:'Georgia,serif',marginBottom:3}}>Top 5 Leads Today</div>
          <div style={{fontSize:10,color:'var(--gray)',marginBottom:10}}>Ranked by AI score</div>
          {top5.map((l,i)=>(
            <div key={l.id} onClick={()=>openLead(l)} style={{background:'white',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',padding:'10px 12px',marginBottom:7,cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                <span style={{fontSize:10,color:'var(--gray2)',minWidth:16}}>#{i+1}</span>
                <GradeBadge grade={l.grade} />
                <strong style={{fontSize:11,flex:1}}>{l.name}</strong>
                <StageBadge stage={l.stage} />
              </div>
              <div style={{fontSize:10,color:'var(--gray)',lineHeight:1.5}}>{whyPriority(l)}</div>
            </div>
          ))}
        </div>
        <div style={{background:'white',border:'1px solid var(--border)',padding:14}}>
          <div style={{fontSize:14,fontFamily:'Georgia,serif',marginBottom:3}}>Revived Leads — Act Now</div>
          <div style={{fontSize:10,color:'var(--gray)',marginBottom:10}}>Responded after dormancy — highest close potential</div>
          {!revived.length && <div style={{fontSize:11,color:'var(--gray)',fontStyle:'italic'}}>No revived leads yet. Click "✓ Mark Revived" on any lead that responds.</div>}
          {revived.slice(0,6).map(l=>(
            <div key={l.id} onClick={()=>openLead(l)} style={{background:'linear-gradient(135deg,#F0FAF0,#E4F5E4)',border:'1px solid #6AB46A',padding:'10px 12px',marginBottom:7,cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <span style={{background:'#E4F5E4',color:'var(--green)',border:'1px solid #6AB46A',padding:'1px 6px',fontSize:9}}>✓</span>
                <strong style={{fontSize:11,flex:1}}>{l.name}</strong>
                <span style={{fontSize:9,color:'var(--gray)'}}>Orig: {l.orig_stage||'—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── PRIORITIES TAB ────────────────────────────────────────────────────────────
function PrioritiesTab({leads,revived,openLead}) {
  const sorted = [...leads].sort((a,b)=>(b.score||0)-(a.score||0))
  const PriList = ({items,title,why}) => (
    <div style={{background:'white',border:'1px solid var(--border)',padding:14,marginBottom:12}}>
      <div style={{fontSize:13,fontFamily:'Georgia,serif',marginBottom:10}}>{title}</div>
      {!items.length && <div style={{color:'var(--gray)',fontSize:11}}>None identified.</div>}
      {items.map((l,i)=>(
        <div key={l.id} onClick={()=>openLead(l)} style={{background:'white',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',padding:'10px 12px',marginBottom:7,cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
            <span style={{fontSize:10,color:'var(--gray2)',minWidth:16}}>#{i+1}</span>
            <GradeBadge grade={l.grade} />
            <strong style={{fontSize:11,flex:1}}>{l.name}</strong>
            <StageBadge stage={l.stage} />
          </div>
          <div style={{fontSize:10,color:'var(--gray)',lineHeight:1.5}}>{why?why(l):whyPriority(l)}</div>
        </div>
      ))}
    </div>
  )
  return (
    <div>
      <div style={{fontFamily:'Georgia,serif',fontSize:18,marginBottom:3}}>▲ AI Priority Engine</div>
      <div style={{fontSize:11,color:'var(--gray)',marginBottom:14}}>Leads ranked by real engagement signals — recency, response history, motivation, notes.</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <PriList items={sorted.slice(0,10)} title="Top 10 — Contact Today" />
        <PriList items={sorted.slice(10,20)} title="Next 10 Priority Leads" />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <PriList items={revived} title="Revived Leads — Highest Priority" why={()=>'Re-engaged after dormancy — treat as active prospect now'} />
        <PriList items={sorted.filter(l=>(l.notes||'').toLowerCase().includes('pre-approv')).slice(0,5)} title="Pre-Approval Signals in Notes" why={()=>'Historical notes indicate financing was in place'} />
      </div>
    </div>
  )
}

// ── LEADS TAB ─────────────────────────────────────────────────────────────────
function LeadsTab({paged,filtered,leads,search,setSearch,stageFilter,setStageFilter,tagFilter,setTagFilter,sort,setSort,page,setPage,pages,openLead,archiveLead,markRevived,setEditLead,addNewLead}) {
  const [showAdd, setShowAdd] = useState(false)
  const thStyle = col => ({textAlign:'left',padding:'6px 7px',borderBottom:'1px solid var(--border)',color:'var(--gray)',fontSize:10,fontFamily:'Georgia,serif',fontWeight:'normal',whiteSpace:'nowrap',cursor:'pointer',userSelect:'none'})
  const doSort = col => setSort(s => s.col===col?{col,dir:s.dir*-1}:{col,dir:col==='score'?-1:1})
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontFamily:'Georgia,serif',fontSize:18}}>All Leads</div>
          <div style={{fontSize:11,color:'var(--gray)'}}>Showing {filtered.length} of {leads.length} contacts</div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{background:'var(--black)',color:'var(--cream)',border:'none',padding:'6px 13px',fontSize:11,fontFamily:'Georgia,serif',cursor:'pointer'}}>+ Add Lead</button>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email, tags, city..." style={{padding:'5px 9px',border:'1px solid var(--border2)',background:'white',fontSize:11,outline:'none',flex:1,minWidth:200,maxWidth:340,fontFamily:'Georgia,serif'}} />
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
        {['all',...STAGES].map(s=>(
          <button key={s} onClick={()=>setStageFilter(s)} style={{padding:'4px 11px',border:'1px solid var(--border2)',background:stageFilter===s?'var(--black)':'white',color:stageFilter===s?'var(--cream)':'var(--gray)',fontSize:10,cursor:'pointer',fontFamily:'Georgia,serif'}}>
            {s==='all'?'All Stages':s}
          </button>
        ))}
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead>
            <tr>
              <th style={thStyle()} onClick={()=>doSort('name')}>Name</th>
              <th style={{...thStyle(),textAlign:'center'}}>Score</th>
              <th style={thStyle()} onClick={()=>doSort('stage')}>Stage</th>
              <th style={thStyle()}>Original Stage</th>
              <th style={thStyle()}>Source</th>
              <th style={thStyle()}>Phone</th>
              <th style={thStyle()}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(l=>(
              <tr key={l.id} style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='var(--cream)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                <td style={{padding:'7px 7px',borderBottom:'1px solid var(--border)',fontWeight:'bold',fontSize:11}} onClick={()=>openLead(l)}>
                  {l.name||'—'}{isRevived(l)&&<span style={{fontSize:9,color:'var(--green)',marginLeft:4}}>✓</span>}
                </td>
                <td style={{padding:'7px 7px',borderBottom:'1px solid var(--border)',textAlign:'center'}} onClick={()=>openLead(l)}>
                  <GradeBadge grade={l.grade} /><span style={{fontSize:10,color:sc(l.score||0),marginLeft:3}}>{l.score||0}</span>
                </td>
                <td style={{padding:'7px 7px',borderBottom:'1px solid var(--border)'}} onClick={()=>openLead(l)}><StageBadge stage={l.stage} /></td>
                <td style={{padding:'7px 7px',borderBottom:'1px solid var(--border)',fontSize:9,color:'var(--gray)',fontStyle:'italic'}} onClick={()=>openLead(l)}>{l.orig_stage&&l.orig_stage!==l.stage?l.orig_stage:'—'}</td>
                <td style={{padding:'7px 7px',borderBottom:'1px solid var(--border)',fontSize:10,color:'var(--gray)'}} onClick={()=>openLead(l)}>{l.source||'—'}</td>
                <td style={{padding:'7px 7px',borderBottom:'1px solid var(--border)',fontSize:10}} onClick={()=>openLead(l)}>{l.phone||'—'}</td>
                <td style={{padding:'7px 7px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',gap:3}}>
                    <Btn onClick={()=>markRevived(l)} green small>✓</Btn>
                    <Btn onClick={()=>setEditLead(l)} small>Edit</Btn>
                    <Btn onClick={()=>archiveLead(l)} gold small>Archive</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{display:'flex',gap:4,justifyContent:'center',marginTop:11,alignItems:'center'}}>
          {page>1&&<button onClick={()=>setPage(p=>p-1)} style={{padding:'3px 8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontFamily:'Georgia,serif',fontSize:11}}>← Prev</button>}
          <span style={{fontSize:10,color:'var(--gray)',padding:'0 6px'}}>Page {page} of {pages} ({filtered.length})</span>
          {page<pages&&<button onClick={()=>setPage(p=>p+1)} style={{padding:'3px 8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontFamily:'Georgia,serif',fontSize:11}}>Next →</button>}
        </div>
      )}
      {showAdd && <EditModal lead={{stage:'New Lead (Fresh)',type:'Buyer',source:'Facebook',assigned:'Bri'}} saveEdit={f=>{addNewLead(f);setShowAdd(false)}} close={()=>setShowAdd(false)} isNew />}
    </div>
  )
}

// ── REACTIVATION TAB ──────────────────────────────────────────────────────────
function ReactivationTab({leads,openLead}) {
  const cats = [
    ['Re-Engagement Buyer','var(--blue)'],['Re-Engagement Seller','var(--red)'],
    ['Re-Engagement Past Client','var(--gold2)'],['Re-Engagement Investor','var(--green)'],['Re-Engagement Luxury','var(--rust)']
  ]
  return (
    <div>
      <div style={{fontFamily:'Georgia,serif',fontSize:18,marginBottom:3}}>↻ Reactivation Pipeline</div>
      <div style={{fontSize:11,color:'var(--gray)',marginBottom:14}}>All dormant leads — exits only upon confirmed re-engagement</div>
      <div style={{background:'linear-gradient(135deg,#FAF8F4,#FAF6EC)',border:'1px solid rgba(196,164,90,0.35)',padding:12,marginBottom:14,fontSize:11,lineHeight:1.7}}>
        <div style={{fontFamily:'Georgia,serif',fontSize:12,color:'var(--gold2)',marginBottom:5}}>How to Exit This Pipeline</div>
        A lead exits only when: (1) They respond, (2) They schedule an appointment, or (3) They confirm current interest. Open the lead → click <strong>✓ Mark Revived</strong> → update their stage.
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:9,marginBottom:14}}>
        {cats.map(([stage,color])=>{
          const count = leads.filter(l=>l.stage===stage).length
          return <div key={stage} style={{background:'white',border:'1px solid var(--border)',padding:'13px 15px'}}>
            <div style={{fontSize:9,letterSpacing:1,textTransform:'uppercase',color:'var(--gray)',marginBottom:4}}>{stage.replace('Re-Engagement ','')}</div>
            <div style={{fontFamily:'Georgia,serif',fontSize:24,lineHeight:1,color}}>{count}</div>
          </div>
        })}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {cats.map(([stage,color])=>{
          const items = leads.filter(l=>l.stage===stage).sort((a,b)=>(b.score||0)-(a.score||0))
          if (!items.length) return null
          return (
            <div key={stage} style={{background:'white',border:'1px solid var(--border)',padding:14}}>
              <div style={{fontSize:13,fontFamily:'Georgia,serif',color,marginBottom:2}}>{stage} ({items.length})</div>
              <div style={{fontSize:9,color:'var(--gray)',marginBottom:10}}>Sorted by AI score</div>
              {items.slice(0,8).map(l=>(
                <div key={l.id} onClick={()=>openLead(l)} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}}>
                  <GradeBadge grade={l.grade} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:'bold',fontSize:11}}>{l.name}</div>
                    {l.notes&&<div style={{fontSize:9,color:'var(--gray)',lineHeight:1.3}}>{l.notes.slice(0,60)}...</div>}
                  </div>
                  <span style={{fontSize:9,color:'var(--gray)'}}>{l.score||0}</span>
                </div>
              ))}
              {items.length>8&&<div style={{fontSize:10,color:'var(--gray)',padding:'6px 0'}}>+{items.length-8} more</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── REVIVED TAB ───────────────────────────────────────────────────────────────
function RevivedTab({revived,openLead}) {
  return (
    <div>
      <div style={{fontFamily:'Georgia,serif',fontSize:18,marginBottom:3}}>✓ Revived Leads</div>
      <div style={{fontSize:11,color:'var(--gray)',marginBottom:14}}>Leads that have responded after dormancy</div>
      {!revived.length ? (
        <div style={{background:'linear-gradient(135deg,#FAF8F4,#FAF6EC)',border:'1px solid rgba(196,164,90,0.35)',padding:12,fontSize:11,lineHeight:1.7}}>
          No revived leads yet. When a lead responds, open their record and click <strong>✓ Mark Revived</strong>.
        </div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr>
              {['Name','Score','Stage','Original Stage','Phone','Tags'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 7px',borderBottom:'1px solid var(--border)',color:'var(--gray)',fontSize:10,fontFamily:'Georgia,serif',fontWeight:'normal'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {revived.map(l=>(
                <tr key={l.id} onClick={()=>openLead(l)} style={{cursor:'pointer'}}>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)',fontWeight:'bold'}}>{l.name}</td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)'}}><GradeBadge grade={l.grade} /></td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)'}}><StageBadge stage={l.stage} /></td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)',fontSize:9,color:'var(--gray)',fontStyle:'italic'}}>{l.orig_stage||'—'}</td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)',fontSize:10}}>{l.phone||'—'}</td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)',fontSize:9,color:'var(--gray)'}}>{(l.tags||'').split(',').slice(0,2).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── ISA TAB ───────────────────────────────────────────────────────────────────
function ISATab({leads,openLead}) {
  const pri = leads.filter(l=>(l.tags||'').includes('Re-Engagement Priority')).sort((a,b)=>(b.score||0)-(a.score||0))
  const ltr = leads.filter(l=>(l.tags||'').includes('Long-Term Reactivation')).sort((a,b)=>(b.score||0)-(a.score||0))
  const callList = [...pri.slice(0,8),...ltr.slice(0,6),...leads.filter(l=>l.stage==='Past Client').slice(0,4)].slice(0,20)
  return (
    <div>
      <div style={{fontFamily:'Georgia,serif',fontSize:18,marginBottom:3}}>ISA Reactivation System <em style={{color:'var(--gold2)',fontStyle:'italic'}}>— Deena</em></div>
      <div style={{fontSize:11,color:'var(--gray)',marginBottom:14}}>Daily mission: Lead reactivation — Mon–Thu 11am–6pm · Sat 9am–12pm</div>
      <div style={{background:'linear-gradient(135deg,#FAF8F4,#F5EFE8)',border:'1px solid rgba(196,164,90,0.4)',borderLeft:'3px solid var(--gold)',padding:'12px 16px',marginBottom:14,fontSize:11,lineHeight:1.7}}>
        <strong>Reality:</strong> All leads in your call list are confirmed dormant. Treat every contact as fresh cold outreach. Log every attempt. When someone responds, open their record and click <strong>✓ Mark Revived</strong> immediately.
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{background:'white',border:'1px solid var(--border)',padding:14}}>
          <div style={{fontSize:13,fontFamily:'Georgia,serif',marginBottom:10}}>Today's Call List (Top 20)</div>
          {callList.map((l,i)=>(
            <div key={l.id} onClick={()=>openLead(l)} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}}>
              <span style={{fontSize:10,color:'var(--gray2)',minWidth:18}}>{i+1}</span>
              <GradeBadge grade={l.grade} />
              <div style={{flex:1}}>
                <strong style={{fontSize:11}}>{l.name}</strong>
                <div style={{fontSize:9,color:'var(--gray)'}}>{l.phone||'No phone'}</div>
              </div>
              {(l.tags||'').includes('Re-Engagement Priority')&&<span style={{fontSize:8,padding:'2px 5px',background:'#FDE8E8',color:'#A32D2D',border:'1px solid #D08080'}}>PRI</span>}
            </div>
          ))}
        </div>
        <div>
          <div style={{background:'white',border:'1px solid var(--border)',padding:14,marginBottom:12}}>
            <div style={{fontSize:13,fontFamily:'Georgia,serif',marginBottom:10}}>Outreach Scripts</div>
            <div style={{fontSize:11,background:'var(--cream2)',padding:10,lineHeight:1.7}}>
              <strong>Text (send first):</strong><br/>"Hey [Name]! It's Briana from Estem Realty — it's been a while! I was thinking about you — are your real estate plans still on the radar? No pressure at all."<br/><br/>
              <strong>Call opening:</strong><br/>"Hi [Name], Briana Wesley with Estem Realty. Did I catch you at a good time? I know it's been a while — has anything changed with your real estate plans?"<br/><br/>
              <strong>Voicemail:</strong><br/>"Hi [Name], Briana Wesley with Estem Realty — thinking about you. Call or text me at [NUMBER] when you get a chance."
            </div>
          </div>
          <div style={{background:'white',border:'1px solid var(--border)',padding:14}}>
            <div style={{fontSize:13,fontFamily:'Georgia,serif',marginBottom:10}}>When They Respond</div>
            <ol style={{fontSize:11,lineHeight:1.8,paddingLeft:16}}>
              <li>Log the response in their notes</li>
              <li>Open their lead record</li>
              <li>Click <strong style={{color:'var(--green)'}}>✓ Mark Revived</strong></li>
              <li>Edit their stage to move them forward</li>
              <li>Alert Bri immediately for A/A+ grade leads</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ARCHIVE TAB ───────────────────────────────────────────────────────────────
function ArchiveTab({arch,restoreLead}) {
  const [search, setSearch] = useState('')
  const filtered = arch.filter(l=>!search||(l.name||'').toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <div style={{fontFamily:'Georgia,serif',fontSize:18,marginBottom:3}}>Archived Leads</div>
      <div style={{fontSize:11,color:'var(--gray)',marginBottom:14}}>Removed from active views. Restore anytime.</div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search archived..." style={{padding:'5px 9px',border:'1px solid var(--border2)',background:'white',fontSize:11,outline:'none',marginBottom:12,width:280,fontFamily:'Georgia,serif'}} />
      {!filtered.length ? <div style={{color:'var(--gray)',fontSize:12,textAlign:'center',padding:32}}>No archived leads.</div> : (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr>
              {['Name','Stage','Source','Phone','Archived',''].map(h=><th key={h} style={{textAlign:'left',padding:'6px 7px',borderBottom:'1px solid var(--border)',color:'var(--gray)',fontSize:10,fontFamily:'Georgia,serif',fontWeight:'normal'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(l=>(
                <tr key={l.id} style={{opacity:0.7}}>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)',fontWeight:'bold'}}>{l.name}</td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)'}}><StageBadge stage={l.stage} /></td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)',fontSize:10,color:'var(--gray)'}}>{l.source||'—'}</td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)',fontSize:10}}>{l.phone||'—'}</td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)',fontSize:10,color:'var(--gray)'}}>{l.archived_on||'—'}</td>
                  <td style={{padding:'7px',borderBottom:'1px solid var(--border)'}}><Btn onClick={()=>restoreLead(l)} small>Restore</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── LEAD VIEW MODAL ───────────────────────────────────────────────────────────
function LeadModal({lead,notes,user,noteText,setNoteText,noteType,setNoteType,addNote,markRevived,archiveLead,setEditLead,close}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'22px 14px',overflowY:'auto'}} onClick={e=>e.target===e.currentTarget&&close()}>
      <div style={{background:'white',width:'100%',maxWidth:900,padding:22,position:'relative',margin:'auto'}}>
        <button onClick={close} style={{position:'absolute',top:11,right:14,background:'none',border:'none',fontSize:19,cursor:'pointer',color:'var(--gray)'}}>×</button>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontFamily:'Georgia,serif',fontSize:18,marginBottom:5}}>{lead.name}</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              <StageBadge stage={lead.stage} />
              <GradeBadge grade={lead.grade} />
              {isRevived(lead)&&<span style={{background:'#E4F5E4',color:'var(--green)',border:'1px solid #6AB46A',padding:'2px 7px',fontSize:9}}>✓ Revived</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            <Btn onClick={()=>markRevived(lead)} green small>✓ Mark Revived</Btn>
            <Btn onClick={()=>setEditLead(lead)} small>✏ Edit</Btn>
            <Btn onClick={()=>archiveLead(lead)} gold small>Archive</Btn>
            <Btn onClick={close} small>Close</Btn>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
          {/* Col 1: Info */}
          <div>
            <Section>Contact Information</Section>
            <Field label="Phone">{lead.phone||'—'}</Field>
            <Field label="Email"><span style={{wordBreak:'break-all',fontSize:10}}>{lead.email||'—'}</span></Field>
            <Field label="City / State">{[lead.city,lead.state].filter(Boolean).join(', ')||'—'}</Field>
            <Field label="Date Added">{lead.added||'—'}</Field>
            <Field label="Follow-up">{lead.followup||'—'}</Field>
            <Section style={{marginTop:14}}>Lead Details</Section>
            <Field label="Stage"><StageBadge stage={lead.stage} /></Field>
            <Field label="Original Stage"><span style={{fontSize:10,color:'var(--gray)',fontStyle:'italic'}}>{lead.orig_stage||'—'}</span></Field>
            <Field label="Type">{lead.type||'—'}</Field>
            <Field label="Source">{lead.source||'—'}</Field>
            <Field label="Assigned">{lead.assigned||'Unassigned'}</Field>
            <Field label="AI Score"><strong style={{color:sc(lead.score||0)}}>{lead.score||0}/100</strong> — Grade: <strong>{lead.grade||'D'}</strong></Field>
            <Field label="Budget">{lead.budget||'—'}</Field>
            <Field label="Pre-Approval">{lead.preapproval||'—'}</Field>
            <Section style={{marginTop:14}}>Tags</Section>
            <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
              {(lead.tags||'').split(',').map(t=>t.trim()).filter(Boolean).map(t=>(
                <span key={t} style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 7px',fontSize:9,border:'1px solid var(--border2)',background:'var(--cream2)'}}>{t}</span>
              ))}
            </div>
            <Section style={{marginTop:14}}>AI Recommendation</Section>
            <div style={{background:'linear-gradient(135deg,#FAF8F4,#FAF6EC)',border:'1px solid rgba(196,164,90,0.35)',padding:12,fontSize:11,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:genRec(lead)}} />
          </div>

          {/* Col 2: Add Note */}
          <div>
            <Section>Add Activity Note</Section>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,letterSpacing:0.8,textTransform:'uppercase',color:'var(--gray)',marginBottom:3}}>Activity Type</div>
              <select value={noteType} onChange={e=>setNoteType(e.target.value)} style={{width:'100%',padding:'5px',border:'1px solid var(--border2)',background:'var(--cream)',fontFamily:'Georgia,serif',fontSize:11}}>
                {NOTE_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Enter note, call outcome, text response, appointment details..." rows={5} style={{width:'100%',marginBottom:6,fontFamily:'Georgia,serif',fontSize:11,padding:8,border:'1px solid var(--border2)',background:'var(--cream)',resize:'vertical'}} />
            <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:14}}>
              <button onClick={addNote} style={{flex:1,background:'var(--black)',color:'var(--cream)',border:'none',padding:'6px 13px',fontSize:11,fontFamily:'Georgia,serif',cursor:'pointer'}}>✓ Save Note</button>
              <div style={{fontSize:9,color:'var(--gray)',textAlign:'right'}}>Logged as:<br/><strong>User</strong></div>
            </div>
            <Section>Quick Scripts</Section>
            <div style={{fontSize:11,background:'var(--cream2)',padding:10,lineHeight:1.8,borderRadius:2}}>
              <strong>Text:</strong> "Hey {(lead.name||'').split(' ')[0]||'there'}! It's Briana from Estem Realty. It's been a while — are your real estate plans still on the radar?"<br/><br/>
              <strong>Call:</strong> "Hi {(lead.name||'').split(' ')[0]||'there'}, Briana Wesley with Estem Realty. Did I catch you at a good time? I wanted to personally reconnect about your real estate plans."
            </div>
          </div>

          {/* Col 3: Timeline */}
          <div>
            <Section>Activity Timeline</Section>
            <div style={{maxHeight:520,overflowY:'auto'}}>
              {!notes.length && lead.notes && (
                <div style={{display:'flex',gap:9,padding:'8px 0',borderBottom:'1px solid var(--border)',alignItems:'flex-start'}}>
                  <div style={{fontSize:14,width:22,textAlign:'center',flexShrink:0}}>📝</div>
                  <div>
                    <div style={{fontSize:9,color:'var(--gray)',marginBottom:2}}>Historical Note</div>
                    <div style={{fontSize:11,color:'var(--black2)',lineHeight:1.5}}>{lead.notes}</div>
                  </div>
                </div>
              )}
              {!notes.length && !lead.notes && <div style={{color:'var(--gray)',fontSize:11,fontStyle:'italic',padding:8}}>No activity recorded yet.</div>}
              {notes.map(n=>{
                const icons = {note:'📝',call:'📞',text:'💬',email:'✉️',appointment:'📅',voicemail:'🔔'}
                const colors = {note:'var(--black)',call:'var(--blue)',text:'var(--green)',email:'var(--gold2)',appointment:'var(--red)',voicemail:'var(--gray)'}
                return (
                  <div key={n.id} style={{display:'flex',gap:9,padding:'8px 0',borderBottom:'1px solid var(--border)',alignItems:'flex-start'}}>
                    <div style={{fontSize:14,width:22,textAlign:'center',flexShrink:0,color:colors[n.type]||'var(--gray)'}}>{icons[n.type]||'•'}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:9,color:'var(--gray)',marginBottom:2}}>{fmtDate(n.created_at)} &nbsp;|&nbsp; <strong>{n.user_name||'System'}</strong></div>
                      <div style={{fontSize:11,color:'var(--black2)',lineHeight:1.5}}>{n.text}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────────
function EditModal({lead,saveEdit,close,isNew}) {
  const [form, setForm] = useState({
    name: lead.name||'', phone: lead.phone||'', email: lead.email||'',
    city: lead.city||'', state: lead.state||'TX', stage: lead.stage||STAGES[0],
    type: lead.type||'Buyer', source: lead.source||'Facebook',
    assigned: lead.assigned||'Bri', budget: lead.budget||'',
    followup: lead.followup||'', preapproval: lead.preapproval||'',
    tags: lead.tags||'', notes: '', priority: lead.priority||''
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const submit = () => {
    if (!form.name.trim()) { alert('Please enter a name.'); return }
    saveEdit({ ...lead, ...form, id: lead.id||undefined })
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'22px 14px',overflowY:'auto'}} onClick={e=>e.target===e.currentTarget&&close()}>
      <div style={{background:'white',width:'100%',maxWidth:700,padding:22,position:'relative',margin:'auto'}}>
        <button onClick={close} style={{position:'absolute',top:11,right:14,background:'none',border:'none',fontSize:19,cursor:'pointer',color:'var(--gray)'}}>×</button>
        <div style={{fontFamily:'Georgia,serif',fontSize:18,marginBottom:14}}>{isNew?'Add New Lead':'Edit Lead'}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:9,marginBottom:9}}>
          <FField label="Full Name *"><input value={form.name} onChange={e=>set('name',e.target.value)} style={inp} /></FField>
          <FField label="Phone"><input value={form.phone} onChange={e=>set('phone',e.target.value)} style={inp} /></FField>
          <FField label="Email"><input value={form.email} onChange={e=>set('email',e.target.value)} style={inp} /></FField>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:9,marginBottom:9}}>
          <FField label="City"><input value={form.city} onChange={e=>set('city',e.target.value)} style={inp} /></FField>
          <FField label="State"><input value={form.state} onChange={e=>set('state',e.target.value)} style={inp} /></FField>
          <FField label="Stage"><select value={form.stage} onChange={e=>set('stage',e.target.value)} style={inp}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></FField>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:9,marginBottom:9}}>
          <FField label="Type"><select value={form.type} onChange={e=>set('type',e.target.value)} style={inp}>{TYPES.map(s=><option key={s}>{s}</option>)}</select></FField>
          <FField label="Source"><select value={form.source} onChange={e=>set('source',e.target.value)} style={inp}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></FField>
          <FField label="Assigned To"><select value={form.assigned} onChange={e=>set('assigned',e.target.value)} style={inp}>{TEAM.map(s=><option key={s}>{s}</option>)}</select></FField>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:9}}>
          <FField label="Budget"><input value={form.budget} onChange={e=>set('budget',e.target.value)} placeholder="e.g. $350K–$450K" style={inp} /></FField>
          <FField label="Next Follow-up"><input value={form.followup} onChange={e=>set('followup',e.target.value)} placeholder="e.g. June 15" style={inp} /></FField>
        </div>
        <FField label="Tags"><input value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="Comma separated tags" style={inp} /></FField>
        <div style={{marginTop:9}}><FField label="Notes"><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} placeholder="Notes, motivation, timeline..." style={{...inp,resize:'vertical'}} /></FField></div>
        <div style={{display:'flex',gap:7,marginTop:14,paddingTop:12,borderTop:'1px solid var(--border)'}}>
          <button onClick={submit} style={{background:'var(--black)',color:'var(--cream)',border:'none',padding:'6px 13px',fontSize:11,fontFamily:'Georgia,serif',cursor:'pointer'}}>Save Lead</button>
          <button onClick={close} style={{background:'white',border:'1px solid var(--border2)',padding:'6px 13px',fontSize:11,fontFamily:'Georgia,serif',cursor:'pointer'}}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
const stageColors = {reb:['#FFF0E0','#6B3000','#D4820A'],res:['#FFF0F0','#6B0000','#C42020'],rep:['#EEE8FF','#3A0080','#8850D0'],rei:['#E0F0FF','#00306B','#0A6AB4'],rel:['#FFF8E0','#4A3000','#C4A020'],hot:['#FDE8E8','#A32D2D','#D08080'],past:['#EDE8F5','#4A2880','#9A78C0'],sphere:['#F5EAF0','#8B2860','#D070A0'],referral:['#EAF0F5','#1A4A70','#6898C0'],closed:['#E8E8E8','#444','#AAA'],new:['#F0EDE6','#4A4035','#C9C0AA']}
function StageBadge({stage}) {
  const k = bc(stage); const [bg,color,border] = stageColors[k]||stageColors.new
  return <span style={{display:'inline-block',padding:'2px 7px',fontSize:9,letterSpacing:0.3,border:`1px solid ${border}`,background:bg,color}}>{stage}</span>
}

const gradeColors = {gAP:['#FAF0DC','#6B4400','#C4A45A'],gA:['#EDF5E4','#2F5E1A','#7AAA5A'],gB:['#E8F0F8','#1A4A80','#7098C8'],gC:['#F5EEDF','#7A5000','#D4A030'],gD:['#F5ECEC','#8B2020','#D08080']}
function GradeBadge({grade}) {
  const k = gc(grade||'D'); const [bg,color,border] = gradeColors[k]||gradeColors.gD
  return <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:22,height:22,fontFamily:'Georgia,serif',fontSize:9,fontWeight:'bold',border:`1.5px solid ${border}`,background:bg,color}}>{grade||'D'}</span>
}

function Btn({children,onClick,small,green,gold,red}) {
  const bg = green?'var(--green)':gold?'var(--gold)':red?'var(--red)':'white'
  const col = (green||gold||red)?'white':'var(--black)'
  return <button onClick={onClick} style={{fontFamily:'Georgia,serif',fontSize:small?10:11,padding:small?'3px 8px':'6px 13px',border:'1px solid var(--border2)',background:bg,color:col,cursor:'pointer'}}>{children}</button>
}
function Section({children,style}) { return <div style={{fontSize:9,letterSpacing:1,textTransform:'uppercase',color:'var(--gray)',marginBottom:6,borderBottom:'1px solid var(--border)',paddingBottom:3,marginTop:0,...style}}>{children}</div> }
function Field({label,children}) { return <div style={{display:'flex',gap:9,marginBottom:5,fontSize:11}}><span style={{color:'var(--gray)',minWidth:105,flexShrink:0}}>{label}</span><span>{children}</span></div> }
function FField({label,children}) { return <div><div style={{fontSize:9,letterSpacing:0.8,textTransform:'uppercase',color:'var(--gray)',marginBottom:3}}>{label}</div>{children}</div> }
const inp = {fontFamily:'Georgia,serif',fontSize:11,width:'100%',padding:'7px 8px',border:'1px solid var(--border2)',background:'var(--cream)',color:'var(--black)',outline:'none'}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function whyPriority(l) {
  const n = (l.notes||'').toLowerCase(), s = l.source||'', stage = l.stage||''
  const reasons = []
  if (n.includes('pre-approv')) reasons.push('Pre-approval on file')
  if (n.includes('spoke')||n.includes('talked')||n.includes('connected')) reasons.push('Previous live conversation')
  if (n.includes('ready')||n.includes('motivated')||n.includes('asap')) reasons.push('Motivation signals in notes')
  if (s==='Referral'||s==='Compass Referral') reasons.push('Referral source — highest trust')
  if (s==='Open House') reasons.push('Open house — showed active interest')
  if (stage==='Past Client') reasons.push('Past client — strong referral potential')
  if (stage==='Hot') reasons.push('Confirmed hot lead')
  return reasons.slice(0,2).join(' · ') || 'High AI score — strong outreach opportunity'
}

function genRec(l) {
  const n=(l.notes||'').toLowerCase(), stage=l.stage||'', lcd=l.lcd||0
  let why='Lead needs follow-up.',na='Call or text to reconnect.',fu='Within 3 days'
  if (stage.startsWith('Re-Engagement')) {
    if (lcd>730){why='Dormant 2+ years.';na='Send a casual market update text.';fu='This week'}
    else if (lcd>365){why='Dormant 12+ months.';na='Text → Email day 4 → Call day 7.';fu='Today'}
    else{why='Dormant 90+ days.';na='Send a curiosity-based text.';fu='Today'}
  } else if (stage==='Hot'){why='Hot lead — act immediately.';na='Confirm appointment and prepare CMA.';fu='Today'}
  else if (stage==='Past Client'){why='Past clients are your highest-ROI referral source.';na='Send a personal check-in text.';fu='Monthly'}
  if (n.includes('pre-approv')){why='Has financing — ready to act now.';na='Send listings matching their criteria.';fu='Today'}
  return `<strong>Why this lead matters:</strong> ${why}<br><strong>Next action:</strong> ${na}<br><strong>Follow-up:</strong> ${fu}`
}
