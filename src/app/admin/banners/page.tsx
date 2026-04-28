'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import MediaModal from '@/components/MediaModal';
import styles from '../admin.module.css';

/* ─── Types ─────────────────────────────── */
interface Banner {
  id: number;
  title: string;
  subtitle: string;
  badge_text: string;
  cta_text: string;
  cta_url: string;
  image_url: string;
  bg_color: string;
  text_color: string;
  height_px: number;
  sort_order: number;
  active: boolean;
}

interface PromoTile {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  bg_color: string;
  text_color: string;
  badge_text: string;
  sort_order: number;
  active: boolean;
  position: string;
  shape: string;
}

const BANNER_BLANK: Omit<Banner, 'id'> = {
  title: '', subtitle: '', badge_text: '',
  cta_text: 'Shop Now', cta_url: '/',
  image_url: '', bg_color: '#0f766e', text_color: 'light',
  height_px: 380, sort_order: 0, active: true,
};

const TILE_BLANK: Omit<PromoTile, 'id'> = {
  title: '', subtitle: '', image_url: '',
  link_url: '/', bg_color: '#f0fdfa', text_color: 'dark',
  badge_text: '', sort_order: 0, active: true,
  position: 'top', shape: 'rectangle',
};

const PRESET_COLORS = [
  'transparent',
  '#0f766e','#0e7490','#1e1b4b','#7c3aed',
  '#be123c','#b45309','#166534','#1e293b',
  '#f97316','#ec4899','#6366f1','#064e3b',
  '#f0fdfa','#eff6ff','#fdf4ff','#fff7ed','#f0fdf4','#fefce8',
];

const iconBtn: React.CSSProperties = {
  background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:6,
  width:32, height:32, cursor:'pointer', fontSize:'0.9rem',
  display:'flex', alignItems:'center', justifyContent:'center', color:'#374151',
};

/* Shared button styles */
const actionBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg,#0f766e,#0d9488)', color: '#fff',
  border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem',
  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(15,118,110,0.25)',
};
const cancelBtnStyle: React.CSSProperties = {
  background: '#f3f4f6', color: '#374151',
  border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 1.25rem',
  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
};
const editBtnStyle: React.CSSProperties = {
  background: '#0f766e', color: '#fff', border: 'none',
  borderRadius: 7, padding: '0.4rem 1rem', fontWeight: 700,
  fontSize: '0.8rem', cursor: 'pointer',
};
const deleteBtnStyle: React.CSSProperties = {
  background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
  borderRadius: 7, padding: '0.4rem 1rem', fontWeight: 700,
  fontSize: '0.8rem', cursor: 'pointer',
};

/* ─── Colour picker helper ──────────────── */
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', alignItems:'center', marginTop:4 }}>
      {PRESET_COLORS.map(c => (
        <button key={c} onClick={() => onChange(c)} title={c === 'transparent' ? 'Transparent' : c} style={{
          width:28, height:28, borderRadius:6,
          background: c === 'transparent'
            ? 'repeating-conic-gradient(#d1d5db 0% 25%, #fff 0% 50%) 50%/12px 12px'
            : c,
          border:'none', cursor:'pointer',
          outline: value === c ? '3px solid #0f766e' : '1px solid #e5e7eb', outlineOffset:2,
        }} />
      ))}
      <input type="color" value={value === 'transparent' ? '#ffffff' : value} onChange={e => onChange(e.target.value)}
        style={{ width:28, height:28, border:'1px solid #d1d5db', borderRadius:6, padding:2, cursor:'pointer' }} />
      <span style={{ fontSize:'0.78rem', color:'#6b7280' }}>{value}</span>
    </div>
  );
}

/* ─── Image picker row ─────────────────── */
function ImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mediaOpen, setMediaOpen] = useState(false);
  return (
    <>
      <div style={{ display:'flex', gap:'0.5rem', alignItems:'flex-start', marginTop:4 }}>
        {/* Thumbnail */}
        <div style={{
          width:70, height:70, borderRadius:8, border:'1px dashed #d1d5db',
          background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center',
          overflow:'hidden', flexShrink:0,
        }}>
          {value
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={value} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:'1.5rem', opacity:0.3 }}>🖼️</span>
          }
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.4rem' }}>
          <button
            type="button"
            onClick={() => setMediaOpen(true)}
            style={{
              background:'#0f766e', color:'#fff', border:'none', borderRadius:7,
              padding:'0.45rem 1rem', fontWeight:700, fontSize:'0.84rem', cursor:'pointer',
              alignSelf:'flex-start',
            }}
          >
            📂 Select from Media Library
          </button>
          <input
            className={styles.input}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Or paste an image URL…"
            style={{ margin:0, fontSize:'0.8rem' }}
          />
          {value && (
            <button type="button" onClick={() => onChange('')}
              style={{ fontSize:'0.75rem', color:'#ef4444', background:'none', border:'none', cursor:'pointer', alignSelf:'flex-start' }}>
              ✕ Remove image
            </button>
          )}
        </div>
      </div>

      {mediaOpen && (
        <MediaModal
          title="Select Image"
          onClose={() => setMediaOpen(false)}
          onSelect={url => { onChange(url); setMediaOpen(false); }}
        />
      )}
    </>
  );
}

