import { useState, useEffect, useMemo, useRef } from "react";
import Head from "next/head";

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES = [
  "Re-Engagement Buyer","Re-Engagement Seller","Re-Engagement Past Client",
  "Re-Engagement Investor","Re-Engagement Luxury","Hot","Past Client",
  "Sphere","Referral","Closed","New Lead (Fresh)",
];
const SOURCES = [
  "Facebook","Referral","Zillow","Zurple/IDX","Open House","Sphere",
  "Instagram","Sign Call","Other","Import/Legacy","Unknown","Compass Referral","Company",
];
const TYPES = ["Buyer","Seller","Buyer, Seller","Investor","Renter","Vendor","Lender","Unclassified"];
const USERS = ["Bri","Joseph","Deena","Unassigned"];
const NOTE_TYPES = [
  {v:"note",l:"📝 Note"},{v:"call",l:"📞 Call Made"},{v:"text",l:"💬 Text Sent"},
  {v:"email",l:"✉️ Email Sent"},{v:"appointment",l:"📅 Appointment Set"},{v:"voicemail",l:"🔔 Voicemail Left"},
];

// ─── Tag presets — Bri's real workflow ────────────────────────────────────────
const TAG_PRESETS = [
  "Spoke To","No Answer","Follow Up","Hot","Warm","Cold",
  "Buyer","Seller","Newsletter","Past Client","Sphere",
  "Appointment Set","Needs Financing","Not Interested","Call Back",
  "Texted","Emailed","Pre-Approved","Revived Lead","Re-Engagement Priority",
  "Long-Term Reactivation","Investor","Luxury","Do Not Contact",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const stageKey = (s) => ({
  "Re-Engagement Buyer":"reb","Re-Engagement Seller":"res","Re-Engagement Past Client":"rep",
  "Re-Engagement Investor":"rei","Re-Engagement Luxury":"rel","Hot":"hot","Past Client":"past",
  "Sphere":"sphere","Referral":"referral","Closed":"closed",
})[s] || "new";

const gradeKey = (g) =>
  g==="A+"?"gAP":g==="A"?"gA":g==="B"?"gB":g==="C"?"gC":"gD";

const scoreColor = (s) =>
  s>=80?"var(--green)":s>=65?"var(--blue)":s>=50?"var(--gold2)":s>=35?"var(--gray)":"var(--red)";

const isReEngagement = (l) => (l?.stage||"").startsWith("Re-Engagement");
const isRevived = (l) => (l?.tags||"").includes("Revived Lead");

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const t = new Date(d);
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][t.getMonth()];
    const h = t.getHours(), mi = String(t.getMinutes()).padStart(2,"0");
    return `${mo} ${t.getDate()}, ${t.getFullYear()} | ${h%12||12}:${mi} ${h>=12?"PM":"AM"}`;
  } catch { return d; }
};

const uid = () => "l" + Date.now() + Math.random().toString(36).slice(2,6);

// ─── Stage & Grade badge colours ──────────────────────────────────────────────
const STAGE_COLORS = {
  reb:["#FFF0E0","#6B3000","#D4820A"],res:["#FFF0F0","#6B0000","#C42020"],
  rep:["#EEE8FF","#3A0080","#8850D0"],rei:["#E0F0FF","#00306B","#0A6AB4"],
  rel:["#FFF8E0","#4A3000","#C4A020"],hot:["#FDE8E8","#A32D2D","#D08080"],
  past:["#EDE8F5","#4A2880","#9A78C0"],sphere:["#F5EAF0","#8B2860","#D070A0"],
  referral:["#EAF0F5","#1A4A70","#6898C0"],closed:["#E8E8E8","#444","#AAA"],
  new:["#F0EDE6","#4A4035","#C9C0AA"],
};
const GRADE_COLORS = {
  gAP:["#FAF0DC","#6B4400","#C4A45A"],gA:["#EDF5E4","#2F5E1A","#7AAA5A"],
  gB:["#E8F0F8","#1A4A80","#7098C8"],gC:["#F5EEDF","#7A5000","#D4A030"],
  gD:["#F5ECEC","#8B2020","#D08080"],
};

// ─── Shared micro-components ──────────────────────────────────────────────────
function StagePill({ stage }) {
  const [bg,fg,border] = STAGE_COLORS[stageKey(stage)] || STAGE_COLORS.new;
  return <span style={{display:"inline-block",padding:"2px 7px",fontSize:9,letterSpacing:.3,border:`1px solid ${border}`,background:bg,color:fg}}>{stage}</span>;
}
function GradeBadge({ grade }) {
  const [bg,fg,border] = GRADE_COLORS[gradeKey(grade||"D")] || GRADE_COLORS.gD;
  return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,fontFamily:"Georgia,serif",fontSize:9,fontWeight:"bold",border:`1.5px solid ${border}`,background:bg,color:fg}}>{grade||"D"}</span>;
}
function Btn({ children, onClick, small, green, gold, red, style={} }) {
  return <button onClick={onClick} style={{fontFamily:"Georgia,serif",fontSize:small?10:11,padding:small?"3px 8px":"6px 13px",border:"1px solid var(--border2)",background:green?"var(--green)":gold?"var(--gold)":red?"var(--red)":"white",color:green||gold||red?"white":"var(--black)",cursor:"pointer",...style}}>{children}</button>;
}
function SectionLabel({ children, style={} }) {
  return <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--gray)",marginBottom:6,borderBottom:"1px solid var(--border)",paddingBottom:3,...style}}>{children}</div>;
}
function FieldRow({ label, children }) {
  return <div style={{display:"flex",gap:9,marginBottom:5,fontSize:11}}><span style={{color:"var(--gray)",minWidth:105,flexShrink:0}}>{label}</span><span>{children}</span></div>;
}
function FormField({ label, children }) {
  return <div><div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--gray)",marginBottom:3}}>{label}</div>{children}</div>;
}
const INPUT = {fontFamily:"Georgia,serif",fontSize:11,width:"100%",padding:"7px 8px",border:"1px solid var(--border2)",background:"var(--cream)",color:"var(--black)",outline:"none"};

function CopyBtn({ text, label="Copy" }) {
  const [ok,setOk] = useState(false);
  return <button onClick={()=>{navigator.clipboard.writeText(text);setOk(true);setTimeout(()=>setOk(false),2000);}} style={{fontSize:9,padding:"2px 8px",background:ok?"var(--green)":"var(--black)",color:"white",border:"none",fontFamily:"Georgia,serif",cursor:"pointer"}}>{ok?"✓ Copied":label}</button>;
}

