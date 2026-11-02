import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plane, MapPin, CalendarDays, Wallet, Sparkles, Bookmark, Compass, Clock3, Users, RefreshCw, CheckCircle2, ArrowRight, Heart, Utensils, Bus, Hotel, Sun, Menu } from 'lucide-react';
import './style.css';

const API = 'http://127.0.0.1:8000';
const interestOptions = ['Sightseeing', 'Food', 'Nature', 'Culture', 'Adventure', 'Shopping', 'Relaxation'];
const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));

function App() {
  const [form, setForm] = useState({ destination: 'Jaipur, India', start_date: '', days: 3, budget: 10000, currency: 'INR', interests: ['Sightseeing', 'Food', 'Culture'], travel_style: 'balanced', group_size: 1 });
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [savedTrips, setSavedTrips] = useState([]);
  const [health, setHealth] = useState({ ai_configured: false, supabase_configured: false });
  const [activeTab, setActiveTab] = useState('planner');

  useEffect(() => {
    fetch(`${API}/api/health`).then(r => r.json()).then(setHealth).catch(() => setMessage('Start the FastAPI backend to connect this app.'));
    loadTrips();
  }, []);

  async function loadTrips() {
    try { const r = await fetch(`${API}/api/trips`); const data = await r.json(); if (r.ok) setSavedTrips(data.trips || []); } catch { /* backend may not be started yet */ }
  }
  function update(key, value) { setForm(prev => ({ ...prev, [key]: value })); }
  function toggleInterest(name) { update('interests', form.interests.includes(name) ? form.interests.filter(x => x !== name) : [...form.interests, name]); }

  async function generate(e) {
    e?.preventDefault();
    if (!form.destination.trim()) { setMessage('Please enter a destination.'); return; }
    setLoading(true); setMessage(''); setTrip(null);
    try {
      const payload = { ...form, days: Number(form.days), budget: Number(form.budget), group_size: Number(form.group_size), interests: form.interests.map(x => x.toLowerCase()) };
      const response = await fetch(`${API}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to generate itinerary');
      setTrip(data); setActiveTab('planner'); setMessage(data.warning || (data.mode === 'gemini' ? 'Your AI itinerary is ready.' : 'Demo itinerary ready. Add a Gemini API key to enable AI-generated plans.'));
    } catch (err) { setMessage(`Could not connect to the backend. Make sure FastAPI is running. (${err.message})`); }
    finally { setLoading(false); }
  }

  async function saveTrip() {
    if (!trip) return;
    try {
      const r = await fetch(`${API}/api/trips`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trip }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Save failed');
      setMessage(data.storage === 'supabase' ? 'Trip saved to Supabase successfully.' : 'Trip saved in demo memory. Configure Supabase for persistent storage.');
      await loadTrips();
    } catch (err) { setMessage(`Could not save trip: ${err.message}`); }
  }

  async function openSaved(item) {
    const data = item.trip_data || item;
    setTrip(data); setActiveTab('planner'); setMessage(`Opened saved trip to ${data.destination || item.destination}.`);
  }

  function editActivity(dayIndex, activityIndex, name) {
    setTrip(prev => ({ ...prev, days: prev.days.map((day, di) => di !== dayIndex ? day : ({ ...day, activities: day.activities.map((a, ai) => ai !== activityIndex ? a : ({ ...a, name })) })) }));
  }

  const total = trip?.budget_breakdown?.total_estimate ?? form.budget;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Plane size={21}/></div><div><strong>Travel Itinerary Planner</strong><small>AI TRAVEL STUDIO</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className={`nav-item ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}><Compass size={18}/> Trip planner</button>
      <button className={`nav-item ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => { setActiveTab('saved'); loadTrips(); }}><Bookmark size={18}/> Saved trips <span className="nav-count">{savedTrips.length}</span></button>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={18}/></div><strong>Your next adventure</strong><p>Thoughtful plans, made just for you.</p><button onClick={() => { setActiveTab('planner'); setTrip(null); }}>Plan a trip <ArrowRight size={14}/></button></div><div className="profile"><div className="avatar">AS</div><div><strong>Traveler</strong><small>Personal workspace</small></div><Menu size={17} className="muted"/></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{activeTab === 'planner' ? 'Trip planner' : 'Saved trips'}</b></div><div className="top-right"><span className={`status-dot ${health.ai_configured ? 'online' : ''}`}></span><span>{health.ai_configured ? 'AI connected' : 'Demo mode'}</span><div className="top-avatar">AS</div></div></header>
      {activeTab === 'planner' ? <>
        <section className="welcome"><div><div className="eyebrow"><Sparkles size={14}/> YOUR PERSONAL AI TRAVEL PLANNER</div><h1>Where will you <span>go next?</span></h1><p>Dream it. Plan it. Go live it. Build a trip that feels like you.</p></div><div className="welcome-art"><div className="sun-disc"></div><div className="mountain mountain-back"></div><div className="mountain mountain-front"></div><div className="art-pin"><MapPin size={17}/></div></div></section>
        <div className="content-grid">
          <section className="panel form-panel"><div className="panel-heading"><div><div className="step-label">STEP 01</div><h2>Design your trip</h2><p>Tell us what your perfect getaway looks like.</p></div><div className="heading-icon"><Compass size={20}/></div></div>
            <form onSubmit={generate} className="trip-form">
              <label className="field-label">Where to? <span>*</span></label><div className="input-wrap"><MapPin size={17}/><input value={form.destination} onChange={e => update('destination', e.target.value)} placeholder="e.g. Jaipur, India" required/></div>
              <div className="two-col"><div><label className="field-label">Departure date</label><div className="input-wrap"><CalendarDays size={17}/><input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)}/></div></div><div><label className="field-label">Duration</label><div className="input-wrap"><Clock3 size={17}/><select value={form.days} onChange={e => update('days', e.target.value)}>{Array.from({length:14}, (_,i) => <option key={i} value={i+1}>{i+1} {i===0?'day':'days'}</option>)}</select></div></div></div>
              <div className="two-col"><div><label className="field-label">Total budget (₹)</label><div className="input-wrap"><Wallet size={17}/><input type="number" min="500" step="500" value={form.budget} onChange={e => update('budget', e.target.value)} required/></div></div><div><label className="field-label">Travelers</label><div className="input-wrap"><Users size={17}/><select value={form.group_size} onChange={e => update('group_size', e.target.value)}>{Array.from({length:10}, (_,i) => <option key={i} value={i+1}>{i+1} {i===0?'traveler':'travelers'}</option>)}</select></div></div></div>
              <label className="field-label">Your travel vibe</label><div className="style-options">{[['budget','Budget-friendly'],['balanced','Balanced'],['premium','Premium']].map(([v,l]) => <button type="button" key={v} className={`style-option ${form.travel_style===v?'selected':''}`} onClick={() => update('travel_style',v)}>{l}</button>)}</div>
              <label className="field-label">What are you into?</label><div className="interest-list">{interestOptions.map((name,i) => <button type="button" key={name} onClick={() => toggleInterest(name)} className={`interest-chip ${form.interests.includes(name)?'chosen':''}`}>{name === 'Food' ? <Utensils size={14}/> : name === 'Nature' ? <Sun size={14}/> : name === 'Relaxation' ? <Heart size={14}/> : <Sparkles size={14}/>} {name}</button>)}</div>
              <button className="generate-button" type="submit" disabled={loading}>{loading ? <><span className="spinner"></span> Creating your trip...</> : <><Sparkles size={17}/> Generate my itinerary <ArrowRight size={17}/></>}</button>
              <div className="secure-note"><CheckCircle2 size={14}/> Personalized to your budget and interests</div>
            </form>
          </section>
          <section className="results-column">
            {!trip ? <div className="empty-panel"><div className="empty-illustration"><div className="empty-sun"></div><div className="empty-hill one"></div><div className="empty-hill two"></div><Plane size={27} className="empty-plane"/></div><div className="empty-copy"><div className="step-label">STEP 02</div><h2>Your next story starts here</h2><p>Fill in your trip details and let Travel Itinerary Planner turn your ideas into a day-by-day plan.</p><div className="feature-pills"><span><Sparkles size={14}/> AI-powered</span><span><Wallet size={14}/> Budget-aware</span><span><MapPin size={14}/> Personalized</span></div></div><div className="empty-footer"><span>✦</span> Every great journey begins with a plan.</div></div> : <div className="itinerary-panel"><div className="itinerary-head"><div><div className="step-label">YOUR PERSONALIZED PLAN</div><h2>{trip.destination || form.destination}</h2><p>{trip.days?.length || form.days} days <span>·</span> {form.group_size} {Number(form.group_size)===1?'traveler':'travelers'} <span>·</span> {form.travel_style} pace</p></div><div className="trip-badge"><CheckCircle2 size={15}/> {trip.mode === 'gemini' ? 'AI generated' : 'Demo plan'}</div></div>
              {trip.warning && <div className="notice">{trip.warning}</div>}
              <div className="budget-card"><div><span>ESTIMATED TRIP BUDGET</span><strong>{money(trip.budget_breakdown?.total_estimate ?? form.budget)}</strong><small>Planned budget: {money(form.budget)}</small></div><div className="budget-icon"><Wallet size={22}/></div></div>
              <div className="budget-breakdown">{[['Stay',trip.budget_breakdown?.accommodation,'#8a7ce8'],['Food',trip.budget_breakdown?.food,'#ed9a61'],['Activities',trip.budget_breakdown?.activities,'#59b6a5'],['Transport',trip.budget_breakdown?.transport,'#729de5']].map(([label,value,color]) => <div key={label} className="budget-row"><div><span className="legend-dot" style={{background:color}}></span>{label}</div><strong>{money(value || 0)}</strong></div>)}</div>
              <div className="days-heading"><div><div className="step-label">THE JOURNEY</div><h3>Your day-by-day itinerary</h3></div><button className="icon-button" title="Regenerate itinerary" onClick={() => generate()}><RefreshCw size={16}/></button></div>
              {trip.days?.map((day,di) => <article className="day-card" key={day.day || di}><div className="day-marker"><span>DAY</span><strong>{day.day || di+1}</strong></div><div className="day-content"><h4>{day.title || `Day ${di+1}`}</h4><div className="activities">{day.activities?.map((activity,ai) => <div className="activity" key={ai}><div className="activity-time">{activity.time || 'Flexible'}</div><div className="activity-dot"></div><div className="activity-details"><input aria-label="Edit activity" value={activity.name || ''} onChange={e => editActivity(di,ai,e.target.value)}/><small>{activity.type || 'Activity'}</small></div><strong>{money(activity.estimated_cost || 0)}</strong></div>)}</div>{day.transport_tip && <div className="transport-tip"><Bus size={15}/><span>{day.transport_tip}</span></div>}</div></article>)}
              {trip.travel_tips?.length > 0 && <div className="tips-box"><h4><Sparkles size={16}/> Smart travel notes</h4><ul>{trip.travel_tips.map((tip,i)=><li key={i}>{tip}</li>)}</ul></div>}
              <button className="save-button" onClick={saveTrip}><Bookmark size={16}/> Save this trip</button>
            </div>}
            {message && <div className="message" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}
          </section>
        </div>
      </> : <section className="saved-view"><div className="eyebrow"><Bookmark size={14}/> YOUR COLLECTION</div><h1>Saved <span>trips</span></h1><p className="saved-intro">Your travel ideas, all in one place.</p>{savedTrips.length ? <div className="saved-grid">{savedTrips.map((item,i) => <button className="saved-card" key={item.id || i} onClick={() => openSaved(item)}><div className="saved-card-art"><MapPin size={23}/><span>Travel Itinerary Planner</span></div><div className="saved-card-body"><h3>{item.destination || item.trip_data?.destination || 'Untitled trip'}</h3><p>Saved itinerary · Click to view</p><span className="open-trip">Open trip <ArrowRight size={14}/></span></div></button>)}</div> : <div className="empty-saved"><Bookmark size={28}/><h2>No saved trips yet</h2><p>Generate an itinerary and save it to see it here.</p><button className="generate-button small" onClick={() => setActiveTab('planner')}>Plan your first trip <ArrowRight size={15}/></button></div>}</section>}
      <footer className="app-footer"><span>✦ Travel Itinerary Planner</span><span>Plan thoughtfully. Travel freely.</span><span>Built for your next adventure</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