/* ═══ BANNER SECTION ════════════════════ */
function BannerSection() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<Omit<Banner,'id'>>(BANNER_BLANK);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{text:string;type:'ok'|'err'}|null>(null);
  const supabase = createClient();

  async function load() {
    const { data } = await supabase.from('banners').select('*').order('sort_order');
    setBanners(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function notify(text: string, type: 'ok'|'err' = 'ok') {
    setMsg({text,type}); setTimeout(() => setMsg(null), 3500);
  }
  function startEdit(b: Banner) {
    setEditing(b);
    const { id: _, ...rest } = b;
    setForm(rest);
    setTimeout(() => document.getElementById('banner-editor')?.scrollIntoView({behavior:'smooth'}), 50);
  }
  function startNew() {
    setEditing({id:-1,...BANNER_BLANK});
    setForm({...BANNER_BLANK});
    setTimeout(() => document.getElementById('banner-editor')?.scrollIntoView({behavior:'smooth'}), 50);
  }
  async function save() {
    if (!form.title.trim()) { notify('Title is required','err'); return; }
    setSaving(true);
    const { error } = editing!.id === -1
      ? await supabase.from('banners').insert([form])
      : await supabase.from('banners').update(form).eq('id', editing!.id);
    if (error) notify(error.message,'err'); else { notify(editing!.id === -1 ? 'Banner created ✓' : 'Saved ✓'); setEditing(null); load(); }
    setSaving(false);
  }
  async function toggleActive(b: Banner) {
    await supabase.from('banners').update({active:!b.active}).eq('id',b.id); load();
  }
  async function del(b: Banner) {
    if (!confirm(`Delete "${b.title}"?`)) return;
    await supabase.from('banners').delete().eq('id',b.id); notify('Deleted'); load();
  }
  async function moveOrder(b: Banner, dir:-1|1) {
    const sorted = [...banners].sort((a,c)=>a.sort_order-c.sort_order);
    const idx = sorted.findIndex(x=>x.id===b.id);
    const swapIdx = idx+dir;
    if (swapIdx<0||swapIdx>=sorted.length) return;
    const swap = sorted[swapIdx];
    await supabase.from('banners').update({sort_order:swap.sort_order}).eq('id',b.id);
    await supabase.from('banners').update({sort_order:b.sort_order}).eq('id',swap.id);
    load();
  }

  const isLight = form.text_color === 'light';

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <div style={{ fontWeight:700, color:'#111', fontSize:'1rem' }}>Hero Banners</div>
          <div style={{ fontSize:'0.82rem', color:'#6b7280' }}>Full-width rotating banners at the top of the homepage</div>
          <div style={{ marginTop:6, padding:'0.4rem 0.7rem', background:'#eff6ff', borderRadius:6, border:'1px solid #dbeafe', display:'inline-flex', alignItems:'center', gap:'0.35rem', fontSize:'0.75rem', color:'#1e40af', fontWeight:600 }}>
            📐 Recommended image size: <strong>1920 × 600px</strong> (wide landscape)
          </div>
        </div>
        <button
          onClick={startNew}
          style={{
            background:'linear-gradient(135deg,#0f766e,#0d9488)',
            color:'#fff', border:'none', borderRadius:9,
            padding:'0.6rem 1.4rem', fontWeight:700, fontSize:'0.9rem',
            cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem',
            boxShadow:'0 4px 14px rgba(15,118,110,0.35)', transition:'transform 0.15s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-1px)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}
        >
          ＋ New Banner
        </button>
      </div>

      {msg && (
        <div style={{
          padding:'0.7rem 1rem', borderRadius:8, marginBottom:'1rem',
          background:msg.type==='ok'?'#d1fae5':'#fee2e2',
          color:msg.type==='ok'?'#065f46':'#991b1b', fontWeight:600, fontSize:'0.88rem',
        }}>{msg.text}</div>
      )}

      {/* ── Editor ── */}
      {editing && (
        <div id="banner-editor" style={{
          background:'#fff', border:'1px solid #e5e7eb', borderRadius:14,
          padding:'1.5rem', marginBottom:'2rem', boxShadow:'0 4px 24px rgba(0,0,0,0.07)',
        }}>
          <h3 style={{fontSize:'0.95rem',fontWeight:700,marginBottom:'1.25rem',color:'#111'}}>
            {editing.id===-1?'New Banner':'Edit Banner'}
          </h3>

          {/* Live preview */}
          <div style={{
            background:form.bg_color, borderRadius:12, padding:'1.25rem 1.5rem',
            marginBottom:'1.5rem', display:'flex', alignItems:'center',
            gap:'1rem', minHeight:90, position:'relative', overflow:'hidden',
          }}>
            {form.image_url && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="" style={{
                  position:'absolute', right:0, top:0, height:'100%', width:'40%',
                  objectFit:'cover', objectPosition:'center',
                }}/>
                <div style={{
                  position:'absolute', right:'38%', top:0, width:'15%', height:'100%',
                  background:`linear-gradient(to right,${form.bg_color},transparent)`,
                }}/>
              </>
            )}
            <div style={{flex:1, zIndex:1, position:'relative'}}>
              {form.badge_text&&<span style={{
                display:'inline-block',background:'rgba(255,255,255,0.22)',
                color:isLight?'#fff':'#111',borderRadius:9999,
                padding:'0.1rem 0.65rem',fontSize:'0.65rem',fontWeight:800,
                letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4,
              }}>{form.badge_text}</span>}
              <div style={{fontWeight:800,fontSize:'1.1rem',color:isLight?'#fff':'#111',lineHeight:1.2}}>
                {form.title||'Banner Title'}
              </div>
              {form.subtitle&&<div style={{fontSize:'0.8rem',color:isLight?'rgba(255,255,255,0.8)':'#444',marginTop:2}}>
                {form.subtitle}
              </div>}
            </div>
            {form.cta_text&&<div style={{
              background:isLight?'#fff':form.bg_color,
              color:isLight?form.bg_color:'#fff',
              borderRadius:9999,padding:'0.4rem 1rem',
              fontWeight:700,fontSize:'0.78rem',whiteSpace:'nowrap',zIndex:1,
            }}>{form.cta_text} →</div>}
          </div>

          {/* Fields */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <div>
              <label className={styles.label}>Title *</label>
              <input className={styles.input} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Premium E-Liquids"/>
            </div>
            <div>
              <label className={styles.label}>Badge Label</label>
              <input className={styles.input} value={form.badge_text} onChange={e=>setForm(f=>({...f,badge_text:e.target.value}))} placeholder="HOT DEAL, NEW IN, SALE…"/>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label className={styles.label}>Subtitle</label>
              <input className={styles.input} value={form.subtitle} onChange={e=>setForm(f=>({...f,subtitle:e.target.value}))} placeholder="5 for £10 — Mix & Match Your Favourites"/>
            </div>
            <div>
              <label className={styles.label}>Button Text</label>
              <input className={styles.input} value={form.cta_text} onChange={e=>setForm(f=>({...f,cta_text:e.target.value}))} placeholder="Shop Now"/>
            </div>
            <div>
              <label className={styles.label}>Button Link</label>
              <input className={styles.input} value={form.cta_url} onChange={e=>setForm(f=>({...f,cta_url:e.target.value}))} placeholder="/?cat=E-liquids"/>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label className={styles.label}>Banner Image</label>
              <ImagePicker value={form.image_url} onChange={url=>setForm(f=>({...f,image_url:url}))}/>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label className={styles.label}>Background Colour</label>
              <ColorPicker value={form.bg_color} onChange={c=>setForm(f=>({...f,bg_color:c}))}/>
            </div>
            <div>
              <label className={styles.label}>Text Colour</label>
              <div style={{display:'flex',gap:'0.5rem',marginTop:4}}>
                {['light','dark'].map(v=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,text_color:v}))}
                    style={{
                      padding:'0.35rem 1rem',borderRadius:6,cursor:'pointer',
                      border:`2px solid ${form.text_color===v?'#0f766e':'#e5e7eb'}`,
                      background:v==='light'?'#0f766e':'#f3f4f6',
                      color:v==='light'?'#fff':'#111',fontWeight:600,fontSize:'0.82rem',
                    }}>{v==='light'?'☀️ White text':'🌑 Dark text'}</button>
                ))}
              </div>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label className={styles.label}>
                Banner Height: <strong>{form.height_px}px</strong>
                <span style={{fontSize:'0.75rem',color:'#9ca3af',marginLeft:'0.5rem',fontWeight:400}}>Drag to adjust (200–600px)</span>
              </label>
              <input
                type="range" min={200} max={600} step={10}
                value={form.height_px}
                onChange={e=>setForm(f=>({...f,height_px:parseInt(e.target.value)}))}
                style={{width:'100%',accentColor:'#0f766e',marginTop:6}}
              />
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',color:'#9ca3af'}}>
                <span>200px (compact)</span><span>380px (default)</span><span>600px (tall)</span>
              </div>
            </div>
            <div>
              <label className={styles.label}>Display Order</label>
              <input type="number" className={styles.input} value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:parseInt(e.target.value)||0}))}/>
            </div>
          </div>

          <div style={{display:'flex',gap:'0.75rem',marginTop:'1.25rem'}}>
            <button style={{...actionBtnStyle, opacity: saving ? 0.6 : 1}} onClick={save} disabled={saving}>
              {saving?'Saving…':editing.id===-1?'✚ Create Banner':'💾 Save Changes'}
            </button>
            <button style={cancelBtnStyle} onClick={()=>setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {loading ? <p style={{color:'#6b7280'}}>Loading…</p>
        : banners.length===0
          ? <div style={{textAlign:'center',padding:'3rem',color:'#9ca3af'}}>No banners yet. Click <strong>＋ New Banner</strong> to start.</div>
          : (
            <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
              {[...banners].sort((a,b)=>a.sort_order-b.sort_order).map(b=>(
                <div key={b.id} style={{
                  background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,
                  padding:'0.75rem 0.85rem',opacity:b.active?1:0.55,
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.85rem'}}>
                    <div style={{width:42,height:42,borderRadius:8,background:b.bg_color,flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:'#fff',fontSize:'0.65rem',fontWeight:700}}>{b.active?'●':'○'}</div>
                    {b.image_url&&(
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.image_url} alt="" style={{width:52,height:42,objectFit:'cover',borderRadius:6,flexShrink:0}}/>
                    )}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,color:'#111',fontSize:'0.9rem'}}>
                        {b.badge_text&&<span style={{fontSize:'0.65rem',fontWeight:800,color:'#0f766e',marginRight:5,textTransform:'uppercase'}}>{b.badge_text}</span>}
                        {b.title}
                      </div>
                      {b.subtitle&&<div style={{fontSize:'0.78rem',color:'#6b7280',marginTop:1}}>{b.subtitle}</div>}
                      <div style={{fontSize:'0.72rem',color:'#9ca3af',marginTop:1}}>Order:{b.sort_order} · Height:{b.height_px||380}px · {b.cta_text}→{b.cta_url}</div>
                    </div>
                  </div>
                  {/* Action buttons — full row below content */}
                  <div style={{display:'flex',gap:'0.5rem',marginTop:'0.65rem',paddingTop:'0.55rem',borderTop:'1px solid #f3f4f6',alignItems:'center'}}>
                    <button onClick={()=>moveOrder(b,-1)} title="Move left" style={iconBtn}>←</button>
                    <button onClick={()=>moveOrder(b,1)} title="Move right" style={iconBtn}>→</button>
                    <button onClick={()=>toggleActive(b)} style={{...iconBtn,color:b.active?'#0f766e':'#9ca3af',fontWeight:700,fontSize:'0.72rem',minWidth:50}}>{b.active?'Live ✓':'Off'}</button>
                    <div style={{flex:1}}/>
                    <button onClick={()=>startEdit(b)} style={editBtnStyle}>✏️ Edit</button>
                    <button onClick={()=>del(b)} style={deleteBtnStyle}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

/* ═══ PROMO TILES SECTION ═══════════════ */
function PromoTilesSection() {
  const [tiles, setTiles] = useState<PromoTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromoTile|null>(null);
  const [form, setForm] = useState<Omit<PromoTile,'id'>>(TILE_BLANK);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{text:string;type:'ok'|'err'}|null>(null);
  const supabase = createClient();

  async function load(){
    const {data}=await supabase.from('promo_tiles').select('*').order('sort_order');
    setTiles(data||[]); setLoading(false);
  }
  useEffect(()=>{load();},[]);

  function notify(text:string,type:'ok'|'err'='ok'){setMsg({text,type});setTimeout(()=>setMsg(null),3500);}
  function startEdit(t:PromoTile){setEditing(t);const{id:_,...rest}=t;setForm(rest);setTimeout(()=>document.getElementById('tile-editor')?.scrollIntoView({behavior:'smooth'}),50);}
  function startNew(){setEditing({id:-1,...TILE_BLANK});setForm({...TILE_BLANK});setTimeout(()=>document.getElementById('tile-editor')?.scrollIntoView({behavior:'smooth'}),50);}
  async function save(){
    if(!form.title.trim()){notify('Title is required','err');return;}
    setSaving(true);
    const{error}=editing!.id===-1
      ?await supabase.from('promo_tiles').insert([form])
      :await supabase.from('promo_tiles').update(form).eq('id',editing!.id);
    if(error)notify(error.message,'err');else{notify(editing!.id===-1?'Tile created ✓':'Saved ✓');setEditing(null);load();}
    setSaving(false);
  }
  async function toggleActive(t:PromoTile){await supabase.from('promo_tiles').update({active:!t.active}).eq('id',t.id);load();}
  async function del(t:PromoTile){if(!confirm(`Delete "${t.title}"?`))return;await supabase.from('promo_tiles').delete().eq('id',t.id);notify('Deleted');load();}
  async function moveOrder(t:PromoTile,dir:-1|1){
    const sorted=[...tiles].sort((a,c)=>a.sort_order-c.sort_order);
    const idx=sorted.findIndex(x=>x.id===t.id);
    const si=idx+dir;if(si<0||si>=sorted.length)return;
    const sw=sorted[si];
    await supabase.from('promo_tiles').update({sort_order:sw.sort_order}).eq('id',t.id);
    await supabase.from('promo_tiles').update({sort_order:t.sort_order}).eq('id',sw.id);
    load();
  }

  // ─── Drag-and-drop state ───
  const [dragId, setDragId] = useState<number|null>(null);
  async function handleDrop(targetId: number) {
    if (dragId === null || dragId === targetId) return;
    const sorted = [...tiles].sort((a,c)=>a.sort_order-c.sort_order);
    const dragItem = sorted.find(t=>t.id===dragId);
    const dropItem = sorted.find(t=>t.id===targetId);
    if (!dragItem || !dropItem) return;
    // Swap sort_order
    await supabase.from('promo_tiles').update({sort_order:dropItem.sort_order}).eq('id',dragItem.id);
    await supabase.from('promo_tiles').update({sort_order:dragItem.sort_order}).eq('id',dropItem.id);
    setDragId(null);
    load();
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
        <div>
          <div style={{fontWeight:700,color:'#111',fontSize:'1rem'}}>Promo Tiles</div>
          <div style={{fontSize:'0.82rem',color:'#6b7280'}}>Unlimited tiles — 5 per row on desktop, 2 on mobile. Assign each tile to Top or Bottom strip. Choose rectangle or circle shape.</div>
          <div style={{ marginTop:6, display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
            <span style={{ padding:'0.35rem 0.65rem', background:'#eff6ff', borderRadius:6, border:'1px solid #dbeafe', fontSize:'0.73rem', color:'#1e40af', fontWeight:600 }}>
              📐 Rectangle: <strong>400 × 200px</strong>
            </span>
            <span style={{ padding:'0.35rem 0.65rem', background:'#faf5ff', borderRadius:6, border:'1px solid #e9d5ff', fontSize:'0.73rem', color:'#6b21a8', fontWeight:600 }}>
              ⭕ Circle: <strong>400 × 400px</strong>
            </span>
          </div>
        </div>
        <button onClick={startNew} style={{
          background:'linear-gradient(135deg,#0f766e,#0d9488)',color:'#fff',
          border:'none',borderRadius:9,padding:'0.6rem 1.4rem',fontWeight:700,
          fontSize:'0.9rem',cursor:'pointer',display:'flex',alignItems:'center',
          gap:'0.4rem',boxShadow:'0 4px 14px rgba(15,118,110,0.35)',
        }}>＋ New Tile</button>
      </div>

      {msg&&<div style={{padding:'0.7rem 1rem',borderRadius:8,marginBottom:'1rem',background:msg.type==='ok'?'#d1fae5':'#fee2e2',color:msg.type==='ok'?'#065f46':'#991b1b',fontWeight:600,fontSize:'0.88rem'}}>{msg.text}</div>}

      {/* Editor */}
      {editing&&(
        <div id="tile-editor" style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:'1.5rem',marginBottom:'2rem',boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          <h3 style={{fontSize:'0.95rem',fontWeight:700,marginBottom:'1.25rem',color:'#111'}}>
            {editing.id===-1?'New Promo Tile':'Edit Tile'}
          </h3>
          {/* Mini preview */}
          <div style={{
            background:form.bg_color,borderRadius:10,padding:'1rem',
            minHeight:80,marginBottom:'1.25rem',display:'flex',
            alignItems:'center',gap:'0.75rem',position:'relative',overflow:'hidden',
          }}>
            {form.image_url&&(
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.35}}/>
            )}
            <div style={{zIndex:1}}>
              {form.badge_text&&<span style={{fontSize:'0.65rem',fontWeight:800,color:'#0f766e',textTransform:'uppercase',display:'block',marginBottom:2}}>{form.badge_text}</span>}
              <div style={{fontWeight:700,color:form.text_color==='dark'?'#111':'#fff'}}>{form.title||'Tile Title'}</div>
              {form.subtitle&&<div style={{fontSize:'0.78rem',color:form.text_color==='dark'?'#555':'rgba(255,255,255,0.8)'}}>{form.subtitle}</div>}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <div><label className={styles.label}>Title *</label><input className={styles.input} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="E-Liquids"/></div>
            <div><label className={styles.label}>Badge</label><input className={styles.input} value={form.badge_text} onChange={e=>setForm(f=>({...f,badge_text:e.target.value}))} placeholder="NEW, SALE…"/></div>
            <div><label className={styles.label}>Subtitle</label><input className={styles.input} value={form.subtitle} onChange={e=>setForm(f=>({...f,subtitle:e.target.value}))} placeholder="Hundreds of flavours"/></div>
            <div><label className={styles.label}>Link URL</label><input className={styles.input} value={form.link_url} onChange={e=>setForm(f=>({...f,link_url:e.target.value}))} placeholder="/?cat=E-liquids"/></div>
            <div style={{gridColumn:'1/-1'}}>
              <label className={styles.label}>Tile Image</label>
              <ImagePicker value={form.image_url} onChange={url=>setForm(f=>({...f,image_url:url}))}/>
            </div>
            <div style={{gridColumn:'1/-1'}}><label className={styles.label}>Background Colour</label><ColorPicker value={form.bg_color} onChange={c=>setForm(f=>({...f,bg_color:c}))}/></div>
            <div>
              <label className={styles.label}>Text Colour</label>
              <div style={{display:'flex',gap:'0.5rem',marginTop:4}}>
                {['dark','light'].map(v=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,text_color:v}))} style={{
                    padding:'0.35rem 0.85rem',borderRadius:6,cursor:'pointer',
                    border:`2px solid ${form.text_color===v?'#0f766e':'#e5e7eb'}`,
                    background:v==='light'?'#0f766e':'#f3f4f6',
                    color:v==='light'?'#fff':'#111',fontWeight:600,fontSize:'0.78rem',
                  }}>{v==='light'?'☀️ White':'🌑 Dark'}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={styles.label}>Position</label>
              <div style={{display:'flex',gap:'0.5rem',marginTop:4}}>
                {['top','bottom'].map(v=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,position:v}))} style={{
                    padding:'0.35rem 0.85rem',borderRadius:6,cursor:'pointer',
                    border:`2px solid ${form.position===v?'#0f766e':'#e5e7eb'}`,
                    background:form.position===v?'#e0f2fe':'#f3f4f6',
                    color:'#111',fontWeight:600,fontSize:'0.78rem',
                  }}>{v==='top'?'⬆️ Top Strip':'⬇️ Bottom Strip'}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={styles.label}>Shape</label>
              <div style={{display:'flex',gap:'0.5rem',marginTop:4}}>
                {['rectangle','circle'].map(v=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,shape:v}))} style={{
                    padding:'0.35rem 0.85rem',borderRadius:6,cursor:'pointer',
                    border:`2px solid ${form.shape===v?'#0f766e':'#e5e7eb'}`,
                    background:form.shape===v?'#e0f2fe':'#f3f4f6',
                    color:'#111',fontWeight:600,fontSize:'0.78rem',
                  }}>{v==='rectangle'?'📐 Rectangle':'⭕ Circle'}</button>
                ))}
              </div>
            </div>
            <div><label className={styles.label}>Order</label><input type="number" className={styles.input} value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:parseInt(e.target.value)||0}))}/></div>
          </div>
          <div style={{display:'flex',gap:'0.75rem',marginTop:'1.25rem'}}>
            <button style={{...actionBtnStyle, opacity: saving ? 0.6 : 1}} onClick={save} disabled={saving}>{saving?'Saving…':editing.id===-1?'✚ Create Tile':'💾 Save Changes'}</button>
            <button style={cancelBtnStyle} onClick={()=>setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* List — grouped by position */}
      {loading?<p style={{color:'#6b7280'}}>Loading…</p>
        :tiles.length===0
          ?<div style={{textAlign:'center',padding:'3rem',color:'#9ca3af'}}>No tiles yet. Click <strong>＋ New Tile</strong> to create one.</div>
          :(
            <>
              {['top','bottom'].map(pos => {
                const positionTiles = [...tiles].filter(t => (t.position || 'top') === pos).sort((a,b) => a.sort_order - b.sort_order);
                if (positionTiles.length === 0 && pos === 'bottom') return null;
                return (
                  <div key={pos} style={{marginBottom:'1.5rem'}}>
                    <h3 style={{
                      fontSize:'0.88rem',fontWeight:700,color:'#374151',
                      marginBottom:'0.65rem',paddingBottom:'0.35rem',
                      borderBottom:'2px solid #e5e7eb',
                      display:'flex',alignItems:'center',gap:'0.4rem',
                    }}>
                      {pos==='top'?'⬆️ Top Strip':'⬇️ Bottom Strip'}
                      <span style={{fontSize:'0.72rem',fontWeight:500,color:'#9ca3af'}}>({positionTiles.length} tile{positionTiles.length!==1?'s':''})</span>
                    </h3>
                    {positionTiles.length === 0 ? (
                      <div style={{textAlign:'center',padding:'1.5rem',color:'#9ca3af',fontSize:'0.85rem',background:'#f9fafb',borderRadius:8}}>No tiles in this strip yet.</div>
                    ) : (
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.75rem'}}>
                        {positionTiles.map(t=>(
                          <div key={t.id}
                            draggable
                            onDragStart={()=>setDragId(t.id)}
                            onDragOver={e=>e.preventDefault()}
                            onDrop={()=>handleDrop(t.id)}
                            style={{
                              background: dragId === t.id ? '#f0fdfa' : '#fff',
                              border: dragId === t.id ? '2px dashed #0f766e' : '1px solid #e5e7eb',
                              borderRadius:10, overflow:'hidden', opacity:t.active?1:0.55,
                              cursor:'grab', transition:'border 0.15s, background 0.15s',
                            }}
                          >
                            <div style={{height:70,background:t.bg_color,position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              {t.image_url&&(
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={t.image_url} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
                              )}
                              <span style={{position:'relative',fontWeight:700,color:t.text_color==='dark'?'#111':'#fff',fontSize:'0.85rem',zIndex:1,padding:'0 0.5rem',textAlign:'center'}}>{t.title}</span>
                              {t.shape==='circle'&&<span style={{position:'absolute',top:4,right:6,fontSize:'0.6rem',background:'rgba(0,0,0,0.5)',color:'#fff',padding:'1px 5px',borderRadius:4}}>⭕</span>}
                            </div>
                            <div style={{padding:'0.5rem 0.65rem',display:'flex',gap:'0.35rem',flexWrap:'wrap',alignItems:'center'}}>
                              <span title="Drag to reorder" style={{fontSize:'0.85rem',cursor:'grab',opacity:0.4,userSelect:'none'}}>⠿</span>
                              <button onClick={()=>toggleActive(t)} style={{...iconBtn,color:t.active?'#0f766e':'#9ca3af',fontWeight:700,fontSize:'0.68rem',width:'auto',padding:'0 8px'}}>{t.active?'Live':'Off'}</button>
                              <div style={{flex:1}}/>
                              <button onClick={()=>startEdit(t)} style={{...editBtnStyle,padding:'3px 10px',fontSize:'0.78rem'}}>Edit</button>
                              <button onClick={()=>del(t)} style={{...deleteBtnStyle,padding:'3px 8px',fontSize:'0.78rem'}}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
    </div>
  );
}

/* ═══ SHOWCASES SECTION ═════════════════ */
interface Showcase {
  id: number;
  title: string;
  product_ids: string[];
  sort_order: number;
  active: boolean;
  link_text: string;
  link_category: string;
}

interface SimpleProduct {
  id: string;
  name: string;
  image?: string;
}

function ShowcasesSection() {
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [allProducts, setAllProducts] = useState<SimpleProduct[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Showcase|null>(null);
  const [form, setForm] = useState<{title:string;product_ids:string[];sort_order:number;active:boolean;link_text:string;link_category:string}>({
    title:'', product_ids:[], sort_order:0, active:true, link_text:'', link_category:'',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{text:string;type:'ok'|'err'}|null>(null);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  async function load() {
    const [{ data: sc }, { data: prods }] = await Promise.all([
      supabase.from('homepage_showcases').select('*').order('sort_order'),
      supabase.from('products').select('id, name, image, category').eq('status', 'published').order('name'),
    ]);
    setShowcases(sc || []);
    setAllProducts((prods || []).map((p: any) => ({ id: p.id, name: p.name, image: p.image })));
    // Extract unique categories
    const cats = [...new Set((prods || []).map((p: any) => p.category).filter(Boolean))].sort() as string[];
    setAllCategories(cats);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function notify(text:string, type:'ok'|'err'='ok') { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); }

  function startEdit(sc: Showcase) {
    setEditing(sc);
    setForm({ title:sc.title, product_ids:sc.product_ids||[], sort_order:sc.sort_order, active:sc.active, link_text:sc.link_text||'', link_category:sc.link_category||'' });
    setSearch('');
    setTimeout(()=>document.getElementById('showcase-editor')?.scrollIntoView({behavior:'smooth'}),50);
  }

  async function save() {
    if (!form.title.trim()) { notify('Title is required','err'); return; }
    setSaving(true);
    const payload = { title:form.title, product_ids:form.product_ids, sort_order:form.sort_order, active:form.active, link_text:form.link_text, link_category:form.link_category };
    const { error } = await supabase.from('homepage_showcases').update(payload).eq('id', editing!.id);
    if (error) notify(error.message,'err'); else { notify('Saved ✓'); setEditing(null); load(); }
    setSaving(false);
  }

  function addProduct(id: string) {
    if (form.product_ids.length >= 5) { notify('Max 5 products per row','err'); return; }
    if (form.product_ids.includes(id)) return;
    setForm(f => ({ ...f, product_ids: [...f.product_ids, id] }));
  }

  function removeProduct(id: string) {
    setForm(f => ({ ...f, product_ids: f.product_ids.filter(pid => pid !== id) }));
  }

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const low = search.toLowerCase();
    return allProducts
      .filter(p => p.name.toLowerCase().includes(low) && !form.product_ids.includes(p.id))
      .slice(0, 8);
  }, [search, allProducts, form.product_ids]);

  const selectedProducts = form.product_ids
    .map(id => allProducts.find(p => p.id === id))
    .filter(Boolean) as SimpleProduct[];

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
        <div>
          <div style={{fontWeight:700,color:'#111',fontSize:'1rem'}}>Product Showcases</div>
          <div style={{fontSize:'0.82rem',color:'#6b7280'}}>Curated product rows on the homepage. Pick up to 5 products per row.</div>
        </div>
      </div>

      {msg&&<div style={{padding:'0.7rem 1rem',borderRadius:8,marginBottom:'1rem',background:msg.type==='ok'?'#d1fae5':'#fee2e2',color:msg.type==='ok'?'#065f46':'#991b1b',fontWeight:600,fontSize:'0.88rem'}}>{msg.text}</div>}

      {/* Editor */}
      {editing && (
        <div id="showcase-editor" style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:'1.5rem',marginBottom:'2rem',boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          <h3 style={{fontSize:'0.95rem',fontWeight:700,marginBottom:'1.25rem',color:'#111'}}>Edit: {editing.title}</h3>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
            <div>
              <label className={styles.label}>Section Title</label>
              <input className={styles.input} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
            </div>
            <div>
              <label className={styles.label}>Display Order</label>
              <input type="number" className={styles.input} value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:parseInt(e.target.value)||0}))} />
            </div>
          </div>

          {/* Category link row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
            <div>
              <label className={styles.label}>Link Text <span style={{fontSize:'0.72rem',color:'#9ca3af',fontWeight:400}}>(shows after title, e.g. &quot;Check Out All Our E-Liquids&quot;)</span></label>
              <input className={styles.input} value={form.link_text} onChange={e=>setForm(f=>({...f,link_text:e.target.value}))} placeholder="Check Out All Our E-Liquids" />
            </div>
            <div>
              <label className={styles.label}>Link Category <span style={{fontSize:'0.72rem',color:'#9ca3af',fontWeight:400}}>(where the link goes)</span></label>
              <select className={styles.input} value={form.link_category} onChange={e=>setForm(f=>({...f,link_category:e.target.value}))} style={{padding:'0.5rem 0.65rem'}}>
                <option value="">— No link —</option>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {form.link_text && form.link_category && (
            <div style={{fontSize:'0.82rem',color:'#6b7280',marginBottom:'0.75rem',padding:'0.5rem 0.75rem',background:'#f0fdfa',borderRadius:8,border:'1px solid #ccfbf1'}}>
              <strong>Preview:</strong> {form.title} <span style={{color:'#9ca3af'}}>…</span> <span style={{color:'#0f766e',fontWeight:600}}>{form.link_text} →</span>
              <br/><span style={{fontSize:'0.72rem',color:'#9ca3af'}}>Logged-in users will see: &quot;Nick, {form.link_text} →&quot;</span>
            </div>
          )}

          {/* Selected products */}
          <label className={styles.label}>Selected Products ({form.product_ids.length}/5)</label>
          <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',marginBottom:'0.75rem',minHeight:40}}>
            {selectedProducts.length === 0 && (
              <span style={{fontSize:'0.82rem',color:'#9ca3af',padding:'0.5rem 0'}}>No products selected — use the search below to add up to 5.</span>
            )}
            {selectedProducts.map((p, i) => (
              <div key={p.id} style={{
                display:'flex',alignItems:'center',gap:'0.4rem',
                background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:8,
                padding:'0.35rem 0.65rem',fontSize:'0.82rem',fontWeight:600,color:'#0f766e',
              }}>
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" style={{width:24,height:24,borderRadius:4,objectFit:'cover'}} />
                )}
                <span style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {i+1}. {p.name}
                </span>
                <button onClick={()=>removeProduct(p.id)} style={{
                  background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'0.9rem',padding:'0 2px',
                }}>✕</button>
              </div>
            ))}
          </div>

          {/* Product search */}
          {form.product_ids.length < 5 && (
            <div style={{position:'relative',marginBottom:'1rem'}}>
              <input
                className={styles.input}
                value={search}
                onChange={e=>setSearch(e.target.value)}
                placeholder="🔍 Search products to add..."
                style={{margin:0}}
              />
              {searchResults.length > 0 && (
                <div style={{
                  position:'absolute',top:'100%',left:0,right:0,zIndex:50,
                  background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,
                  boxShadow:'0 8px 24px rgba(0,0,0,0.12)',maxHeight:280,overflowY:'auto',
                }}>
                  {searchResults.map(p => (
                    <button key={p.id} onClick={()=>{addProduct(p.id);setSearch('')}} style={{
                      display:'flex',alignItems:'center',gap:'0.6rem',width:'100%',
                      padding:'0.6rem 0.85rem',border:'none',background:'none',
                      cursor:'pointer',textAlign:'left',fontSize:'0.85rem',
                      borderBottom:'1px solid #f3f4f6',
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#f0fdfa')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                    >
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" style={{width:32,height:32,borderRadius:6,objectFit:'cover',flexShrink:0}} />
                      )}
                      <span style={{fontWeight:600,color:'#111'}}>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{display:'flex',gap:'0.75rem',marginTop:'0.5rem'}}>
            <button style={{...actionBtnStyle, opacity: saving ? 0.6 : 1}} onClick={save} disabled={saving}>{saving?'Saving…':'💾 Save Changes'}</button>
            <button style={cancelBtnStyle} onClick={()=>setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? <p style={{color:'#6b7280'}}>Loading…</p>
        : showcases.length === 0
          ? <div style={{textAlign:'center',padding:'3rem',color:'#9ca3af'}}>No showcase rows configured.</div>
          : (
            <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
              {[...showcases].sort((a,b)=>a.sort_order-b.sort_order).map(sc => {
                const prods = (sc.product_ids||[]).map(id => allProducts.find(p=>p.id===id)).filter(Boolean) as SimpleProduct[];
                return (
                  <div key={sc.id} style={{
                    display:'flex',alignItems:'center',gap:'0.85rem',
                    background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,
                    padding:'0.75rem 0.85rem',opacity:sc.active?1:0.55,
                  }}>
                    <div style={{width:42,height:42,borderRadius:8,background:'linear-gradient(135deg,#0f766e,#0d9488)',flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:'#fff',fontSize:'1rem',fontWeight:700}}>{sc.sort_order}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,color:'#111',fontSize:'0.9rem'}}>{sc.title}</div>
                      <div style={{fontSize:'0.78rem',color:'#6b7280',marginTop:1}}>
                        {prods.length === 0 ? 'No products selected' : prods.map(p => p.name).join(' • ')}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'0.35rem',flexShrink:0}}>
                      <button onClick={()=>startEdit(sc)} style={editBtnStyle}>✏️ Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}

/* ═══ MAIN PAGE ═════════════════════════ */
export default function BannersAdminPage() {
  const [tab, setTab] = useState<'banners'|'tiles'|'showcases'>('banners');

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>🖼️ Homepage Promotions</h1>
      </div>

      {/* Tab strip */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid #e5e7eb',marginBottom:'1.5rem'}}>
        {([['banners','Hero Banners'],['tiles','Promo Tiles'],['showcases','Showcases']] as const).map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:'0.65rem 1.25rem',fontWeight:700,fontSize:'0.88rem',
            border:'none',background:'none',cursor:'pointer',
            borderBottom:`3px solid ${tab===id?'#0f766e':'transparent'}`,
            color:tab===id?'#0f766e':'#6b7280',
            marginBottom:'-2px',transition:'color 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {tab==='banners' ? <BannerSection/> : tab==='tiles' ? <PromoTilesSection/> : <ShowcasesSection/>}
    </div>
  );
}