// ─── Loading / Error screens ──────────────────────────────────────────────────
function LoadingScreen() {
  return <div style={{position:"fixed",inset:0,background:"var(--black)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
    <div style={{fontSize:22,color:"var(--cream)",letterSpacing:2,marginBottom:12}}>Est<span style={{color:"#C4A45A"}}>ē</span>m Realty Group</div>
    <div style={{fontSize:12,color:"#C4A45A",letterSpacing:1,marginBottom:20}}>AI OPERATING SYSTEM</div>
    <div style={{fontSize:11,color:"#9A9A96"}}>Loading your leads...</div>
  </div>;
}
function ErrorScreen({ error }) {
  return <div style={{position:"fixed",inset:0,background:"#1a0a0a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",color:"#f5f0e8",padding:32,textAlign:"center"}}>
    <div style={{fontSize:28,marginBottom:16}}>⚠</div>
    <div style={{fontSize:18,color:"#c0392b",marginBottom:12}}>Connection Error</div>
    <div style={{fontSize:13,background:"#2a1010",padding:16,maxWidth:480,lineHeight:1.8}}>{error}</div>
    <button onClick={()=>window.location.reload()} style={{marginTop:24,padding:"10px 28px",background:"#8B7355",color:"white",border:"none",fontFamily:"Georgia,serif",fontSize:14,cursor:"pointer"}}>Retry</button>
  </div>;
}

// ─── Phone / CTA strip ───────────────────────────────────────────────────────
function PhoneStrip({ phone }) {
  const [copied,setCopied] = useState(false);
  const clean = (phone||"").replace(/\D/g,"");
  const e164 = clean ? (clean.length===10?"+1"+clean:"+"+clean) : null;
  if (!phone) return <div style={{fontSize:10,color:"var(--gray)",fontStyle:"italic",marginBottom:8}}>No phone number on file.</div>;
  return <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
    <a href={`tel:${e164||phone}`} style={{textDecoration:"none"}}><button style={{background:"var(--green)",color:"white",border:"none",padding:"5px 12px",fontSize:10,fontFamily:"Georgia,serif",cursor:"pointer"}}>📞 Call</button></a>
    <a href={`sms:${e164||phone}`} style={{textDecoration:"none"}}><button style={{background:"var(--blue)",color:"white",border:"none",padding:"5px 12px",fontSize:10,fontFamily:"Georgia,serif",cursor:"pointer"}}>💬 Text</button></a>
    <button onClick={()=>{navigator.clipboard.writeText(phone);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{background:copied?"var(--green)":"white",color:copied?"white":"var(--black)",border:"1px solid var(--border2)",padding:"5px 12px",fontSize:10,fontFamily:"Georgia,serif",cursor:"pointer"}}>{copied?"✓ Copied":"📋 Copy Number"}</button>
    <span style={{fontSize:10,color:"var(--gray)"}}>{phone}</span>
  </div>;
}

// ─── AI Insight block ─────────────────────────────────────────────────────────
function AIInsight({ lead }) {
  const notes = (lead.notes||"").toLowerCase();
  const stage = lead.stage||"";
  const lcd = lead.lcd||0;
  let why="Lead needs follow-up.", action="Call or text to reconnect.", when="Within 3 days";
  if (stage.startsWith("Re-Engagement")) {
    if (lcd>730){why="Dormant 2+ years.";action="Send a casual market update text.";when="This week";}
    else if (lcd>365){why="Dormant 12+ months.";action="Text → Email day 4 → Call day 7.";when="Today";}
    else{why="Dormant 90+ days.";action="Send a curiosity-based text.";when="Today";}
  } else if (stage==="Hot"){why="Hot lead — act immediately.";action="Confirm appointment and prepare CMA.";when="Today";}
  else if (stage==="Past Client"){why="Past clients are your highest-ROI referral source.";action="Send a personal check-in text.";when="Monthly";}
  if (notes.includes("pre-approv")){why="Has financing — ready to act now.";action="Send listings matching their criteria.";when="Today";}
  return <div style={{background:"linear-gradient(135deg,#FAF8F4,#FAF6EC)",border:"1px solid rgba(196,164,90,0.35)",padding:12,fontSize:11,lineHeight:1.7}}>
    <strong>Why this lead matters:</strong> {why}<br/>
    <strong>Next action:</strong> {action}<br/>
    <strong>Follow-up:</strong> {when}
  </div>;
}

// ─── AI Live Result (Phase 2A) ────────────────────────────────────────────────
function AILiveResult({ result }) {
  const tempColor = {Hot:"var(--red)",Warm:"var(--gold2)",Cold:"var(--blue)",Dormant:"var(--gray)"}[result.temperature]||"var(--gray)";
  const [pscp,setPscp] = useState(false);
  const [escp,setEscp] = useState(false);
  return <div style={{fontSize:11,lineHeight:1.7}}>
    <div style={{background:"linear-gradient(135deg,#FAF8F4,#FAF6EC)",border:"1px solid rgba(196,164,90,0.35)",padding:"10px 12px",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:9,fontWeight:"bold",padding:"2px 7px",border:`1px solid ${tempColor}`,color:tempColor,background:"white"}}>{result.temperature}</span>
        <span style={{fontSize:10,color:"var(--black)",fontStyle:"italic"}}>{result.lead_summary}</span>
      </div>
      <div style={{fontSize:10}}><strong>Why now:</strong> {result.priority_reason}</div>
      <div style={{fontSize:10,marginTop:3}}><strong>Next action:</strong> {result.next_action}</div>
      <div style={{fontSize:10,marginTop:3}}><strong>Follow-up:</strong> {result.follow_up_timing}</div>
      {result.conversation_starter&&<div style={{fontSize:10,marginTop:3,background:"white",padding:"4px 8px",border:"1px solid var(--border)"}}><strong>Opener:</strong> "{result.conversation_starter}"</div>}
    </div>
    {result.ps&&<div style={{background:"white",border:"1px solid var(--border)",padding:"8px 10px",marginBottom:6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontSize:9,fontWeight:"bold",color:"var(--gold2)",letterSpacing:.5}}>📱 LIVE TEXT/CALL SCRIPT</div>
        <button onClick={()=>{navigator.clipboard.writeText(result.ps);setPscp(true);setTimeout(()=>setPscp(false),2000);}} style={{fontSize:8,padding:"2px 7px",background:pscp?"var(--green)":"var(--black)",color:"white",border:"none",fontFamily:"Georgia,serif",cursor:"pointer"}}>{pscp?"✓ Copied":"Copy"}</button>
      </div>
      <div style={{fontSize:11,lineHeight:1.6,color:"var(--black2)"}}>{result.ps}</div>
    </div>}
    {result.es&&<div style={{background:"white",border:"1px solid var(--border)",padding:"8px 10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontSize:9,fontWeight:"bold",color:"var(--gold2)",letterSpacing:.5}}>✉ LIVE EMAIL DRAFT</div>
        <button onClick={()=>{navigator.clipboard.writeText(result.es);setEscp(true);setTimeout(()=>setEscp(false),2000);}} style={{fontSize:8,padding:"2px 7px",background:escp?"var(--green)":"var(--black)",color:"white",border:"none",fontFamily:"Georgia,serif",cursor:"pointer"}}>{escp?"✓ Copied":"Copy"}</button>
      </div>
      <div style={{fontSize:11,lineHeight:1.7,color:"var(--black2)",whiteSpace:"pre-line"}}>{result.es}</div>
    </div>}
  </div>;
}

// ─── Script Library ───────────────────────────────────────────────────────────
function ScriptLibrary({ lead, setNoteText }) {
  const fn = (lead.name||"").split(" ")[0]||"there";
  const [active,setActive] = useState(null);
  const [body,setBody] = useState("");
  const [copied,setCopied] = useState(false);

  const scripts = [
    {cat:"Re-Engagement",label:"Warm Text",body:`Hey ${fn}! It's Bri from Estēm Realty — it's been a while! Are your real estate plans still on the radar? No pressure 😊`},
    {cat:"Re-Engagement",label:"Direct Text",body:`Hi ${fn}, Bri Wesley with Estēm Realty. Just checking in — still thinking about buying/selling?`},
    {cat:"Re-Engagement",label:"Soft Follow-up",body:`Hey ${fn}, Bri here — just following up on my last message. No pressure at all, just want to make sure you have what you need.`},
    {cat:"Re-Engagement",label:"Luxury/Professional",body:`Hi ${fn}, this is Bri Wesley with Estēm Realty Group. I wanted to personally reconnect — the market has shifted in ways that could benefit your position. Would love to catch up when you have a moment.`},
    {cat:"Re-Engagement",label:"Long Dormant (2+ yrs)",body:`Hi ${fn}, it's Bri Wesley with Estēm Realty. I know it's been a while — I just wanted to reach out personally and see how you're doing. If real estate is ever back on the radar, I'm here. No pressure at all!`},
    {cat:"Buyer",label:"New Listings Alert",body:`Hi ${fn}! Bri here — some new listings just hit the market that match your criteria. Want me to send them your way?`},
    {cat:"Buyer",label:"Pre-Approval Check",body:`Hi ${fn}, Bri Wesley here. Have you had a chance to connect with a lender yet? I have a few great referrals if you need one — happy to help!`},
    {cat:"Buyer",label:"After Showing",body:`Hi ${fn}! Bri here — just wanted to follow up after our showing. What did you think? Happy to answer any questions or set up more tours whenever you're ready.`},
    {cat:"Seller",label:"Market Update",body:`Hi ${fn}, Bri here! Wanted to share a quick market update — homes in your area are moving and prices are strong. Worth a chat about your options?`},
    {cat:"Seller",label:"Free CMA Offer",body:`Hi ${fn}, it's Bri Wesley with Estēm Realty. I'd love to put together a complimentary market analysis for your home — no obligation, just good information. Interested?`},
    {cat:"Sphere",label:"Personal Check-in",body:`Hey ${fn}! It's Bri — just thinking about you and wanted to say hi. Hope everything is going great! If you ever need anything real estate related, I'm always here.`},
    {cat:"Sphere",label:"Referral Ask",body:`Hey ${fn}! Bri Wesley here. I'm growing my business and would love your help. If you know anyone thinking about buying or selling, I'd be so grateful for the introduction. You know I'll take great care of them!`},
    {cat:"Objections",label:'"Not ready yet"',body:`Totally understand, ${fn}! No rush at all — I just want to make sure that when you are ready, you have the right information to make the best decision. Mind if I check in with you in a couple months?`},
    {cat:"Objections",label:'"Not interested"',body:`No problem at all, ${fn}! I appreciate you letting me know. I'll get out of your hair — but if anything changes down the road, don't hesitate to reach out. Take care!`},
    {cat:"Follow-up",label:"General Check-in",body:`Hi ${fn}, Bri Wesley here — just following up! Wanted to see if you had any questions or if anything has changed since we last spoke. Happy to chat whenever works for you.`},
    {cat:"Follow-up",label:"After No Response",body:`Hey ${fn}, Bri here — I know life gets busy! Just wanted to make sure my last message didn't get lost. No pressure at all, just here when you're ready.`},
    {cat:"Follow-up",label:"Long-Term Nurture",body:`Hi ${fn}! Bri Wesley with Estēm Realty. I know the timing hasn't been right — I just wanted to stay in touch. When real estate becomes a priority, I want to be your first call. Hope all is well!`},
    {cat:"Appt Confirmation",label:"Day Before",body:`Hi ${fn}! Bri Wesley here — just confirming our appointment tomorrow. Looking forward to connecting! Let me know if anything changes.`},
    {cat:"Appt Confirmation",label:"Morning Of",body:`Good morning ${fn}! Bri here — excited for our meeting today. See you soon! Feel free to text or call if you need anything before we meet.`},
    {cat:"Voicemail",label:"Standard VM",body:`Hi ${fn}, it's Bri Wesley with Estēm Realty — just thinking about you and wanted to personally reach out. Call or text me when you get a chance. No rush!`},
    {cat:"Email",label:"Re-Engagement",body:`Subject: Checking In — ${fn}\n\nHi ${fn},\n\nBri Wesley here from Estēm Realty Group. I wanted to personally reach out and reconnect.\n\nThe market has had some interesting shifts lately — I'd love to share what I'm seeing and how it might affect your plans.\n\nWould you have 10 minutes this week for a quick call?\n\nWarm regards,\nBri Wesley\nEstēm Realty Group`},
    {cat:"Email",label:"Market Update",body:`Subject: Market Update for Your Area — ${fn}\n\nHi ${fn},\n\nBri Wesley here with Estēm Realty Group. I wanted to send over a quick snapshot of what's happening in the market right now.\n\n[ADD MARKET DATA]\n\nWhether you're thinking of making a move or just staying informed, I'm always happy to chat.\n\nWarm regards,\nBri Wesley\nEstēm Realty Group`},
  ];

  const cats = [...new Set(scripts.map(s=>s.cat))];
  const pick = (s) => { setActive(s.label); setBody(s.body); setCopied(false); };

  return <div>
    {cats.map(cat => <div key={cat} style={{marginBottom:9}}>
      <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--gold2)",marginBottom:4,fontWeight:"bold"}}>{cat}</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {scripts.filter(s=>s.cat===cat).map(s =>
          <button key={s.label} onClick={()=>pick(s)} style={{fontSize:9,padding:"3px 8px",border:"1px solid var(--border2)",background:active===s.label?"var(--black)":"white",color:active===s.label?"white":"var(--gray)",fontFamily:"Georgia,serif",cursor:"pointer"}}>{s.label}</button>
        )}
      </div>
    </div>)}
    {body && <div style={{marginTop:8}}>
      <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--gray)",marginBottom:4}}>Edit before sending</div>
      <textarea value={body} onChange={e=>setBody(e.target.value)} rows={5} style={{width:"100%",fontFamily:"Georgia,serif",fontSize:11,padding:8,border:"1px solid var(--gold)",background:"#FFFEF8",resize:"vertical",outline:"none"}}/>
      <div style={{display:"flex",gap:5,marginTop:5}}>
        <button onClick={()=>{navigator.clipboard.writeText(body);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{background:copied?"var(--green)":"var(--black)",color:"white",border:"none",padding:"5px 12px",fontSize:10,fontFamily:"Georgia,serif",cursor:"pointer"}}>{copied?"✓ Copied!":"📋 Copy Script"}</button>
        <button onClick={()=>setNoteText&&setNoteText(body)} style={{background:"white",border:"1px solid var(--border2)",color:"var(--black)",padding:"5px 12px",fontSize:10,fontFamily:"Georgia,serif",cursor:"pointer"}}>📝 Use as Note</button>
      </div>
    </div>}
  </div>;
}

// ─── INLINE TAG EDITOR ────────────────────────────────────────────────────────
function TagEditor({ lead, onSave, toast }) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const inputRef = useRef(null);

  const current = (lead.tags||"").split(",").map(t=>t.trim()).filter(Boolean);

  const filtered = input.length > 0
    ? TAG_PRESETS.filter(t => t.toLowerCase().includes(input.toLowerCase()) && !current.includes(t))
    : TAG_PRESETS.filter(t => !current.includes(t));

  const save = async (tags) => {
    setSaving(true);
    await onSave({ id: lead.id, tags: tags.join(", ") });
    setSaving(false);
  };

  const add = async (tag) => {
    const t = tag.trim();
    if (!t || current.includes(t)) return;
    setInput(""); setShowDrop(false);
    await save([...current, t]);
    toast && toast("✓ Tag added");
  };

  const remove = async (tag) => {
    await save(current.filter(t => t !== tag));
    toast && toast("Tag removed");
  };

  return <div style={{position:"relative"}}>
    {/* Chips */}
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6,minHeight:24}}>
      {current.length === 0 && <span style={{fontSize:10,color:"var(--gray)",fontStyle:"italic"}}>No tags — add one below</span>}
      {current.map(tag => <span key={tag} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",fontSize:9,border:"1px solid var(--border2)",background:"var(--cream2)",color:"var(--black)"}}>
        {tag}
        <button onClick={()=>remove(tag)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--gray)",lineHeight:1,padding:"0 1px"}} title={`Remove "${tag}"`}>×</button>
      </span>)}
    </div>

    {/* Input + button */}
    <div style={{display:"flex",gap:4,alignItems:"center",position:"relative"}}>
      <div style={{position:"relative"}}>
        <input
          ref={inputRef}
          value={input}
          onChange={e=>{setInput(e.target.value);setShowDrop(true);}}
          onFocus={()=>setShowDrop(true)}
          onBlur={()=>setTimeout(()=>setShowDrop(false),150)}
          onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();add(input);}if(e.key==="Escape")setShowDrop(false);}}
          placeholder="Type a tag or pick below..."
          style={{fontFamily:"Georgia,serif",fontSize:11,padding:"4px 7px",border:"1px solid var(--border2)",background:"var(--cream)",color:"var(--black)",outline:"none",width:200}}
        />
        {showDrop && filtered.length > 0 && <div style={{position:"absolute",top:"100%",left:0,zIndex:500,background:"white",border:"1px solid var(--border2)",minWidth:220,maxHeight:200,overflowY:"auto",boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}}>
          {filtered.map(s => <div key={s} onMouseDown={()=>add(s)} style={{padding:"5px 9px",fontSize:10,cursor:"pointer",fontFamily:"Georgia,serif",color:"var(--black)"}} onMouseEnter={e=>e.currentTarget.style.background="var(--cream)"} onMouseLeave={e=>e.currentTarget.style.background="white"}>{s}</div>)}
        </div>}
      </div>
      <button onClick={()=>add(input)} disabled={!input.trim()||saving} style={{fontFamily:"Georgia,serif",fontSize:9,padding:"4px 9px",border:"1px solid var(--border2)",background:input.trim()?"var(--black)":"var(--cream2)",color:input.trim()?"var(--cream)":"var(--gray)",cursor:input.trim()?"pointer":"default"}}>
        {saving?"...":"+ Add"}
      </button>
    </div>

    {/* Quick-pick preset chips */}
    <div style={{marginTop:7}}>
      <div style={{fontSize:9,color:"var(--gray)",marginBottom:4,letterSpacing:.5}}>Quick add:</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
        {TAG_PRESETS.filter(t=>!current.includes(t)).map(t =>
          <button key={t} onClick={()=>add(t)} style={{fontSize:8,padding:"2px 6px",border:"1px solid var(--border2)",background:"white",color:"var(--gray)",cursor:"pointer",fontFamily:"Georgia,serif"}}>{t}</button>
        )}
      </div>
    </div>
    <div style={{fontSize:9,color:"var(--gray)",marginTop:4}}>Press Enter or comma to add · Click × to remove</div>
  </div>;
}

// ─── BULK TAG PANEL ───────────────────────────────────────────────────────────
function BulkTagPanel({ leads, toast, onBatchSave, onLeadsUpdated }) {
  const [stageFilter,setStageFilter] = useState("all");
  const [tagFilter,setTagFilter] = useState("");
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState(new Set());
  const [tagInput,setTagInput] = useState("");
  const [mode,setMode] = useState("add");
  const [running,setRunning] = useState(false);
  const [progress,setProgress] = useState(null);

  const filtered = useMemo(()=>{
    return leads.filter(l=>{
      if (!l.is_archived) {
        if (stageFilter!=="all" && l.stage!==stageFilter) return false;
        if (tagFilter && !(l.tags||"").toLowerCase().includes(tagFilter.toLowerCase())) return false;
        if (search) { const s=search.toLowerCase(); return (l.name||"").toLowerCase().includes(s)||(l.phone||"").includes(s)||(l.email||"").toLowerCase().includes(s); }
        return true;
      }
      return false;
    });
  },[leads,stageFilter,tagFilter,search]);

  const allSel = filtered.length>0 && filtered.every(l=>selected.has(l.id));
  const toggleAll = () => setSelected(prev=>{ const n=new Set(prev); allSel?filtered.forEach(l=>n.delete(l.id)):filtered.forEach(l=>n.add(l.id)); return n; });
  const toggleOne = (id) => setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  const apply = async () => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (selected.size===0) { toast&&toast("Select at least one lead first"); return; }
    if (!window.confirm(`${mode==="add"?"Add":"Remove"} tag "${tag}" on ${selected.size} lead(s)?`)) return;
    setRunning(true);
    const toUpdate = leads.filter(l=>selected.has(l.id));
    let done=0;
    const updated=[...leads];
    for (const lead of toUpdate) {
      const cur=(lead.tags||"").split(",").map(t=>t.trim()).filter(Boolean);
      const newTags = mode==="add" ? (cur.includes(tag)?cur:[...cur,tag]) : cur.filter(t=>t!==tag);
      const str=newTags.join(", ");
      await onBatchSave({id:lead.id,tags:str});
      const idx=updated.findIndex(l=>l.id===lead.id);
      if(idx!==-1) updated[idx]={...updated[idx],tags:str};
      done++; setProgress(`${done}/${selected.size}`);
    }
    onLeadsUpdated&&onLeadsUpdated(updated);
    setRunning(false); setProgress(null); setSelected(new Set());
    toast&&toast(`✓ Tag "${tag}" ${mode==="add"?"added to":"removed from"} ${done} lead(s)`);
  };

  return <div>
    <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:3}}>⬡ Bulk Tag Manager</div>
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:14}}>Filter leads → select → add or remove a tag across all selected.</div>

    {/* Filters */}
    <div style={{background:"white",border:"1px solid var(--border)",padding:14,marginBottom:12}}>
      <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--gray)",marginBottom:8}}>Filter Leads</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name / phone / email..." style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"var(--cream)",fontSize:11,fontFamily:"Georgia,serif",width:220,outline:"none"}}/>
        <input value={tagFilter} onChange={e=>setTagFilter(e.target.value)} placeholder="Filter by existing tag..." style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"var(--cream)",fontSize:11,fontFamily:"Georgia,serif",width:180,outline:"none"}}/>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {["all",...STAGES].map(s=><button key={s} onClick={()=>setStageFilter(s)} style={{padding:"3px 9px",fontSize:9,border:"1px solid var(--border2)",background:stageFilter===s?"var(--black)":"white",color:stageFilter===s?"var(--cream)":"var(--gray)",cursor:"pointer",fontFamily:"Georgia,serif"}}>{s==="all"?"All Stages":s}</button>)}
      </div>
    </div>

    {/* Tag action */}
    <div style={{background:"linear-gradient(135deg,#FAF8F4,#FAF6EC)",border:"1px solid rgba(196,164,90,0.4)",padding:"12px 16px",marginBottom:12}}>
      <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--gray)",marginBottom:8}}>Apply Tag to {selected.size} Selected Lead{selected.size!==1?"s":""}</div>

      {/* Preset chips */}
      <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:8}}>
        {TAG_PRESETS.map(t=><button key={t} onClick={()=>setTagInput(t)} style={{padding:"2px 8px",fontSize:9,border:"1px solid var(--border2)",background:tagInput===t?"var(--black)":"white",color:tagInput===t?"var(--cream)":"var(--gray)",cursor:"pointer",fontFamily:"Georgia,serif"}}>{t}</button>)}
      </div>

      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&apply()} placeholder="Type or click a tag above..." style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"var(--cream)",fontSize:11,fontFamily:"Georgia,serif",width:220,outline:"none"}}/>
        {["add","remove"].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:"5px 12px",fontSize:10,border:"1px solid var(--border2)",background:mode===m?(m==="add"?"var(--black)":"#A32D2D"):"white",color:mode===m?"white":"var(--gray)",cursor:"pointer",fontFamily:"Georgia,serif"}}>{m==="add"?"+ Add Tag":"× Remove Tag"}</button>)}
        <button onClick={apply} disabled={running||!tagInput.trim()||selected.size===0} style={{padding:"5px 14px",fontSize:11,border:"none",background:running||!tagInput.trim()||selected.size===0?"var(--gray)":"var(--black)",color:"var(--cream)",cursor:running||!tagInput.trim()||selected.size===0?"default":"pointer",fontFamily:"Georgia,serif"}}>
          {running?`Working... ${progress||""}`:`Apply to ${selected.size} Lead${selected.size!==1?"s":""}`}
        </button>
      </div>
    </div>

    {/* Table */}
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:6}}>
      {filtered.length} leads
      {filtered.length>0&&<button onClick={toggleAll} style={{marginLeft:10,fontSize:9,padding:"2px 7px",border:"1px solid var(--border2)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif"}}>{allSel?`Deselect All`:`Select All (${filtered.length})`}</button>}
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>{["","Name","Stage","Phone","Current Tags"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 7px",borderBottom:"1px solid var(--border)",color:"var(--gray)",fontSize:10,fontFamily:"Georgia,serif",fontWeight:"normal"}}>{h}</th>)}</tr></thead>
        <tbody>
          {filtered.slice(0,100).map(lead=><tr key={lead.id} style={{background:selected.has(lead.id)?"var(--cream)":"white"}}>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",width:30}}><input type="checkbox" checked={selected.has(lead.id)} onChange={()=>toggleOne(lead.id)} style={{cursor:"pointer"}}/></td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontWeight:"bold"}}>{lead.name}</td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)"}}>{lead.stage}</td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontSize:10}}>{lead.phone||"—"}</td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)"}}>{(lead.tags||"").split(",").slice(0,3).join(", ")||"—"}</td>
          </tr>)}
          {filtered.length>100&&<tr><td colSpan={5} style={{padding:"8px 7px",fontSize:10,color:"var(--gray)",fontStyle:"italic"}}>Showing first 100 — narrow your filter.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}

// ─── BULK EMAIL PANEL ─────────────────────────────────────────────────────────
// ─── BULK EMAIL PANEL (v2 — manual-confirm send workflow) ────────────────────
// Architecture note: the CRM cannot send Gmail directly (no OAuth/send infra
// per explicit instruction). This panel prepares the recipient list + draft
// copy, then hands off a ready-to-paste/ready-to-draft package. Once Bri
// confirms in the CRM that she actually sent the email from Gmail, the CRM
// writes the timeline note + last_email_sent + lcd update — nothing is
// logged until she explicitly confirms.

function BulkEmailPanel({ leads, toast, user, onSendConfirmed }) {
  const [stageFilter,setStageFilter] = useState("all");
  const [tempFilter,setTempFilter] = useState("all");
  const [tagFilter,setTagFilter] = useState("");
  const [cityFilter,setCityFilter] = useState("all");
  const [assignedFilter,setAssignedFilter] = useState("all");
  const [search,setSearch] = useState("");
  const [emailOnly,setEmailOnly] = useState(true);
  const [selected,setSelected] = useState(new Set());
  const [draftType,setDraftType] = useState("newsletter");
  const [showDraft,setShowDraft] = useState(false);
  const [subject,setSubject] = useState("");
  const [draftBody,setDraftBody] = useState("");
  const [copied,setCopied] = useState("");
  const [showConfirm,setShowConfirm] = useState(false);
  const [confirming,setConfirming] = useState(false);
  const [confirmProgress,setConfirmProgress] = useState(null);

  // Derive temperature from tags (Hot/Warm/Cold/Dormant), since that's the
  // only place "AI category" data currently lives on a lead.
  const tempOf = (l) => {
    const t = (l.tags||"").toLowerCase();
    if (t.includes("hot")) return "Hot";
    if (t.includes("warm")) return "Warm";
    if (t.includes("cold")) return "Cold";
    if ((l.stage||"").startsWith("Re-Engagement")) return "Dormant";
    return "Unknown";
  };

  const cities = useMemo(() => {
    const set = new Set(leads.map(l=>(l.city||"").trim()).filter(Boolean));
    return [...set].sort();
  }, [leads]);

  const assignees = useMemo(() => {
    const set = new Set(leads.map(l=>(l.assigned||"").trim()).filter(Boolean));
    return [...set].sort();
  }, [leads]);

  const filtered = useMemo(()=>{
    let list = leads.filter(l=>!l.is_archived);
    if (emailOnly) list = list.filter(l=>l.email&&l.email.trim()&&l.email.includes("@"));
    if (stageFilter!=="all") list = list.filter(l=>l.stage===stageFilter);
    if (tempFilter!=="all") list = list.filter(l=>tempOf(l)===tempFilter);
    if (tagFilter) list = list.filter(l=>(l.tags||"").toLowerCase().includes(tagFilter.toLowerCase()));
    if (cityFilter!=="all") list = list.filter(l=>(l.city||"")===cityFilter);
    if (assignedFilter!=="all") list = list.filter(l=>(l.assigned||"")===assignedFilter);
    if (search) { const s=search.toLowerCase(); list=list.filter(l=>(l.name||"").toLowerCase().includes(s)||(l.email||"").toLowerCase().includes(s)||(l.tags||"").toLowerCase().includes(s)); }
    return list;
  },[leads,stageFilter,tempFilter,tagFilter,cityFilter,assignedFilter,search,emailOnly]);

  // Skipped = matched filters but no usable email
  const skipped = useMemo(()=>{
    let list = leads.filter(l=>!l.is_archived);
    if (stageFilter!=="all") list = list.filter(l=>l.stage===stageFilter);
    if (tempFilter!=="all") list = list.filter(l=>tempOf(l)===tempFilter);
    if (tagFilter) list = list.filter(l=>(l.tags||"").toLowerCase().includes(tagFilter.toLowerCase()));
    if (cityFilter!=="all") list = list.filter(l=>(l.city||"")===cityFilter);
    if (assignedFilter!=="all") list = list.filter(l=>(l.assigned||"")===assignedFilter);
    return list.filter(l=>!l.email||!l.email.trim()||!l.email.includes("@"));
  },[leads,stageFilter,tempFilter,tagFilter,cityFilter,assignedFilter]);

  const allSel = filtered.length>0 && filtered.every(l=>selected.has(l.id));
  const selLeads = filtered.filter(l=>selected.has(l.id));
  const toggleAll = () => setSelected(prev=>{ const n=new Set(prev); allSel?filtered.forEach(l=>n.delete(l.id)):filtered.forEach(l=>n.add(l.id)); return n; });
  const selectFiltered = () => setSelected(new Set(filtered.map(l=>l.id)));
  const selectAllLeads = () => setSelected(new Set(leads.filter(l=>!l.is_archived&&l.email&&l.email.includes("@")).map(l=>l.id)));
  const clearSelection = () => setSelected(new Set());

  const copy = (text,key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(""),2500); toast&&toast(`✓ Copied`); };

  const downloadCSV = () => {
    const rows=[["Name","Email","Phone","Stage","Temperature","City","Assigned","Tags"].join(","),...selLeads.map(l=>[`"${l.name||""}"`,`"${l.email||""}"`,`"${l.phone||""}"`,`"${l.stage||""}"`,`"${tempOf(l)}"`,`"${l.city||""}"`,`"${l.assigned||""}"`,`"${(l.tags||"").replace(/"/g,"'")}"`].join(","))].join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([rows],{type:"text/csv"})); a.download=`estem-newsletter-list-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast&&toast(`✓ CSV downloaded`);
  };

  const genDraft = () => {
    const drafts = {
      newsletter:{subject:"Your Monthly Estēm Real Estate Update",body:`Hi [First Name],\n\nHope this finds you well! Here's your monthly update from Estēm Realty Group.\n\n📍 South DFW Market Snapshot\n[Add market data here]\n\n🏡 Featured Listings\n[Add featured listings here]\n\n💡 Tips & Resources\n[Add tips here]\n\nAs always, I'm here for any real estate questions. Just reply to this email!\n\nWarm regards,\nBri Wesley\nEstēm Realty Group`},
      reengagement:{subject:"Checking In — Are Your Real Estate Plans Still On the Radar?",body:`Hi [First Name],\n\nBri Wesley here from Estēm Realty Group — I wanted to personally reach out and reconnect.\n\nThe market has had some interesting shifts lately and I'd love to share what I'm seeing.\n\nNo pressure at all — just want to make sure you have the right information when the time is right.\n\nWarm regards,\nBri Wesley\nEstēm Realty Group\n📱 [Your Phone]`},
      market:{subject:"Quick Market Update You'll Want to See",body:`Hi [First Name],\n\nBri Wesley here from Estēm Realty Group — I wanted to share a quick update on what's happening in the South DFW market.\n\n📊 Here's what I'm seeing:\n• [Key market stat]\n• [Inventory note]\n• [Rate/opportunity note]\n\nWhether you're thinking of making a move soon or just staying informed, this is worth knowing.\n\nWarm regards,\nBri Wesley\nEstēm Realty Group`},
      listings:{subject:"New Listings Just Hit — Here's What I'm Seeing",body:`Hi [First Name],\n\nBri Wesley here — some listings just came on the market that I think are worth your attention.\n\n🏡 [Add listing details here]\n\nIf any of these look interesting, reply to this email or text me and I'll set up a showing.\n\nWarm regards,\nBri Wesley\nEstēm Realty Group`},
    };
    const d=drafts[draftType]||drafts.newsletter;
    setSubject(d.subject); setDraftBody(d.body); setShowDraft(true);
  };

  // Confirm-send: writes timeline note + last_email_sent + lcd reset for each
  // selected lead. Only runs when Bri explicitly confirms she already sent
  // the email from Gmail. No automatic logging happens before this.
  const confirmSend = async () => {
    if (selLeads.length===0) return;
    setConfirming(true);
    const today = new Date().toISOString().slice(0,10);
    let done=0;
    for (const lead of selLeads) {
      await fetch("/api/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        lead_id: lead.id,
        text: `Email sent: "${subject || draftType}"`,
        type: "email",
        user_name: user || "Bri",
      })});
      await fetch("/api/leads",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id: lead.id,
        last_email_sent: today,
        lcd: 0,
      })});
      done++; setConfirmProgress(`${done}/${selLeads.length}`);
    }
    onSendConfirmed && onSendConfirmed(selLeads.map(l=>({...l,last_email_sent:today,lcd:0})));
    setConfirming(false); setConfirmProgress(null); setShowConfirm(false);
    toast && toast(`✓ Logged: ${done} lead(s) marked as emailed`);
    setSelected(new Set());
  };

  return <div>
    <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:3}}>✉ Bulk Email & Newsletter</div>
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:14}}>Filter → select → generate copy → create the email in Gmail yourself → confirm here once sent.</div>

    {/* Filters */}
    <div style={{background:"white",border:"1px solid var(--border)",padding:14,marginBottom:12}}>
      <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--gray)",marginBottom:8}}>Filter Recipients</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name / email / tag..." style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"var(--cream)",fontSize:11,fontFamily:"Georgia,serif",width:220,outline:"none"}}/>
        <input value={tagFilter} onChange={e=>setTagFilter(e.target.value)} placeholder="Filter by tag..." style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"var(--cream)",fontSize:11,fontFamily:"Georgia,serif",width:160,outline:"none"}}/>
        <select value={cityFilter} onChange={e=>setCityFilter(e.target.value)} style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"var(--cream)",fontSize:11,fontFamily:"Georgia,serif"}}>
          <option value="all">All Cities</option>
          {cities.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={assignedFilter} onChange={e=>setAssignedFilter(e.target.value)} style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"var(--cream)",fontSize:11,fontFamily:"Georgia,serif"}}>
          <option value="all">All Agents</option>
          {assignees.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <label style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"var(--gray)",cursor:"pointer"}}>
          <input type="checkbox" checked={emailOnly} onChange={e=>setEmailOnly(e.target.checked)}/> Valid email only
        </label>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7}}>
        {["all",...STAGES].map(s=><button key={s} onClick={()=>setStageFilter(s)} style={{padding:"3px 9px",fontSize:9,border:"1px solid var(--border2)",background:stageFilter===s?"var(--black)":"white",color:stageFilter===s?"var(--cream)":"var(--gray)",cursor:"pointer",fontFamily:"Georgia,serif"}}>{s==="all"?"All Stages":s}</button>)}
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        <span style={{fontSize:9,color:"var(--gray)",alignSelf:"center",marginRight:2}}>AI Temperature:</span>
        {["all","Hot","Warm","Cold","Dormant"].map(t=><button key={t} onClick={()=>setTempFilter(t)} style={{padding:"3px 9px",fontSize:9,border:"1px solid var(--border2)",background:tempFilter===t?"var(--black)":"white",color:tempFilter===t?"var(--cream)":"var(--gray)",cursor:"pointer",fontFamily:"Georgia,serif"}}>{t==="all"?"All":t}</button>)}
      </div>
    </div>

    {/* Selection + recipient count */}
    <div style={{background:"linear-gradient(135deg,#FAF8F4,#FAF6EC)",border:"1px solid rgba(196,164,90,0.4)",padding:"12px 16px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}>
        <div style={{fontSize:13,fontFamily:"Georgia,serif"}}>
          <strong style={{color:"var(--gold2)",fontSize:18}}>{selected.size}</strong> recipient{selected.size!==1?"s":""} selected
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={selectFiltered} style={{fontSize:9,padding:"3px 9px",border:"1px solid var(--border2)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif"}}>Select Filtered ({filtered.length})</button>
          <button onClick={selectAllLeads} style={{fontSize:9,padding:"3px 9px",border:"1px solid var(--border2)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif"}}>Select All Leads</button>
          <button onClick={clearSelection} style={{fontSize:9,padding:"3px 9px",border:"1px solid var(--border2)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif"}}>Clear</button>
        </div>
      </div>
      {skipped.length>0 && <div style={{fontSize:10,color:"#A32D2D",background:"#FDF0F0",border:"1px solid #E0B0B0",padding:"5px 9px",marginBottom:8}}>
        ⚠ {skipped.length} lead{skipped.length!==1?"s":""} matched your filters but {skipped.length!==1?"have":"has"} no valid email — they'll be skipped automatically.
        {" "}<button onClick={()=>copy(skipped.map(l=>l.name).join(", "),"skipped")} style={{fontSize:9,padding:"1px 6px",border:"1px solid #A32D2D",background:"white",color:"#A32D2D",cursor:"pointer",fontFamily:"Georgia,serif"}}>{copied==="skipped"?"✓ Copied":"Copy skipped names"}</button>
      </div>}

      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
        <button onClick={()=>copy(selLeads.map(l=>l.email).filter(Boolean).join(", "),"comma")} disabled={selLeads.length===0} style={{padding:"5px 12px",fontSize:10,border:"none",background:selLeads.length?"var(--black)":"var(--gray)",color:"white",cursor:selLeads.length?"pointer":"default",fontFamily:"Georgia,serif"}}>{copied==="comma"?"✓ Copied!":"📋 Copy Emails (comma)"}</button>
        <button onClick={()=>copy(selLeads.map(l=>l.email).filter(Boolean).join("\n"),"newline")} disabled={selLeads.length===0} style={{padding:"5px 12px",fontSize:10,border:"1px solid var(--border2)",background:"white",color:"var(--black)",cursor:selLeads.length?"pointer":"default",fontFamily:"Georgia,serif"}}>{copied==="newline"?"✓ Copied!":"📋 Copy (one per line, for BCC)"}</button>
        <button onClick={downloadCSV} disabled={selLeads.length===0} style={{padding:"5px 12px",fontSize:10,border:"1px solid var(--border2)",background:"white",color:"var(--black)",cursor:selLeads.length?"pointer":"default",fontFamily:"Georgia,serif"}}>⬇ Download CSV</button>
      </div>

      {/* Campaign draft */}
      <div style={{paddingTop:10,borderTop:"1px solid rgba(196,164,90,0.3)"}}>
        <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--gray)",marginBottom:6}}>1. Generate Email Copy</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {[["newsletter","📰 Newsletter"],["reengagement","↻ Re-Engagement"],["market","📊 Market Update"],["listings","🏡 New Listings"]].map(([v,label])=>
            <button key={v} onClick={()=>setDraftType(v)} style={{padding:"3px 9px",fontSize:9,border:"1px solid var(--border2)",background:draftType===v?"var(--black)":"white",color:draftType===v?"var(--cream)":"var(--gray)",cursor:"pointer",fontFamily:"Georgia,serif"}}>{label}</button>
          )}
          <button onClick={genDraft} style={{padding:"5px 12px",fontSize:10,border:"none",background:"var(--black)",color:"var(--cream)",cursor:"pointer",fontFamily:"Georgia,serif"}}>Generate Draft →</button>
        </div>
      </div>
    </div>

    {/* Draft output */}
    {showDraft && <div style={{background:"white",border:"1px solid var(--border)",padding:14,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:13}}>2. Edit & Preview — then create in Gmail</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>copy(`Subject: ${subject}\n\n${draftBody}`,"draft")} style={{fontSize:9,padding:"3px 9px",border:"none",background:copied==="draft"?"var(--green)":"var(--black)",color:"white",cursor:"pointer",fontFamily:"Georgia,serif"}}>{copied==="draft"?"✓ Copied!":"📋 Copy Draft"}</button>
          <button onClick={()=>setShowDraft(false)} style={{fontSize:9,padding:"3px 9px",border:"1px solid var(--border2)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif"}}>✕</button>
        </div>
      </div>
      <div style={{marginBottom:6}}>
        <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:"var(--gray)",marginBottom:3}}>Subject</div>
        <input value={subject} onChange={e=>setSubject(e.target.value)} style={{width:"100%",padding:"6px 8px",border:"1px solid var(--border2)",fontFamily:"Georgia,serif",fontSize:11,outline:"none",background:"var(--cream)"}}/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:"var(--gray)",marginBottom:3}}>Body — replace [bracketed items] before sending</div>
        <textarea value={draftBody} onChange={e=>setDraftBody(e.target.value)} rows={14} style={{width:"100%",padding:"7px 8px",border:"1px solid var(--border2)",fontFamily:"Georgia,serif",fontSize:11,outline:"none",resize:"vertical",background:"#FFFEF8",lineHeight:1.7}}/>
      </div>

      {/* Live preview */}
      <div style={{background:"var(--cream2)",border:"1px solid var(--border)",padding:"10px 12px",marginBottom:10}}>
        <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1,color:"var(--gray)",marginBottom:6}}>Preview — as {selLeads[0]?.name?.split(" ")[0]||"[First Name]"} will see it</div>
        <div style={{fontSize:11,fontWeight:"bold",marginBottom:6}}>{subject.replace("[First Name]", selLeads[0]?.name?.split(" ")[0]||"[First Name]")}</div>
        <div style={{fontSize:11,lineHeight:1.7,whiteSpace:"pre-line",color:"var(--black2)"}}>{draftBody.replace(/\[First Name\]/g, selLeads[0]?.name?.split(" ")[0]||"[First Name]")}</div>
      </div>

      <div style={{fontSize:10,color:"var(--gray)",marginBottom:10}}>{selLeads.filter(l=>l.email).length} recipients ready · Copy this into Gmail (one draft per lead, or one BCC blast), personalize [First Name] per recipient, then send from Gmail yourself.</div>

      <div style={{paddingTop:10,borderTop:"1px solid var(--border)"}}>
        <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--gray)",marginBottom:6}}>3. After you've sent it from Gmail</div>
        <button onClick={()=>setShowConfirm(true)} disabled={selLeads.length===0} style={{padding:"6px 14px",fontSize:11,border:"none",background:selLeads.length?"var(--green)":"var(--gray)",color:"white",cursor:selLeads.length?"pointer":"default",fontFamily:"Georgia,serif"}}>
          ✓ I sent this — log it for {selLeads.length} lead{selLeads.length!==1?"s":""}
        </button>
        <div style={{fontSize:9,color:"var(--gray)",marginTop:5}}>This does NOT send anything. It only logs the activity to each lead's timeline and updates Last Contacted / Last Email Sent — after you confirm you already sent it.</div>
      </div>
    </div>}

    {/* Confirm modal */}
    {showConfirm && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&!confirming&&setShowConfirm(false)}>
      <div style={{background:"white",padding:24,maxWidth:420,width:"90%"}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:15,marginBottom:10}}>Confirm Email Sent</div>
        <div style={{fontSize:11,color:"var(--black2)",lineHeight:1.7,marginBottom:14}}>
          This will log <strong>"{subject||draftType}"</strong> as sent to <strong>{selLeads.length}</strong> lead{selLeads.length!==1?"s":""}, add a timeline entry to each, and update their Last Contacted / Last Email Sent date to today.
          <br/><br/>
          Only confirm if you've already sent the email from Gmail.
        </div>
        <div style={{display:"flex",gap:7}}>
          <button onClick={confirmSend} disabled={confirming} style={{flex:1,padding:"7px 14px",fontSize:11,border:"none",background:confirming?"var(--gray)":"var(--green)",color:"white",cursor:confirming?"default":"pointer",fontFamily:"Georgia,serif"}}>
            {confirming?`Logging... ${confirmProgress||""}`:"Yes, I sent it — log now"}
          </button>
          {!confirming&&<button onClick={()=>setShowConfirm(false)} style={{padding:"7px 14px",fontSize:11,border:"1px solid var(--border2)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif"}}>Cancel</button>}
        </div>
      </div>
    </div>}

    {/* Lead table */}
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
      {filtered.length} leads match filters
      {filtered.length>0&&<button onClick={toggleAll} style={{fontSize:9,padding:"2px 7px",border:"1px solid var(--border2)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif"}}>{allSel?`Deselect All`:`Select All Shown (${filtered.length})`}</button>}
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>{["","Name","Email","Stage","Temp","City","Last Email Sent"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 7px",borderBottom:"1px solid var(--border)",color:"var(--gray)",fontSize:10,fontFamily:"Georgia,serif",fontWeight:"normal"}}>{h}</th>)}</tr></thead>
        <tbody>
          {filtered.slice(0,150).map(lead=><tr key={lead.id} style={{background:selected.has(lead.id)?"var(--cream)":"white"}}>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",width:30}}><input type="checkbox" checked={selected.has(lead.id)} onChange={()=>setSelected(prev=>{const n=new Set(prev);n.has(lead.id)?n.delete(lead.id):n.add(lead.id);return n;})} style={{cursor:"pointer"}}/></td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontWeight:"bold"}}>{lead.name}</td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontSize:10,color:lead.email?"var(--black)":"var(--gray)",fontStyle:lead.email?"normal":"italic"}}>{lead.email||"No email"}</td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)"}}>{lead.stage}</td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)"}}>{tempOf(lead)}</td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)"}}>{lead.city||"—"}</td>
            <td style={{padding:"6px 7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)"}}>{lead.last_email_sent||"—"}</td>
          </tr>)}
          {filtered.length>150&&<tr><td colSpan={7} style={{padding:"8px 7px",fontSize:10,color:"var(--gray)",fontStyle:"italic"}}>Showing first 150 — narrow your filter.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
// ─── Executive tab ────────────────────────────────────────────────────────────
function leadSignals(lead) {
  const notes=(lead.notes||"").toLowerCase(), src=lead.source||"", stage=lead.stage||"";
  const signals=[];
  if(notes.includes("pre-approv")) signals.push("Pre-approval on file");
  if(notes.includes("spoke")||notes.includes("talked")||notes.includes("connected")) signals.push("Previous live conversation");
  if(notes.includes("ready")||notes.includes("motivated")||notes.includes("asap")) signals.push("Motivation signals in notes");
  if(src==="Referral"||src==="Compass Referral") signals.push("Referral source — highest trust");
  if(src==="Open House") signals.push("Open house — showed active interest");
  if(stage==="Past Client") signals.push("Past client — strong referral potential");
  if(stage==="Hot") signals.push("Confirmed hot lead");
  return signals.slice(0,2).join(" · ") || "High AI score — strong outreach opportunity";
}

function ExecTab({ leads, revived, reLeads, top5, openLead }) {
  const hot=leads.filter(l=>l.stage==="Hot");
  const past=leads.filter(l=>l.stage==="Past Client");
  const topGrade=leads.filter(l=>l.grade==="A+"||l.grade==="A");
  return <div>
    <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:3}}>Executive Command Center <em style={{color:"var(--gold2)",fontStyle:"italic"}}>— Estēm Realty Group</em></div>
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:14}}>Reality-based AI briefing for Bri</div>
    <div style={{background:"linear-gradient(135deg,#FAF8F4,#F5EFE8)",border:"1px solid rgba(196,164,90,0.4)",borderLeft:"3px solid var(--gold)",padding:"12px 16px",marginBottom:14,fontSize:11,lineHeight:1.7}}>
      <div style={{fontFamily:"Georgia,serif",fontSize:13,color:"var(--gold2)",marginBottom:5}}>Current Reality of Your Database</div>
      749 of 821 leads are in Re-Engagement status. A lead is only "Active" when confirmed engagement has occurred. Use the Reactivation Pipeline to work through dormant leads systematically.
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:9,marginBottom:14}}>
      {[["Total Contacts",leads.length,"All records",""],["In Reactivation",reLeads.length,"Dormant","gold"],["Revived",revived.length,"Re-engaged","green"],["Hot",hot.length,"Verified active","red"],["Past Clients",past.length,"Preserved","blue"],["A/A+ Grade",topGrade.length,"Top leads",""]].map(([title,val,sub,col])=>
        <div key={title} style={{background:"white",border:"1px solid var(--border)",padding:"13px 15px"}}>
          <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--gray)",marginBottom:4}}>{title}</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:24,lineHeight:1,color:col==="gold"?"var(--gold2)":col==="green"?"var(--green)":col==="red"?"var(--red)":col==="blue"?"var(--blue)":"var(--black)"}}>{val}</div>
          <div style={{fontSize:10,color:"var(--gray2)",marginTop:3}}>{sub}</div>
        </div>
      )}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{background:"white",border:"1px solid var(--border)",padding:14}}>
        <div style={{fontSize:14,fontFamily:"Georgia,serif",marginBottom:3}}>Top 5 Leads Today</div>
        <div style={{fontSize:10,color:"var(--gray)",marginBottom:10}}>Ranked by AI score</div>
        {top5.map((lead,i)=><div key={lead.id} onClick={()=>openLead(lead)} style={{background:"white",border:"1px solid var(--border)",borderLeft:"3px solid var(--gold)",padding:"10px 12px",marginBottom:7,cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
            <span style={{fontSize:10,color:"var(--gray2)",minWidth:16}}>#{i+1}</span>
            <GradeBadge grade={lead.grade}/>
            <strong style={{fontSize:11,flex:1}}>{lead.name}</strong>
            <StagePill stage={lead.stage}/>
          </div>
          <div style={{fontSize:10,color:"var(--gray)",lineHeight:1.5}}>{leadSignals(lead)}</div>
        </div>)}
      </div>
      <div style={{background:"white",border:"1px solid var(--border)",padding:14}}>
        <div style={{fontSize:14,fontFamily:"Georgia,serif",marginBottom:3}}>Revived Leads — Act Now</div>
        <div style={{fontSize:10,color:"var(--gray)",marginBottom:10}}>Responded after dormancy — highest close potential</div>
        {!revived.length&&<div style={{fontSize:11,color:"var(--gray)",fontStyle:"italic"}}>No revived leads yet. Click "✓ Mark Revived" on any lead that responds.</div>}
        {revived.slice(0,6).map(lead=><div key={lead.id} onClick={()=>openLead(lead)} style={{background:"linear-gradient(135deg,#F0FAF0,#E4F5E4)",border:"1px solid #6AB46A",padding:"10px 12px",marginBottom:7,cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{background:"#E4F5E4",color:"var(--green)",border:"1px solid #6AB46A",padding:"1px 6px",fontSize:9}}>✓</span>
            <strong style={{fontSize:11,flex:1}}>{lead.name}</strong>
            <span style={{fontSize:9,color:"var(--gray)"}}>Orig: {lead.orig_stage||"—"}</span>
          </div>
        </div>)}
      </div>
    </div>
  </div>;
}

// ─── AI Priorities tab ────────────────────────────────────────────────────────
function PriorityList({ items, title, why, openLead }) {
  return <div style={{background:"white",border:"1px solid var(--border)",padding:14,marginBottom:12}}>
    <div style={{fontSize:13,fontFamily:"Georgia,serif",marginBottom:10}}>{title}</div>
    {!items.length&&<div style={{color:"var(--gray)",fontSize:11}}>None identified.</div>}
    {items.map((lead,i)=><div key={lead.id} onClick={()=>openLead(lead)} style={{background:"white",border:"1px solid var(--border)",borderLeft:"3px solid var(--gold)",padding:"10px 12px",marginBottom:7,cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
        <span style={{fontSize:10,color:"var(--gray2)",minWidth:16}}>#{i+1}</span>
        <GradeBadge grade={lead.grade}/>
        <strong style={{fontSize:11,flex:1}}>{lead.name}</strong>
        <StagePill stage={lead.stage}/>
      </div>
      <div style={{fontSize:10,color:"var(--gray)",lineHeight:1.5}}>{why?why(lead):leadSignals(lead)}</div>
    </div>)}
  </div>;
}
function PrioritiesTab({ leads, revived, openLead }) {
  const sorted=[...leads].sort((a,b)=>(b.score||0)-(a.score||0));
  return <div>
    <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:3}}>▲ AI Priority Engine</div>
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:14}}>Leads ranked by real engagement signals — recency, response history, motivation, notes.</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <PriorityList items={sorted.slice(0,10)} title="Top 10 — Contact Today" openLead={openLead}/>
      <PriorityList items={sorted.slice(10,20)} title="Next 10 Priority Leads" openLead={openLead}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <PriorityList items={revived} title="Revived Leads — Highest Priority" why={()=>"Re-engaged after dormancy — treat as active prospect now"} openLead={openLead}/>
      <PriorityList items={sorted.filter(l=>(l.notes||"").toLowerCase().includes("pre-approv")).slice(0,5)} title="Pre-Approval Signals in Notes" why={()=>"Historical notes indicate financing was in place"} openLead={openLead}/>
    </div>
  </div>;
}

// ─── All Leads tab ────────────────────────────────────────────────────────────
function LeadsTab({ paged, filtered, leads, search, setSearch, stageFilter, setStageFilter, tagFilter, setTagFilter, sort, setSort, page, setPage, pages, openLead, archiveLead, markRevived, setEditLead, addNewLead }) {
  const [addOpen,setAddOpen] = useState(false);
  const thStyle = {textAlign:"left",padding:"6px 7px",borderBottom:"1px solid var(--border)",color:"var(--gray)",fontSize:10,fontFamily:"Georgia,serif",fontWeight:"normal",whiteSpace:"nowrap",cursor:"pointer",userSelect:"none"};
  const sortBy = (col) => setSort(s=>s.col===col?{col,dir:-1*s.dir}:{col,dir:col==="score"?-1:1});
  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div>
        <div style={{fontFamily:"Georgia,serif",fontSize:18}}>All Leads</div>
        <div style={{fontSize:11,color:"var(--gray)"}}>Showing {filtered.length} of {leads.length} contacts</div>
      </div>
      <button onClick={()=>setAddOpen(true)} style={{background:"var(--black)",color:"var(--cream)",border:"none",padding:"6px 13px",fontSize:11,fontFamily:"Georgia,serif",cursor:"pointer"}}>+ Add Lead</button>
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email, tags, city..." style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"white",fontSize:11,outline:"none",flex:1,minWidth:200,maxWidth:340,fontFamily:"Georgia,serif"}}/>
      <input value={tagFilter} onChange={e=>setTagFilter(e.target.value)} placeholder="Filter by tag..." style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"white",fontSize:11,outline:"none",width:160,fontFamily:"Georgia,serif"}}/>
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {["all",...STAGES].map(s=><button key={s} onClick={()=>setStageFilter(s)} style={{padding:"4px 11px",border:"1px solid var(--border2)",background:stageFilter===s?"var(--black)":"white",color:stageFilter===s?"var(--cream)":"var(--gray)",fontSize:10,cursor:"pointer",fontFamily:"Georgia,serif"}}>{s==="all"?"All Stages":s}</button>)}
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>
          <th style={thStyle} onClick={()=>sortBy("name")}>Name</th>
          <th style={{...thStyle,textAlign:"center"}}>Score</th>
          <th style={thStyle} onClick={()=>sortBy("stage")}>Stage</th>
          <th style={thStyle}>Original Stage</th>
          <th style={thStyle}>Source</th>
          <th style={thStyle}>Phone</th>
          <th style={thStyle}>Actions</th>
        </tr></thead>
        <tbody>
          {paged.map(lead=><tr key={lead.id} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="var(--cream)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <td style={{padding:"7px 7px",borderBottom:"1px solid var(--border)",fontWeight:"bold",fontSize:11}} onClick={()=>openLead(lead)}>{lead.name||"—"}{isRevived(lead)&&<span style={{fontSize:9,color:"var(--green)",marginLeft:4}}>✓</span>}</td>
            <td style={{padding:"7px 7px",borderBottom:"1px solid var(--border)",textAlign:"center"}} onClick={()=>openLead(lead)}><GradeBadge grade={lead.grade}/><span style={{fontSize:10,color:scoreColor(lead.score||0),marginLeft:3}}>{lead.score||0}</span></td>
            <td style={{padding:"7px 7px",borderBottom:"1px solid var(--border)"}} onClick={()=>openLead(lead)}><StagePill stage={lead.stage}/></td>
            <td style={{padding:"7px 7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)",fontStyle:"italic"}} onClick={()=>openLead(lead)}>{lead.orig_stage&&lead.orig_stage!==lead.stage?lead.orig_stage:"—"}</td>
            <td style={{padding:"7px 7px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--gray)"}} onClick={()=>openLead(lead)}>{lead.source||"—"}</td>
            <td style={{padding:"7px 7px",borderBottom:"1px solid var(--border)",fontSize:10}} onClick={()=>openLead(lead)}>{lead.phone||"—"}</td>
            <td style={{padding:"7px 7px",borderBottom:"1px solid var(--border)"}}><div style={{display:"flex",gap:3}}><Btn onClick={()=>markRevived(lead)} green small>✓</Btn><Btn onClick={()=>setEditLead(lead)} small>Edit</Btn><Btn onClick={()=>archiveLead(lead)} gold small>Archive</Btn></div></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {pages>1&&<div style={{display:"flex",gap:4,justifyContent:"center",marginTop:11,alignItems:"center"}}>
      {page>1&&<button onClick={()=>setPage(p=>p-1)} style={{padding:"3px 8px",border:"1px solid var(--border)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:11}}>← Prev</button>}
      <span style={{fontSize:10,color:"var(--gray)",padding:"0 6px"}}>Page {page} of {pages} ({filtered.length})</span>
      {page<pages&&<button onClick={()=>setPage(p=>p+1)} style={{padding:"3px 8px",border:"1px solid var(--border)",background:"white",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:11}}>Next →</button>}
    </div>}
    {addOpen&&<EditModal lead={{stage:"New Lead (Fresh)",type:"Buyer",source:"Facebook",assigned:"Bri"}} saveEdit={l=>{addNewLead(l);setAddOpen(false);}} close={()=>setAddOpen(false)} isNew/>}
  </div>;
}

// ─── Reactivation tab ─────────────────────────────────────────────────────────
function ReactivationTab({ leads, openLead }) {
  const groups=[["Re-Engagement Buyer","var(--blue)"],["Re-Engagement Seller","var(--red)"],["Re-Engagement Past Client","var(--gold2)"],["Re-Engagement Investor","var(--green)"],["Re-Engagement Luxury","var(--rust)"]];
  return <div>
    <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:3}}>↻ Reactivation Pipeline</div>
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:14}}>All dormant leads — exits only upon confirmed re-engagement</div>
    <div style={{background:"linear-gradient(135deg,#FAF8F4,#FAF6EC)",border:"1px solid rgba(196,164,90,0.35)",padding:12,marginBottom:14,fontSize:11,lineHeight:1.7}}>
      <div style={{fontFamily:"Georgia,serif",fontSize:12,color:"var(--gold2)",marginBottom:5}}>How to Exit This Pipeline</div>
      A lead exits only when: (1) They respond, (2) They schedule an appointment, or (3) They confirm current interest. Open the lead → click <strong>✓ Mark Revived</strong> → update their stage.
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:9,marginBottom:14}}>
      {groups.map(([stage,color])=><div key={stage} style={{background:"white",border:"1px solid var(--border)",padding:"13px 15px"}}>
        <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--gray)",marginBottom:4}}>{stage.replace("Re-Engagement ","")}</div>
        <div style={{fontFamily:"Georgia,serif",fontSize:24,lineHeight:1,color}}>{leads.filter(l=>l.stage===stage).length}</div>
      </div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {groups.map(([stage,color])=>{
        const group=leads.filter(l=>l.stage===stage).sort((a,b)=>(b.score||0)-(a.score||0));
        return group.length?<div key={stage} style={{background:"white",border:"1px solid var(--border)",padding:14}}>
          <div style={{fontSize:13,fontFamily:"Georgia,serif",color,marginBottom:2}}>{stage} ({group.length})</div>
          <div style={{fontSize:9,color:"var(--gray)",marginBottom:10}}>Sorted by AI score</div>
          {group.slice(0,8).map(lead=><div key={lead.id} onClick={()=>openLead(lead)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 0",borderBottom:"1px solid var(--border)",cursor:"pointer"}}>
            <GradeBadge grade={lead.grade}/>
            <div style={{flex:1}}><div style={{fontWeight:"bold",fontSize:11}}>{lead.name}</div>{lead.notes&&<div style={{fontSize:9,color:"var(--gray)",lineHeight:1.3}}>{lead.notes.slice(0,60)}...</div>}</div>
            <span style={{fontSize:9,color:"var(--gray)"}}>{lead.score||0}</span>
          </div>)}
          {group.length>8&&<div style={{fontSize:10,color:"var(--gray)",padding:"6px 0"}}>+{group.length-8} more</div>}
        </div>:null;
      })}
    </div>
  </div>;
}

// ─── Revived tab ──────────────────────────────────────────────────────────────
function RevivedTab({ revived, openLead }) {
  return <div>
    <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:3}}>✓ Revived Leads</div>
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:14}}>Leads that have responded after dormancy</div>
    {revived.length?<div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>{["Name","Score","Stage","Original Stage","Phone","Tags"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 7px",borderBottom:"1px solid var(--border)",color:"var(--gray)",fontSize:10,fontFamily:"Georgia,serif",fontWeight:"normal"}}>{h}</th>)}</tr></thead>
        <tbody>{revived.map(lead=><tr key={lead.id} onClick={()=>openLead(lead)} style={{cursor:"pointer"}}>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)",fontWeight:"bold"}}>{lead.name}</td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)"}}><GradeBadge grade={lead.grade}/></td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)"}}><StagePill stage={lead.stage}/></td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)",fontStyle:"italic"}}>{lead.orig_stage||"—"}</td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)",fontSize:10}}>{lead.phone||"—"}</td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)",fontSize:9,color:"var(--gray)"}}>{(lead.tags||"").split(",").slice(0,2).join(", ")}</td>
        </tr>)}</tbody>
      </table>
    </div>:<div style={{background:"linear-gradient(135deg,#FAF8F4,#FAF6EC)",border:"1px solid rgba(196,164,90,0.35)",padding:12,fontSize:11,lineHeight:1.7}}>No revived leads yet. When a lead responds, open their record and click <strong>✓ Mark Revived</strong>.</div>}
  </div>;
}

// ─── ISA tab ──────────────────────────────────────────────────────────────────
function ISATab({ leads, openLead }) {
  const priority=leads.filter(l=>(l.tags||"").includes("Re-Engagement Priority")).sort((a,b)=>(b.score||0)-(a.score||0));
  const longterm=leads.filter(l=>(l.tags||"").includes("Long-Term Reactivation")).sort((a,b)=>(b.score||0)-(a.score||0));
  const callList=[...priority.slice(0,8),...longterm.slice(0,6),...leads.filter(l=>l.stage==="Past Client").slice(0,4)].slice(0,20);
  return <div>
    <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:3}}>ISA Reactivation System <em style={{color:"var(--gold2)",fontStyle:"italic"}}>— Deena</em></div>
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:14}}>Daily mission: Lead reactivation — Mon–Thu 11am–6pm · Sat 9am–12pm</div>
    <div style={{background:"linear-gradient(135deg,#FAF8F4,#F5EFE8)",border:"1px solid rgba(196,164,90,0.4)",borderLeft:"3px solid var(--gold)",padding:"12px 16px",marginBottom:14,fontSize:11,lineHeight:1.7}}>
      <strong>Reality:</strong> All leads in your call list are confirmed dormant. Treat every contact as fresh cold outreach. Log every attempt. When someone responds, open their record and click <strong>✓ Mark Revived</strong> immediately.
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{background:"white",border:"1px solid var(--border)",padding:14}}>
        <div style={{fontSize:13,fontFamily:"Georgia,serif",marginBottom:10}}>Today's Call List (Top 20)</div>
        {callList.map((lead,i)=><div key={lead.id} onClick={()=>openLead(lead)} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 0",borderBottom:"1px solid var(--border)",cursor:"pointer"}}>
          <span style={{fontSize:10,color:"var(--gray2)",minWidth:18}}>{i+1}</span>
          <GradeBadge grade={lead.grade}/>
          <div style={{flex:1}}><strong style={{fontSize:11}}>{lead.name}</strong><div style={{fontSize:9,color:"var(--gray)"}}>{lead.phone||"No phone"}</div></div>
          {(lead.tags||"").includes("Re-Engagement Priority")&&<span style={{fontSize:8,padding:"2px 5px",background:"#FDE8E8",color:"#A32D2D",border:"1px solid #D08080"}}>PRI</span>}
        </div>)}
      </div>
      <div>
        <div style={{background:"white",border:"1px solid var(--border)",padding:14,marginBottom:12}}>
          <div style={{fontSize:13,fontFamily:"Georgia,serif",marginBottom:10}}>Outreach Scripts</div>
          {[{label:"📱 Text — Warm",body:"Hey [Name]! It's Bri from Estēm Realty — it's been a while! Are your real estate plans still on the radar? No pressure 😊"},{label:"📱 Text — Direct",body:"Hi [Name], Bri Wesley with Estēm Realty. Just checking in — still thinking about buying/selling?"},{label:"📞 Call — Warm",body:"Hi [Name], this is Bri Wesley with Estēm Realty. Did I catch you at a good time? Has anything changed with your real estate plans?"},{label:"🔔 Voicemail",body:"Hi [Name], it's Bri Wesley with Estēm Realty — just thinking about you. Call or text me when you get a chance. No rush!"}].map(({label,body})=>{
            const [cp,setCp]=useState(false);
            return <div key={label} style={{background:"var(--cream2)",border:"1px solid var(--border)",padding:"8px 10px",marginBottom:7}}>
              <div style={{fontSize:9,fontWeight:"bold",color:"var(--gold2)",letterSpacing:.5,marginBottom:4}}>{label}</div>
              <div style={{fontSize:11,lineHeight:1.6,color:"var(--black2)",marginBottom:6}}>{body}</div>
              <button onClick={()=>{navigator.clipboard.writeText(body);setCp(true);setTimeout(()=>setCp(false),2000);}} style={{fontSize:9,padding:"2px 8px",background:cp?"var(--green)":"var(--black)",color:"white",border:"none",fontFamily:"Georgia,serif",cursor:"pointer"}}>{cp?"✓ Copied":"Copy"}</button>
            </div>;
          })}
        </div>
      </div>
    </div>
  </div>;
}

// ─── Archive tab ──────────────────────────────────────────────────────────────
function ArchiveTab({ arch, restoreLead }) {
  const [search,setSearch] = useState("");
  const list=arch.filter(l=>!search||(l.name||"").toLowerCase().includes(search.toLowerCase()));
  return <div>
    <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:3}}>Archived Leads</div>
    <div style={{fontSize:11,color:"var(--gray)",marginBottom:14}}>Removed from active views. Restore anytime.</div>
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search archived..." style={{padding:"5px 9px",border:"1px solid var(--border2)",background:"white",fontSize:11,outline:"none",marginBottom:12,width:280,fontFamily:"Georgia,serif"}}/>
    {list.length?<div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>{["Name","Stage","Source","Phone","Archived",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 7px",borderBottom:"1px solid var(--border)",color:"var(--gray)",fontSize:10,fontFamily:"Georgia,serif",fontWeight:"normal"}}>{h}</th>)}</tr></thead>
        <tbody>{list.map(lead=><tr key={lead.id} style={{opacity:.7}}>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)",fontWeight:"bold"}}>{lead.name}</td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)"}}><StagePill stage={lead.stage}/></td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--gray)"}}>{lead.source||"—"}</td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)",fontSize:10}}>{lead.phone||"—"}</td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--gray)"}}>{lead.archived_on||"—"}</td>
          <td style={{padding:"7px",borderBottom:"1px solid var(--border)"}}><Btn onClick={()=>restoreLead(lead)} small>Restore</Btn></td>
        </tr>)}</tbody>
      </table>
    </div>:<div style={{color:"var(--gray)",fontSize:12,textAlign:"center",padding:32}}>No archived leads.</div>}
  </div>;
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────
function LeadPanel({ lead, notes, user, noteText, setNoteText, noteType, setNoteType, addNote, markRevived, archiveLead, setEditLead, close, saveLead, setLeads, toast }) {
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const refreshAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/refresh-lead-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiResult(data.ai);
        toast && toast("✓ AI recommendations updated");
      } else {
        toast && toast("AI refresh failed");
      }
    } catch (err) {
      toast && toast("AI refresh error");
    } finally {
      setAiLoading(false);
    }
  };

  const addNoteAndRefresh = async () => {
    await addNote();
    // Background AI refresh after note saves — silent
    fetch("/api/refresh-lead-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id }),
    }).then(r => r.json()).then(data => {
      if (data.ok) setAiResult(data.ai);
    }).catch(() => {});
  };

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"22px 14px",overflowY:"auto"}} onClick={e=>e.target===e.currentTarget&&close()}>
    <div style={{background:"white",width:"100%",maxWidth:900,padding:22,position:"relative",margin:"auto"}}>
      <button onClick={close} style={{position:"absolute",top:11,right:14,background:"none",border:"none",fontSize:19,cursor:"pointer",color:"var(--gray)"}}>×</button>


      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:5}}>{lead.name}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <StagePill stage={lead.stage}/>
            <GradeBadge grade={lead.grade}/>
            {isRevived(lead)&&<span style={{background:"#E4F5E4",color:"var(--green)",border:"1px solid #6AB46A",padding:"2px 7px",fontSize:9}}>✓ Revived</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          <Btn onClick={()=>markRevived(lead)} green small>✓ Mark Revived</Btn>
          <Btn onClick={()=>setEditLead(lead)} small>✏ Edit</Btn>
          <Btn onClick={()=>archiveLead(lead)} gold small>Archive</Btn>
          <Btn onClick={close} small>Close</Btn>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        {/* Column 1: Info + Tags */}
        <div>
          <SectionLabel>Contact Information</SectionLabel>
          <FieldRow label="Phone">{lead.phone||"—"}</FieldRow>
          <FieldRow label="Email"><span style={{wordBreak:"break-all",fontSize:10}}>{lead.email||"—"}</span></FieldRow>
          <FieldRow label="City / State">{[lead.city,lead.state].filter(Boolean).join(", ")||"—"}</FieldRow>
          <FieldRow label="Date Added">{lead.added||"—"}</FieldRow>
          <FieldRow label="Follow-up">{lead.followup||"—"}</FieldRow>

          <SectionLabel style={{marginTop:14}}>Lead Details</SectionLabel>
          <FieldRow label="Stage"><StagePill stage={lead.stage}/></FieldRow>
          <FieldRow label="Original Stage"><span style={{fontSize:10,color:"var(--gray)",fontStyle:"italic"}}>{lead.orig_stage||"—"}</span></FieldRow>
          <FieldRow label="Type">{lead.type||"—"}</FieldRow>
          <FieldRow label="Source">{lead.source||"—"}</FieldRow>
          <FieldRow label="Assigned">{lead.assigned||"Unassigned"}</FieldRow>
          <FieldRow label="AI Score"><strong style={{color:scoreColor(lead.score||0)}}>{lead.score||0}/100</strong> — Grade: <strong>{lead.grade||"D"}</strong></FieldRow>
          <FieldRow label="Budget">{lead.budget||"—"}</FieldRow>
          <FieldRow label="Pre-Approval">{lead.preapproval||"—"}</FieldRow>

          {/* ── TAGS — now fully editable ── */}
          <SectionLabel style={{marginTop:14}}>Tags</SectionLabel>
          <TagEditor
            lead={lead}
            toast={toast}
            onSave={async ({ id, tags }) => {
              const updated = { ...lead, tags };
              setLeads(leads => leads.map(l => l.id === id ? updated : l));
              await saveLead({ id, tags });
            }}
          />

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:14,marginBottom:6}}>
            <SectionLabel style={{marginBottom:0,borderBottom:"none",paddingBottom:0}}>AI Recommendation</SectionLabel>
            <button onClick={refreshAI} disabled={aiLoading} style={{fontFamily:"Georgia,serif",fontSize:9,padding:"3px 9px",border:"1px solid var(--border2)",background:aiLoading?"var(--cream2)":"var(--black)",color:aiLoading?"var(--gray)":"var(--cream)",cursor:aiLoading?"default":"pointer"}}>
              {aiLoading ? "⟳ Updating..." : "⟳ Refresh AI"}
            </button>
          </div>
          {aiResult ? <AILiveResult result={aiResult}/> : <AIInsight lead={lead}/>}
        </div>

        {/* Column 2: Notes */}
        <div>
          <SectionLabel>Add Activity Note</SectionLabel>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--gray)",marginBottom:3}}>Activity Type</div>
            <select value={noteType} onChange={e=>setNoteType(e.target.value)} style={{width:"100%",padding:"5px",border:"1px solid var(--border2)",background:"var(--cream)",fontFamily:"Georgia,serif",fontSize:11}}>
              {NOTE_TYPES.map(n=><option key={n.v} value={n.v}>{n.l}</option>)}
            </select>
          </div>
          <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Enter note, call outcome, text response, appointment details..." rows={5} style={{width:"100%",marginBottom:6,fontFamily:"Georgia,serif",fontSize:11,padding:8,border:"1px solid var(--border2)",background:"var(--cream)",resize:"vertical"}}/>
          <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:14}}>
            <button onClick={addNoteAndRefresh} style={{flex:1,background:"var(--black)",color:"var(--cream)",border:"none",padding:"6px 13px",fontSize:11,fontFamily:"Georgia,serif",cursor:"pointer"}}>✓ Save Note</button>
            <div style={{fontSize:9,color:"var(--gray)",textAlign:"right"}}>Logged as:<br/><strong>{user}</strong></div>
          </div>

          <SectionLabel>Call & Text</SectionLabel>
          <PhoneStrip phone={lead.phone}/>

          <SectionLabel style={{marginTop:10}}>Script Library</SectionLabel>
          <ScriptLibrary lead={lead} setNoteText={setNoteText}/>
        </div>

        {/* Column 3: Timeline */}
        <div>
          <SectionLabel>Activity Timeline</SectionLabel>
          <div style={{maxHeight:520,overflowY:"auto"}}>
            {!notes.length&&lead.notes&&<div style={{display:"flex",gap:9,padding:"8px 0",borderBottom:"1px solid var(--border)",alignItems:"flex-start"}}>
              <div style={{fontSize:14,width:22,textAlign:"center",flexShrink:0}}>📝</div>
              <div><div style={{fontSize:9,color:"var(--gray)",marginBottom:2}}>Historical Note</div><div style={{fontSize:11,color:"var(--black2)",lineHeight:1.5}}>{lead.notes}</div></div>
            </div>}
            {!notes.length&&!lead.notes&&<div style={{color:"var(--gray)",fontSize:11,fontStyle:"italic",padding:8}}>No activity recorded yet.</div>}
            {notes.map(n=><div key={n.id} style={{display:"flex",gap:9,padding:"8px 0",borderBottom:"1px solid var(--border)",alignItems:"flex-start"}}>
              <div style={{fontSize:14,width:22,textAlign:"center",flexShrink:0,color:{note:"var(--black)",call:"var(--blue)",text:"var(--green)",email:"var(--gold2)",appointment:"var(--red)",voicemail:"var(--gray)"}[n.type]||"var(--gray)"}}>
                {{note:"📝",call:"📞",text:"💬",email:"✉️",appointment:"📅",voicemail:"🔔"}[n.type]||"•"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:"var(--gray)",marginBottom:2}}>{fmtDate(n.created_at)} &nbsp;|&nbsp; <strong>{n.user_name||"System"}</strong></div>
                <div style={{fontSize:11,color:"var(--black2)",lineHeight:1.5}}>{n.text}</div>
              </div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// ─── Edit / Add Lead Modal ────────────────────────────────────────────────────
function EditModal({ lead, saveEdit, close, isNew }) {
  const [form,setForm] = useState({
    name:lead.name||"",phone:lead.phone||"",email:lead.email||"",city:lead.city||"",
    state:lead.state||"TX",stage:lead.stage||STAGES[0],type:lead.type||"Buyer",
    source:lead.source||"Facebook",assigned:lead.assigned||"Bri",budget:lead.budget||"",
    followup:lead.followup||"",preapproval:lead.preapproval||"",tags:lead.tags||"",
    notes:"",priority:lead.priority||"",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"22px 14px",overflowY:"auto"}} onClick={e=>e.target===e.currentTarget&&close()}>
    <div style={{background:"white",width:"100%",maxWidth:700,padding:22,position:"relative",margin:"auto"}}>
      <button onClick={close} style={{position:"absolute",top:11,right:14,background:"none",border:"none",fontSize:19,cursor:"pointer",color:"var(--gray)"}}>×</button>
      <div style={{fontFamily:"Georgia,serif",fontSize:18,marginBottom:14}}>{isNew?"Add New Lead":"Edit Lead"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:9}}>
        <FormField label="Full Name *"><input value={form.name} onChange={e=>set("name",e.target.value)} style={INPUT}/></FormField>
        <FormField label="Phone"><input value={form.phone} onChange={e=>set("phone",e.target.value)} style={INPUT}/></FormField>
        <FormField label="Email"><input value={form.email} onChange={e=>set("email",e.target.value)} style={INPUT}/></FormField>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:9}}>
        <FormField label="City"><input value={form.city} onChange={e=>set("city",e.target.value)} style={INPUT}/></FormField>
        <FormField label="State"><input value={form.state} onChange={e=>set("state",e.target.value)} style={INPUT}/></FormField>
        <FormField label="Stage"><select value={form.stage} onChange={e=>set("stage",e.target.value)} style={INPUT}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></FormField>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:9}}>
        <FormField label="Type"><select value={form.type} onChange={e=>set("type",e.target.value)} style={INPUT}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Source"><select value={form.source} onChange={e=>set("source",e.target.value)} style={INPUT}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Assigned To"><select value={form.assigned} onChange={e=>set("assigned",e.target.value)} style={INPUT}>{USERS.map(u=><option key={u}>{u}</option>)}</select></FormField>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
        <FormField label="Budget"><input value={form.budget} onChange={e=>set("budget",e.target.value)} placeholder="e.g. $350K–$450K" style={INPUT}/></FormField>
        <FormField label="Next Follow-up"><input value={form.followup} onChange={e=>set("followup",e.target.value)} placeholder="e.g. June 15" style={INPUT}/></FormField>
      </div>
      <FormField label="Tags">
        <input value={form.tags} onChange={e=>set("tags",e.target.value)} placeholder="Comma separated: Hot, Pre-Approved, Follow Up" style={INPUT}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:5}}>
          {TAG_PRESETS.map(t=><button key={t} type="button" onClick={()=>{ const cur=(form.tags||"").split(",").map(x=>x.trim()).filter(Boolean); if(!cur.includes(t)) set("tags",[...cur,t].join(", ")); }} style={{fontSize:8,padding:"2px 6px",border:"1px solid var(--border2)",background:"white",color:"var(--gray)",cursor:"pointer",fontFamily:"Georgia,serif"}}>{t}</button>)}
        </div>
      </FormField>
      <div style={{marginTop:9}}>
        <FormField label="Notes"><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Notes, motivation, timeline..." style={{...INPUT,resize:"vertical"}}/></FormField>
      </div>
      <div style={{display:"flex",gap:7,marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)"}}>
        <button onClick={()=>{if(!form.name.trim()){alert("Please enter a name.");return;} saveEdit({...lead,...form,id:lead.id||undefined});}} style={{background:"var(--black)",color:"var(--cream)",border:"none",padding:"6px 13px",fontSize:11,fontFamily:"Georgia,serif",cursor:"pointer"}}>Save Lead</button>
        <button onClick={close} style={{background:"white",border:"1px solid var(--border2)",padding:"6px 13px",fontSize:11,fontFamily:"Georgia,serif",cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  </div>;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [leads,setLeads] = useState([]);
  const [archived,setArchived] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [tab,setTab] = useState("exec");
  const [user,setUser] = useState("Bri");
  const [search,setSearch] = useState("");
  const [stageFilter,setStageFilter] = useState("all");
  const [tagFilter,setTagFilter] = useState("");
  const [page,setPage] = useState(1);
  const [sort,setSort] = useState({col:"score",dir:-1});
  const [selectedLead,setSelectedLead] = useState(null);
  const [notes,setNotes] = useState([]);
  const [noteText,setNoteText] = useState("");
  const [noteType,setNoteType] = useState("note");
  const [editLead,setEditLead] = useState(null);
  const [saving,setSaving] = useState(false);
  const [toast,setToastMsg] = useState("");

  useEffect(()=>{
    fetch("/api/leads").then(r=>r.json()).then(data=>{
      if(data.error){setError(data.error);setLoading(false);return;}
      setLeads(data.filter(l=>!l.is_archived));
      setArchived(data.filter(l=>l.is_archived));
      setLoading(false);
    }).catch(e=>{setError(e.message);setLoading(false);});
  },[]);

  const showToast = (msg) => { setToastMsg(msg); setTimeout(()=>setToastMsg(""),2800); };

  const saveLead = async (data) => {
    setSaving(true);
    await fetch("/api/leads",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    setSaving(false);
  };

  const addNote = async () => {
    if(!noteText.trim()||!selectedLead) return;
    const n={lead_id:selectedLead.id,text:noteText.trim(),type:noteType,user_name:user};
    await fetch("/api/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});
    setNotes(prev=>[{...n,created_at:new Date().toISOString(),id:uid()},...prev]);
    setNoteText("");
    showToast("✓ Note saved");
  };

  const openLead = async (lead) => {
    setSelectedLead(lead);
    setNotes([]);
    const r=await fetch(`/api/notes?lead_id=${lead.id}`);
    const data=await r.json();
    if(!data.error) setNotes(data);
  };

  const markRevived = async (lead) => {
    const tags=lead.tags?.includes("Revived Lead")?lead.tags:(lead.tags?lead.tags+", Revived Lead":"Revived Lead");
    const updated={...lead,tags,is_revived:true};
    setLeads(ls=>ls.map(l=>l.id===lead.id?updated:l));
    setSelectedLead(updated);
    await saveLead({id:lead.id,tags,is_revived:true});
    showToast("🌟 "+lead.name+" marked as Revived");
  };

  const archiveLead = async (lead) => {
    const updated={...lead,is_archived:true,archived_on:new Date().toISOString().slice(0,10)};
    setLeads(ls=>ls.filter(l=>l.id!==lead.id));
    setArchived(a=>[updated,...a]);
    setSelectedLead(null);
    await saveLead({id:lead.id,is_archived:true,archived_on:updated.archived_on});
    showToast(lead.name+" archived");
  };

  const restoreLead = async (lead) => {
    const updated={...lead,is_archived:false,archived_on:""};
    setArchived(a=>a.filter(l=>l.id!==lead.id));
    setLeads(ls=>[updated,...ls]);
    await saveLead({id:lead.id,is_archived:false,archived_on:""});
    showToast(lead.name+" restored");
  };

  const saveEdit = async (data) => {
    const updated={...editLead,...data};
    setLeads(ls=>ls.map(l=>l.id===updated.id?updated:l));
    if(selectedLead?.id===updated.id) setSelectedLead(updated);
    setEditLead(null);
    await saveLead(updated);
    showToast("✓ Lead updated");
  };

  const addNewLead = async (data) => {
    const newLead={...data,id:uid(),score:50,grade:"C",is_archived:false,is_revived:false,added:new Date().toISOString().slice(0,10),orig_stage:data.stage};
    setLeads(ls=>[newLead,...ls]);
    await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newLead)});
    showToast("✓ Lead added");
  };

  // Filtered + sorted leads
  const filtered = leads.filter(l=>{
    if(stageFilter!=="all"&&l.stage!==stageFilter) return false;
    if(tagFilter&&!(l.tags||"").toLowerCase().includes(tagFilter.toLowerCase())) return false;
    if(search){const s=search.toLowerCase();return(l.name||"").toLowerCase().includes(s)||(l.phone||"").includes(s)||(l.email||"").toLowerCase().includes(s)||(l.tags||"").toLowerCase().includes(s)||(l.city||"").toLowerCase().includes(s);}
    return true;
  }).sort((a,b)=>{
    if(sort.col==="score") return ((b.score||0)-(a.score||0))*sort.dir;
    const ra=(a[sort.col]||"").toLowerCase(), rb=(b[sort.col]||"").toLowerCase();
    return ra<rb?-sort.dir:ra>rb?sort.dir:0;
  });

  const pages = Math.ceil(filtered.length/50);
  const paged = filtered.slice((page-1)*50, page*50);
  const top5 = [...leads].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5);
  const revived = leads.filter(isRevived);
  const reLeads = leads.filter(isReEngagement);

  if(loading) return <LoadingScreen/>;
  if(error) return <ErrorScreen error={error}/>;

  const TABS = [
    ["exec","★ Executive"],["priorities","▲ AI Priorities"],["leads","All Leads"],
    ["reactivation","↻ Reactivation"],["revived","✓ Revived"],["isa","ISA — Deena"],
    ["bulktag","⬡ Bulk Tag"],["bulkemail","✉ Email"],["archive","Archive"],
  ];

  return <>
    <Head><title>Estēm Realty Group — CRM</title></Head>
    <div style={{fontFamily:"Georgia,serif",background:"var(--cream)",minHeight:"100vh",fontSize:13}}>

      {/* Top nav */}
      <div style={{background:"var(--black)",padding:"0 22px",display:"flex",alignItems:"center",justifyContent:"space-between",height:50,position:"sticky",top:0,zIndex:200}}>
        <div style={{color:"var(--cream)",fontSize:16,letterSpacing:1}}>Est<span style={{color:"var(--gold)"}}>ē</span>m Realty Group</div>
        <div style={{display:"flex",alignItems:"center",gap:10,fontSize:10,color:"var(--gray2)"}}>
          {saving&&<span style={{color:"var(--gold)"}}>Saving...</span>}
          <span>{leads.length} CONTACTS</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:"var(--cream2)",borderBottom:"1px solid var(--border)",display:"flex",padding:"0 22px",overflowX:"auto"}}>
        {TABS.map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{padding:"10px 13px",border:"none",background:"none",fontSize:11,color:tab===id?"var(--black)":"var(--gray)",borderBottom:tab===id?"2px solid var(--black)":"2px solid transparent",fontWeight:tab===id?"bold":"normal",whiteSpace:"nowrap",cursor:"pointer"}}>{label}</button>)}
      </div>

      {/* User bar */}
      <div style={{background:"var(--black2)",padding:"4px 22px",display:"flex",alignItems:"center",gap:12,fontSize:10,color:"var(--gray2)"}}>
        <span>Logged in as: <strong style={{color:"var(--gold)"}}>{user}</strong></span>
        <span style={{marginLeft:"auto"}}>Switch:</span>
        {["Bri","Joseph","Deena"].map(u=><button key={u} onClick={()=>setUser(u)} style={{background:user===u?"var(--gold2)":"none",border:"1px solid var(--gray)",color:user===u?"white":"var(--gray2)",padding:"2px 8px",fontSize:9,fontFamily:"Georgia,serif",cursor:"pointer"}}>{u}</button>)}
      </div>

      {/* Tab content */}
      <div style={{padding:"18px 22px",maxWidth:1500,margin:"0 auto"}}>
        {tab==="exec"&&<ExecTab leads={leads} revived={revived} reLeads={reLeads} top5={top5} openLead={openLead}/>}
        {tab==="priorities"&&<PrioritiesTab leads={leads} revived={revived} openLead={openLead}/>}
        {tab==="leads"&&<LeadsTab paged={paged} filtered={filtered} leads={leads} search={search} setSearch={v=>{setSearch(v);setPage(1);}} stageFilter={stageFilter} setStageFilter={v=>{setStageFilter(v);setPage(1);}} tagFilter={tagFilter} setTagFilter={v=>{setTagFilter(v);setPage(1);}} sort={sort} setSort={setSort} page={page} setPage={setPage} pages={pages} openLead={openLead} archiveLead={archiveLead} markRevived={markRevived} setEditLead={setEditLead} addNewLead={addNewLead}/>}
        {tab==="reactivation"&&<ReactivationTab leads={leads} openLead={openLead}/>}
        {tab==="revived"&&<RevivedTab revived={revived} openLead={openLead}/>}
        {tab==="isa"&&<ISATab leads={leads} openLead={openLead}/>}
        {tab==="bulktag"&&<BulkTagPanel leads={leads} toast={showToast} onBatchSave={saveLead} onLeadsUpdated={setLeads}/>}
        {tab==="bulkemail"&&<BulkEmailPanel leads={leads} toast={showToast} user={user} onSendConfirmed={(updatedLeads)=>{setLeads(ls=>ls.map(l=>{const u=updatedLeads.find(x=>x.id===l.id);return u?{...l,last_email_sent:u.last_email_sent,lcd:u.lcd}:l;}));}}/>}
        {tab==="archive"&&<ArchiveTab arch={archived} restoreLead={restoreLead}/>}
      </div>

      {/* Lead panel */}
      {selectedLead&&<LeadPanel
        lead={selectedLead} notes={notes} user={user}
        noteText={noteText} setNoteText={setNoteText}
        noteType={noteType} setNoteType={setNoteType}
        addNote={addNote} markRevived={markRevived}
        archiveLead={archiveLead} setEditLead={setEditLead}
        close={()=>setSelectedLead(null)}
        saveLead={saveLead} setLeads={setLeads} toast={showToast}
      />}

      {/* Edit modal */}
      {editLead&&<EditModal lead={editLead} saveEdit={saveEdit} close={()=>setEditLead(null)}/>}

      {/* Toast */}
      {toast&&<div style={{position:"fixed",bottom:18,right:18,background:"var(--black)",color:"var(--cream)",padding:"8px 14px",fontSize:11,zIndex:3000}}>{toast}</div>}
    </div>
  </>;
}
