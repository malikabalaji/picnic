/* Picnic client. Talks to Supabase (auth, database, storage). Face detection runs on the device;
   matching runs in the database (see supabase/schema.sql). */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_ON = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "1";
const FACEAPI_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js";
const JSZIP_URL = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const THRESH = { strict: 0.42, balanced: 0.48, relaxed: 0.54 };
const LOGO = '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--ink)"/><path d="M22.5 11.2A8 8 0 1 0 24 16" fill="none" stroke="var(--paper)" stroke-width="2.4" stroke-linecap="round"/><path d="M21.1 18.3 24 15.4l2.9 2.9" fill="none" stroke="var(--paper)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="var(--accent)"/></svg>';

/* ---------- icons ---------- */
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="10" r="3.2"/><path d="M6.5 19c1.2-2.6 3.2-4 5.5-4s4.3 1.4 5.5 4"/></svg>',
  events: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4h-1"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  face: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="9.5" cy="10" r=".6" fill="currentColor"/><circle cx="14.5" cy="10" r=".6" fill="currentColor"/><path d="M9.5 15c1.4 1 3.6 1 5 0"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5v14M15 5v14"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H4"/></svg>',
};

/* ---------- utilities ---------- */
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const now = () => Date.now();
const ms = (t) => (t ? Date.parse(t) : 0);
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
const fmtDay = (t) => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const dayMs = (d) => (d ? new Date(d + "T00:00").getTime() : 0);
function ago(t) { const s = (now() - t) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; if (s < 604800) return Math.floor(s / 86400) + "d ago"; return fmtDate(t); }
const plural = (n, w, p) => n + " " + (n === 1 ? w : p || w + "s");
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3400); }
function errMsg(e) { const m = (e && (e.message || e.error_description)) || ""; if (/row-level security|permission denied/i.test(m)) return "You don't have permission to do that."; if (/duplicate key.*hash/i.test(m)) return "You already shared that photo."; if (/Failed to fetch|NetworkError/i.test(m)) return "No connection. Check your internet and try again."; return m || "Something went wrong. Try again."; }
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector('script[src="' + src + '"]')) return res(); const s = document.createElement("script"); s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error("Could not load a required component. Check your connection.")); document.head.appendChild(s); }); }
const fmtToken = (t) => (t ? t.slice(0, 4) + "-" + t.slice(4) : "");
async function sha256(buf) { const h = await crypto.subtle.digest("SHA-256", buf); return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join(""); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.decoding = "async"; i.onload = () => res(i); i.onerror = () => rej(new Error("Image failed to load")); i.src = src; }); }
function canvasFrom(img, max) { const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height; const k = Math.min(1, max / Math.max(w, h)); const c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c; }
const toJpeg = (c, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode photo"))), "image/jpeg", q));
function pick(accept, { multiple = false, capture = null } = {}) { return new Promise((res) => { const i = document.createElement("input"); i.type = "file"; i.accept = accept; i.multiple = multiple; if (capture) i.setAttribute("capture", capture); i.onchange = () => res(Array.from(i.files || [])); i.click(); }); }
function dist(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); }
const slug = (s) => String(s || "photo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "photo";
const BLANK = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3Crect width=%221%22 height=%221%22 fill=%22%23999%22 opacity=%22.3%22/%3E%3C/svg%3E";
function initials(name) { const n = (name || "?").trim(); const p = n.split(/\s+/); const t = ((p[0] || "?")[0] + (p[1] ? p[1][0] : "")).toUpperCase(); return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#E6E9F5"/><text x="20" y="25" font-family="sans-serif" font-size="15" font-weight="600" text-anchor="middle" fill="#2F5BFF">${t.replace(/[<&]/g, "")}</text></svg>`); }

/* ---------- state ---------- */
let sb = null;
const S = {
  session: null, me: null, profile: null, faceCount: 0, loaded: false,
  events: {}, members: [], photos: {}, inbox: [], outbox: [], consents: [], albums: [], people: {},
  ui: { tab: "home", filter: "all", q: "", select: false, sel: new Set(), evSeg: "active", obStep: 0, authMode: "signin" },
  sheet: null, pendingJoin: null,
};
const urlCache = {};

/* ---------- data mapping ---------- */
const mapEvent = (r) => ({ id: r.id, name: r.name, startDate: r.start_date, endDate: r.end_date, location: r.location, organizerId: r.organizer_id, token: r.token, tokenIssuedAt: ms(r.token_issued_at), status: r.status, joinApproval: r.join_approval, photoApproval: r.photo_approval, autoDelivery: r.auto_delivery, createdAt: ms(r.created_at) });
const mapMember = (r) => ({ id: r.event_id + "__" + r.user_id, eventId: r.event_id, userId: r.user_id, status: r.status, receive: r.receive, consent: r.consent, role: r.role, joinedAt: ms(r.joined_at), approvedAt: ms(r.approved_at) });
const mapPhoto = (r) => ({ id: r.id, eventId: r.event_id, uploaderId: r.uploader_id, path: r.path, thumb: r.thumb_path, width: r.width, height: r.height, hash: r.hash, faces: r.faces, takenAt: ms(r.taken_at), createdAt: ms(r.created_at), sharing: r.sharing ? "on" : "off", requireApproval: r.require_approval, excluded: r.excluded || [] });
const mapDelivery = (r) => ({ id: r.id, photoId: r.photo_id, eventId: r.event_id, uploaderId: r.uploader_id, recipientId: r.recipient_id, distance: r.distance, status: r.status, createdAt: ms(r.created_at), updatedAt: ms(r.updated_at) });
const settings = () => { const p = S.profile || {}; return { onboarded: p.onboarded, recognition: p.recognition, reception: p.reception, paused: p.paused, strictness: p.strictness || "balanced", blocked: p.blocked || [], notifSeenAt: ms(p.notif_seen_at) }; };

/* ---------- loading ---------- */
let loading = null;
async function loadAll() {
  if (!S.me) return;
  if (loading) return loading;
  loading = (async () => {
    const q = (p) => p.then((r) => { if (r.error) throw r.error; return r.data; });
    try {
      const [profile, faces, events, members, photos, deliveries, consents, albums, people] = await Promise.all([
        q(sb.from("profiles").select("*").eq("id", S.me.id).single()),
        sb.from("face_samples").select("id", { count: "exact", head: true }).eq("user_id", S.me.id),
        q(sb.from("events").select("*")),
        q(sb.from("event_participants").select("*")),
        q(sb.from("photos").select("*").order("created_at", { ascending: false }).limit(1000)),
        q(sb.from("deliveries").select("*").order("created_at", { ascending: false }).limit(2000)),
        q(sb.from("consent_records").select("*").order("at", { ascending: false }).limit(50)),
        q(sb.from("albums").select("*").order("created_at")),
        q(sb.from("profiles").select("id,name,avatar_url")),
      ]);
      S.profile = profile; S.faceCount = faces.count || 0;
      S.events = Object.fromEntries(events.map((r) => [r.id, mapEvent(r)]));
      S.members = members.map(mapMember);
      S.photos = Object.fromEntries(photos.map((r) => [r.id, mapPhoto(r)]));
      const ds = deliveries.map(mapDelivery);
      S.inbox = ds.filter((d) => d.recipientId === S.me.id);
      S.outbox = ds.filter((d) => d.uploaderId === S.me.id);
      S.consents = consents.map((c) => ({ type: c.type, status: c.status, at: ms(c.at) }));
      S.albums = albums.map((a) => ({ id: a.id, name: a.name, photoIds: a.photo_ids || [] }));
      S.people = Object.fromEntries(people.map((p) => [p.id, p]));
      S.me.name = profile.name || S.me.name;
      S.loaded = true;
      await signVisible();
      render();
    } catch (e) { console.warn(e); if (!S.loaded) renderError(errMsg(e)); else toast(errMsg(e)); }
    finally { loading = null; }
  })();
  return loading;
}
async function signVisible() {
  const paths = [];
  for (const p of Object.values(S.photos)) for (const k of [p.thumb, p.path]) { const c = urlCache[k]; if (!c || c.exp < now() + 300000) paths.push(k); }
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { data } = await sb.storage.from("photos").createSignedUrls(chunk, 3600);
    (data || []).forEach((d) => { if (d.signedUrl) urlCache[d.path] = { url: d.signedUrl, exp: now() + 3600000 }; });
  }
}
const url = (path) => (path && urlCache[path] ? urlCache[path].url : BLANK);
async function refresh() { await loadAll(); }
async function rpc(name, args) { const { data, error } = await sb.rpc(name, args); if (error) throw error; return data; }
async function act(fn, okMsg) { try { const r = await fn(); if (okMsg) toast(okMsg); await refresh(); return r ?? true; } catch (e) { toast(errMsg(e)); return false; } }
async function setSettings(patch) {
  const map = { onboarded: "onboarded", recognition: "recognition", reception: "reception", paused: "paused", strictness: "strictness", blocked: "blocked" };
  const row = {};
  for (const [k, v] of Object.entries(patch)) { if (k === "notifSeenAt") row.notif_seen_at = new Date(v).toISOString(); else if (map[k]) row[map[k]] = v; else row[k] = v; }
  S.profile = { ...S.profile, ...row }; render();
  const { error } = await sb.from("profiles").update(row).eq("id", S.me.id);
  if (error) { toast(errMsg(error)); await refresh(); return false; }
  if (patch.recognition === true || patch.reception === true || patch.paused === false || patch.strictness) { try { await rpc("rematch_me"); } catch {} await refresh(); }
  return true;
}
function logConsent(type, status) { S.consents.unshift({ type, status, at: now() }); return sb.from("consent_records").insert({ type, status }); }

/* ---------- names ---------- */
function nm(id) { if (!id) return "Someone"; if (id === S.me.id) return "You"; return (S.people[id] && S.people[id].name) || "Someone"; }
function av(id) { const p = S.people[id]; if (!p) return BLANK; return p.avatar_url || initials(p.name); }

/* ---------- derived ---------- */
const myMember = (eid) => S.members.find((m) => m.eventId === eid && m.userId === S.me.id);
const isApproved = (eid) => { const m = myMember(eid); return !!m && m.status === "approved"; };
const evAlive = (e) => e && e.status !== "deleted";
function evPhase(e) { if (e.status === "ended") return "past"; const d0 = dayMs(e.startDate), d1 = e.endDate ? new Date(e.endDate + "T23:59").getTime() : 0; if (d1 && d1 < now()) return "past"; if (d0 > now()) return "upcoming"; return "active"; }
function myEvents() { return Object.values(S.events).filter((e) => evAlive(e) && (e.organizerId === S.me.id || (myMember(e.id) && ["approved", "pending"].includes(myMember(e.id).status)))); }
const thr = () => THRESH[settings().strictness] || THRESH.balanced;
function visibleInbox() {
  const seen = new Set(), out = [];
  for (const d of [...S.inbox].sort((a, b) => b.createdAt - a.createdAt)) {
    if (d.status !== "delivered") continue;
    const p = S.photos[d.photoId]; if (!p) continue;
    const e = S.events[p.eventId] || { id: p.eventId, name: "Event" };
    const key = p.hash || p.id; if (seen.has(key)) continue; seen.add(key);
    out.push({ d, p, e });
  }
  return out;
}
const delivered = visibleInbox;
function newCount() { const t = settings().notifSeenAt || 0; return delivered().filter((x) => (x.d.updatedAt || x.d.createdAt) > t).length; }
const faceReady = () => S.faceCount >= 3;
function receiving() { const s = settings(); return !!(s.recognition && s.reception && !s.paused && faceReady()); }

/* ---------- face models (on device) ---------- */
let modelsP = null;
function loadModels() {
  if (modelsP) return modelsP;
  modelsP = (async () => {
    await loadScript(FACEAPI_URL);
    const faceapi = window.faceapi;
    try { await faceapi.tf.setBackend("webgl"); } catch {}
    await faceapi.tf.ready();
    await Promise.all([faceapi.nets.ssdMobilenetv1.loadFromUri("/models"), faceapi.nets.faceLandmark68Net.loadFromUri("/models"), faceapi.nets.faceRecognitionNet.loadFromUri("/models")]);
  })();
  modelsP.catch(() => { modelsP = null; });
  return modelsP;
}
const detOpts = (c = 0.5) => new window.faceapi.SsdMobilenetv1Options({ minConfidence: c, maxResults: 60 });
function yawOf(lm) { const p = lm.positions; const avg = (a) => a.reduce((s, q) => ({ x: s.x + q.x / a.length, y: s.y + q.y / a.length }), { x: 0, y: 0 }); const le = avg(p.slice(36, 42)), re = avg(p.slice(42, 48)); const mid = (le.x + re.x) / 2; const iod = Math.hypot(re.x - le.x, re.y - le.y) || 1; return (p[30].x - mid) / iod; }

/* ---------- render ---------- */
function renderError(msg) { $("#root").innerHTML = `<div class="app"><div class="ob"><div class="brand">${LOGO}Picnic</div><div class="empty">${I.info}<h2>Something's not set up</h2><p class="muted">${esc(msg)}</p></div></div></div>`; }
function render() {
  const root = $("#root");
  const ae = document.activeElement; const fid = ae && ae.id && !(ae.closest && ae.closest("#sheet")) ? ae.id : null; const sel = fid && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  if (!S.session) { root.innerHTML = viewAuth(); }
  else if (!S.loaded) { root.innerHTML = `<div class="app"><div class="ob"><div class="brand">${LOGO}Picnic</div><div class="row muted"><span class="spin"></span>Loading your photos</div></div></div>`; return; }
  else if (!settings().onboarded) { root.innerHTML = viewOnboarding(); }
  else {
    const tab = S.ui.tab;
    const body = { home: viewHome, me: viewMe, events: viewEvents, alerts: viewAlerts, profile: viewProfile }[tab]();
    root.innerHTML = `<div class="app">${body}</div>${viewNav()}${S.ui.select && tab === "me" ? viewSelbar() : ""}`;
  }
  if (S.sheet && S.sheet.live) renderSheet();
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch {} } }
  hydrate();
}
function hydrate() { document.querySelectorAll("[data-qr]").forEach((el) => { if (el.dataset.done) return; el.dataset.done = 1; drawQR(el, el.dataset.qr); }); }
function topBar(title, right = "") { return `<header class="top"><div class="brand">${LOGO}${esc(title)}</div><div class="row">${right}</div></header>`; }
function sw(key, on, extra = "") { return `<button class="switch" role="switch" aria-checked="${!!on}" data-act="toggle" data-k="${key}" ${extra} aria-label="${esc(key)}"></button>`; }

/* ----- Auth ----- */
function viewAuth() {
  const m = S.ui.authMode;
  return `<div class="app"><div class="ob">
    <div class="brand">${LOGO}Picnic</div>
    <div class="ob-hero"><p class="eyebrow">Your face. Your photos. Automatically.</p><h1>${m === "signup" ? "Create your account" : "Never miss a photo you're in."}</h1><p class="muted">${m === "signup" ? "Use your real name so friends at your events recognise you." : "Sign in to see the photos friends took of you."}</p></div>
    <form id="authForm" class="auth-card">
      ${m === "signup" ? `<label class="field" for="a-name">Full name<input class="input" id="a-name" name="name" autocomplete="name" required maxlength="60"></label>` : ""}
      <label class="field" for="a-email">Email<input class="input" id="a-email" name="email" type="email" autocomplete="email" required></label>
      <label class="field" for="a-pass">Password<input class="input" id="a-pass" name="password" type="password" autocomplete="${m === "signup" ? "new-password" : "current-password"}" minlength="8" required></label>
      <button class="btn primary block" type="submit" id="a-submit">${m === "signup" ? "Create account" : "Sign in"}</button>
      ${GOOGLE_ON ? `<div class="divider">or</div><button class="btn block" type="button" data-act="google">Continue with Google</button>` : ""}
      <p class="small muted" style="text-align:center">${m === "signup" ? `Already have an account? <button type="button" class="linkbtn" data-act="authmode" data-k="signin">Sign in</button>` : `New to Picnic? <button type="button" class="linkbtn" data-act="authmode" data-k="signup">Create an account</button>`}</p>
    </form>
    ${S.pendingJoin ? `<div class="notice acc">${I.qr}<div class="small">Sign in to join the event you scanned.</div></div>` : ""}
  </div></div>`;
}

function viewNav() {
  const n = newCount() + pendingActions().length;
  const t = (k, label, icon, count) => `<button data-act="tab" data-k="${k}" ${S.ui.tab === k ? 'aria-current="page"' : ""}>${icon}<span>${label}</span>${count ? `<span class="count">${count > 99 ? "99+" : count}</span>` : ""}</button>`;
  return `<nav class="nav" aria-label="Main"><div class="nav-in">${t("home", "Home", I.home)}${t("me", "Photos of Me", I.me)}${t("events", "Events", I.events)}${t("alerts", "Alerts", I.bell, n)}${t("profile", "Profile", I.user)}</div></nav>`;
}
function statusNotice() {
  const s = settings();
  if (!faceReady()) return `<div class="notice warn">${I.face}<div class="grow"><strong>Set up your face profile to receive photos.</strong><div class="small muted">Takes about a minute. Your selfies never leave this device.</div></div><button class="btn sm" data-act="enroll">Set up</button></div>`;
  if (!s.recognition) return `<div class="notice">${I.info}<div class="grow"><strong>Face matching is off.</strong><div class="small muted">Nobody can find you in photos while it's off.</div></div><button class="btn sm" data-act="set" data-k="recognition" data-v="1">Turn on</button></div>`;
  if (s.paused) return `<div class="notice">${I.pause}<div class="grow"><strong>Photo sharing is paused.</strong><div class="small muted">New photos of you won't be collected until you resume.</div></div><button class="btn sm" data-act="set" data-k="paused" data-v="0">Resume</button></div>`;
  if (!s.reception) return `<div class="notice">${I.info}<div class="grow"><strong>Automatic reception is off.</strong></div><button class="btn sm" data-act="set" data-k="reception" data-v="1">Turn on</button></div>`;
  return "";
}

/* ----- Home ----- */
function viewHome() {
  const first = (S.me.name || "").split(" ")[0];
  const del = delivered(); const nc = newCount();
  const evs = myEvents().filter((e) => (evPhase(e) === "active" && isApproved(e.id)) || (e.organizerId === S.me.id && evPhase(e) !== "past")).slice(0, 4);
  const mine = Object.values(S.photos).filter((p) => p.uploaderId === S.me.id);
  const hr = new Date().getHours(); const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  return `${topBar("Picnic", `<button class="icon-btn" data-act="tab" data-k="profile" aria-label="Profile"><img class="avatar" src="${esc(av(S.me.id))}" alt=""></button>`)}
  <div class="stack-lg">
    <div class="stack" style="gap:6px"><p class="eyebrow">${esc(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }))}</p><h1>${greet}${first ? ", " + esc(first) : ""}.</h1></div>
    ${statusNotice()}
    <div class="stat-row">
      <button class="stat new" data-act="tab" data-k="alerts"><div class="n">${nc}</div><div class="l">New photos of you</div></button>
      <button class="stat" data-act="tab" data-k="me"><div class="n">${del.length}</div><div class="l">Photos of Me</div></button>
      <button class="stat" data-act="sheet" data-k="uploads"><div class="n">${mine.length}</div><div class="l">My uploads</div></button>
    </div>
    <div class="actions">
      <button class="action" data-act="sheet" data-k="upload">${I.upload}Share photos</button>
      <button class="action" data-act="sheet" data-k="create">${I.plus}Create event</button>
      <button class="action" data-act="sheet" data-k="join">${I.qr}Scan event QR</button>
    </div>
    <section class="stack">
      <div class="row spread"><h2>Recently received</h2>${del.length ? `<button class="btn ghost sm" data-act="tab" data-k="me">See all</button>` : ""}</div>
      ${del.length ? `<div class="strip">${del.slice(0, 12).map((x) => tile(x)).join("")}</div>` : `<div class="empty">${I.photo}<p class="muted">Photos other people take of you at your events will land here automatically.</p></div>`}
    </section>
    <section class="stack">
      <div class="row spread"><h2>Active events</h2><button class="btn ghost sm" data-act="tab" data-k="events">All events</button></div>
      ${evs.length ? evs.map(evCard).join("") : `<div class="empty">${I.events}<p class="muted">Create an event for a wedding, trip or fest, or scan an organiser's QR code to join theirs.</p><div class="row"><button class="btn primary sm" data-act="sheet" data-k="create">Create event</button><button class="btn sm" data-act="sheet" data-k="join">Join with code</button></div></div>`}
    </section>
    <section class="panel flush">
      <div class="toggle-row"><div class="grow"><div style="font-weight:600">Pause all photo sharing</div><div class="small muted">Stops collecting new photos of you everywhere.</div></div>${sw("paused", settings().paused)}</div>
      <button class="toggle-row" data-act="sheet" data-k="privacy" style="border-left:0;border-right:0;border-bottom:0;background:none;text-align:left;width:100%"><span style="color:var(--accent);width:20px;height:20px;display:block">${I.shield}</span><div class="grow"><div style="font-weight:600">Privacy dashboard</div><div class="small muted">Face profile, consents, blocked people</div></div><span style="width:18px;height:18px;display:block;color:var(--muted)">${I.chev}</span></button>
    </section>
  </div>`;
}
function evCard(e) {
  const m = myMember(e.id); const org = e.organizerId === S.me.id;
  const cnt = delivered().filter((x) => x.p.eventId === e.id).length;
  const cover = coverFor(e);
  const st = e.status === "paused" ? '<span class="pill warn">Paused</span>' : evPhase(e) === "upcoming" ? '<span class="pill acc">Upcoming</span>' : evPhase(e) === "past" ? '<span class="pill">Ended</span>' : '<span class="pill ok"><span class="dot"></span>Live</span>';
  const role = org ? '<span class="pill">Organiser</span>' : m && m.status === "pending" ? '<span class="pill warn">Request sent</span>' : "";
  return `<button class="ev-card" data-act="event" data-id="${esc(e.id)}"><div class="ev-cover">${cover ? `<img src="${cover}" alt="" loading="lazy">` : esc((e.name || "?")[0].toUpperCase())}</div><div class="grow stack" style="gap:4px"><h3 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.name)}</h3><div class="small muted">${esc(fmtDate(dayMs(e.startDate)))}${e.location ? " · " + esc(e.location) : ""}</div><div class="row wrap" style="gap:6px">${st}${role}${cnt ? `<span class="pill acc">${plural(cnt, "photo")} of you</span>` : ""}</div></div>${I.chev}</button>`;
}
function coverFor(e) { const x = delivered().find((x) => x.p.eventId === e.id); if (x) return url(x.p.thumb); const own = Object.values(S.photos).find((p) => p.eventId === e.id && p.uploaderId === S.me.id); return own ? url(own.thumb) : ""; }
function tile(x, { sel = false } = {}) {
  const p = x.p; const selected = S.ui.sel.has(p.id);
  return `<button class="tile ${selected ? "selected" : ""}" data-act="${sel ? "selpick" : "view"}" data-id="${esc(p.id)}" aria-label="Photo from ${esc(S.events[p.eventId]?.name || "an event")}"><img src="${url(p.thumb)}" alt="" loading="lazy">${sel ? '<span class="selmark"></span>' : ""}</button>`;
}

/* ----- Photos of Me ----- */
function currentMeItems() {
  const all = visibleInbox(); const f = S.ui.filter; const q = S.ui.q.trim().toLowerCase();
  let items = all;
  if (f.startsWith("ev:")) items = items.filter((x) => x.p.eventId === f.slice(3));
  else if (f.startsWith("al:")) { const a = S.albums.find((a) => a.id === f.slice(3)); const set = new Set(a ? a.photoIds : []); items = items.filter((x) => set.has(x.p.id)); }
  if (q) items = items.filter((x) => [x.e?.name, x.e?.location, nm(x.p.uploaderId), fmtDay(x.p.takenAt || x.p.createdAt)].join(" ").toLowerCase().includes(q));
  return items;
}
function viewMe() {
  const all = visibleInbox();
  const evIds = [...new Set(all.map((x) => x.p.eventId))];
  const f = S.ui.filter; const q = S.ui.q.trim();
  const items = currentMeItems();
  const groups = []; for (const x of items.sort((a, b) => (b.p.takenAt || b.p.createdAt) - (a.p.takenAt || a.p.createdAt))) { const k = new Date(x.p.takenAt || x.p.createdAt).toDateString(); let g = groups[groups.length - 1]; if (!g || g.k !== k) { g = { k, t: x.p.takenAt || x.p.createdAt, items: [] }; groups.push(g); } g.items.push(x); }
  const chip = (k, l) => `<button class="chip" data-act="filter" data-k="${esc(k)}" aria-pressed="${f === k}">${esc(l)}</button>`;
  return `${topBar("Photos of Me", all.length ? `<button class="btn sm ${S.ui.select ? "primary" : ""}" data-act="selmode">${S.ui.select ? "Done" : "Select"}</button>` : "")}
  <div class="stack">
    <div class="row" style="position:relative"><span style="position:absolute;left:12px;top:13px;color:var(--muted);width:18px;height:18px;display:block">${I.search}</span><input id="q" class="input" style="padding-left:38px" type="search" placeholder="Search events, people, dates" value="${esc(S.ui.q)}" data-input="q" aria-label="Search photos"></div>
    <div class="chips">${chip("all", "All " + all.length)}${evIds.map((id) => chip("ev:" + id, S.events[id]?.name || "Event")).join("")}${S.albums.map((a) => chip("al:" + a.id, a.name)).join("")}<button class="chip" data-act="newalbum">+ Album</button></div>
    ${evIds.length && f === "all" && !q ? `<div class="stack" style="gap:8px"><p class="eyebrow">Event albums</p><div class="strip" style="grid-auto-columns:140px">${evIds.map((id) => { const e = S.events[id]; const xs = all.filter((x) => x.p.eventId === id); return `<button class="stack" style="gap:6px;border:0;background:none;padding:0;text-align:left" data-act="filter" data-k="ev:${esc(id)}"><span class="tile" style="border-radius:10px;width:140px"><img src="${url(xs[0].p.thumb)}" alt="" loading="lazy"></span><span style="font-weight:600;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e?.name || "Event")}</span><span class="small muted mono">${xs.length} photos</span></button>`; }).join("")}</div></div>` : ""}
    ${f.startsWith("al:") ? `<div class="row spread"><span class="small muted">Custom album</span><button class="btn sm danger" data-act="delalbum" data-id="${esc(f.slice(3))}">Delete album</button></div>` : ""}
    ${groups.length ? groups.map((g) => `<div class="day-head"><h3>${esc(fmtDay(g.t))}</h3><span class="small muted mono">${g.items.length}</span></div><div class="grid">${g.items.map((x) => tile(x, { sel: S.ui.select })).join("")}</div>`).join("") :
      all.length ? `<div class="empty">${I.search}<p class="muted">No photos match. Try another filter or search.</p></div>` :
      `<div class="empty">${I.me}<h3>No photos of you yet</h3><p class="muted">Join an event. When another guest shares photos you're in, Picnic finds you and adds them here.</p><button class="btn primary sm" data-act="sheet" data-k="join">Join an event</button></div>`}
  </div>`;
}
function viewSelbar() { const n = S.ui.sel.size; return `<div class="selbar"><div class="selbar-in"><strong class="grow">${n} selected</strong><button class="btn sm" data-act="selall">Select all</button><button class="btn sm" ${n ? "" : "disabled"} data-act="addtoalbum">Add to album</button><button class="btn sm primary" ${n ? "" : "disabled"} data-act="zip">${I.download}Save</button><button class="btn sm danger" ${n ? "" : "disabled"} data-act="bulkremove">Remove</button></div></div>`; }

/* ----- Events ----- */
function viewEvents() {
  const all = myEvents(); const seg = S.ui.evSeg;
  const ph = (e) => (e.status === "paused" ? "active" : evPhase(e));
  const list = all.filter((e) => ph(e) === seg).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const segBtn = (k, l) => `<button data-act="evseg" data-k="${k}" aria-pressed="${seg === k}">${l} <span class="mono">${all.filter((e) => ph(e) === k).length}</span></button>`;
  return `${topBar("Events")}
  <div class="stack">
    <div class="row"><button class="btn primary grow" data-act="sheet" data-k="create">${I.plus}Create event</button><button class="btn grow" data-act="sheet" data-k="join">${I.qr}Scan or enter code</button></div>
    <div class="seg">${segBtn("active", "Active")}${segBtn("upcoming", "Upcoming")}${segBtn("past", "Past")}</div>
    ${list.length ? list.map(evCard).join("") : `<div class="empty">${I.events}<p class="muted">${seg === "active" ? "No live events. Create one or join with a code." : seg === "upcoming" ? "Nothing scheduled ahead." : "Past events will appear here with their albums."}</p></div>`}
  </div>`;
}

/* ----- Alerts ----- */
function pendingActions() {
  const out = [];
  for (const d of S.outbox) { if (d.status === "pending" && S.photos[d.photoId]?.sharing === "on") out.push({ k: "approve", d, t: d.createdAt }); if (d.status === "removal_requested") out.push({ k: "removal", d, t: d.updatedAt }); }
  for (const e of Object.values(S.events)) { if (e.organizerId !== S.me.id || !evAlive(e)) continue; for (const m of S.members) if (m.eventId === e.id && m.status === "pending") out.push({ k: "join", m, e, t: m.joinedAt }); }
  return out.sort((a, b) => b.t - a.t);
}
function consentLabel(c) { const m = { biometric: "Face profile", recognition: "Face matching", reception: "Automatic reception", terms: "Terms and privacy policy", age: "Age confirmation", event: "Event matching consent", paused: "Pause sharing" }; return (m[c.type] || c.type) + ": " + c.status; }
let seenTimer = null;
function viewAlerts() {
  const seen = settings().notifSeenAt || 0;
  const acts = pendingActions(); const del = delivered();
  const byKey = {};
  for (const x of del) { const t = x.d.updatedAt || x.d.createdAt; const k = x.p.eventId + "|" + new Date(t).toDateString(); (byKey[k] = byKey[k] || { e: x.e, t: 0, xs: [] }).xs.push(x); byKey[k].t = Math.max(byKey[k].t, t); }
  const feed = [];
  Object.values(byKey).forEach((g) => feed.push({ t: g.t, html: `<button class="item" data-act="filterme" data-k="ev:${esc(g.e.id)}"><div class="ev-cover" style="width:48px;height:48px"><img src="${url(g.xs[0].p.thumb)}" alt=""></div><div class="grow"><div class="t">${g.xs.length === 1 ? "Someone has a new photo of you" : plural(g.xs.length, "new photo") + " of you"}</div><div class="small muted">${esc(g.e.name)} · ${ago(g.t)}</div></div>${g.t > seen ? '<span class="pill acc">New</span>' : ""}</button>` }));
  S.members.filter((m) => m.userId === S.me.id && m.status === "approved" && m.approvedAt && S.events[m.eventId] && S.events[m.eventId].organizerId !== S.me.id).forEach((m) => feed.push({ t: m.approvedAt, html: `<button class="item" data-act="event" data-id="${esc(m.eventId)}"><span style="color:var(--ok)">${I.events}</span><div class="grow"><div class="t">You're in: ${esc(S.events[m.eventId].name)}</div><div class="small muted">Request approved · ${ago(m.approvedAt)}</div></div></button>` }));
  S.outbox.filter((d) => d.status === "reported").forEach((d) => feed.push({ t: d.updatedAt, html: `<button class="item" data-act="manage" data-id="${esc(d.photoId)}"><span style="color:var(--warn)">${I.info}</span><div class="grow"><div class="t">A match on your photo was reported as wrong</div><div class="small muted">Removed from that person's collection · ${ago(d.updatedAt)}</div></div></button>` }));
  S.consents.slice(0, 8).forEach((c) => feed.push({ t: c.at, html: `<div class="item"><span style="color:var(--muted)">${I.shield}</span><div class="grow"><div class="t">${esc(consentLabel(c))}</div><div class="small muted">Security · ${ago(c.at)}</div></div></div>` }));
  feed.sort((a, b) => b.t - a.t);
  if (del.some((x) => (x.d.updatedAt || x.d.createdAt) > seen)) { clearTimeout(seenTimer); seenTimer = setTimeout(() => { if (S.ui.tab === "alerts") setSettings({ notifSeenAt: now() }); }, 2500); }
  return `${topBar("Alerts")}
  <div class="stack-lg">
    ${acts.length ? `<section class="stack"><h2>Needs your decision</h2><div class="panel flush list">${acts.map((a) => {
      if (a.k === "join") return `<div class="item"><img class="avatar sm" src="${esc(av(a.m.userId))}" alt=""><div class="grow"><div class="t">${esc(nm(a.m.userId))} wants to join</div><div class="small muted">${esc(a.e.name)} · ${ago(a.t)}</div></div><button class="btn sm" data-act="member" data-e="${esc(a.m.eventId)}" data-u="${esc(a.m.userId)}" data-v="removed">Decline</button><button class="btn sm primary" data-act="member" data-e="${esc(a.m.eventId)}" data-u="${esc(a.m.userId)}" data-v="approved">Approve</button></div>`;
      const p = S.photos[a.d.photoId];
      if (a.k === "approve") return `<div class="item"><div class="ev-cover" style="width:48px;height:48px">${p ? `<img src="${url(p.thumb)}" alt="">` : ""}</div><div class="grow"><div class="t">Send to ${esc(nm(a.d.recipientId))}?</div><div class="small muted">They appear in your photo · ${esc(S.events[a.d.eventId]?.name || "")}</div></div><button class="btn sm" data-act="approve" data-id="${esc(a.d.id)}" data-v="declined">No</button><button class="btn sm primary" data-act="approve" data-id="${esc(a.d.id)}" data-v="delivered">Send</button></div>`;
      return `<div class="item"><div class="ev-cover" style="width:48px;height:48px">${p ? `<img src="${url(p.thumb)}" alt="">` : ""}</div><div class="grow"><div class="t">${esc(nm(a.d.recipientId))} asked you to remove a photo</div><div class="small muted">${esc(S.events[a.d.eventId]?.name || "")}</div></div><button class="btn sm" data-act="manage" data-id="${esc(a.d.photoId)}">Review</button></div>`;
    }).join("")}</div></section>` : ""}
    <section class="stack"><h2>Activity</h2>${feed.length ? `<div class="panel flush list">${feed.slice(0, 60).map((f) => f.html).join("")}</div>` : `<div class="empty">${I.bell}<p class="muted">New photos of you, event updates and approval requests show up here.</p></div>`}</section>
    <p class="small muted">Alerts update while Picnic is open. Phone push notifications come in a later version.</p>
  </div>`;
}

/* ----- Profile ----- */
function viewProfile() {
  const s = settings();
  return `${topBar("Profile")}
  <div class="stack-lg">
    <div class="row"><img class="avatar lg" src="${esc(av(S.me.id))}" alt=""><div class="grow"><h2>${esc(S.me.name || "You")}</h2><div class="small muted">${esc(S.session.user.email || "")}</div></div></div>
    ${faceCard()}
    <section class="panel flush">
      <div class="toggle-row"><div class="grow"><div style="font-weight:600">Face matching</div><div class="small muted">Lets Picnic recognise you in event photos.</div></div>${sw("recognition", s.recognition)}</div>
      <div class="toggle-row"><div class="grow"><div style="font-weight:600">Automatic photo reception</div><div class="small muted">Add matched photos to Photos of Me without asking.</div></div>${sw("reception", s.reception)}</div>
      <div class="toggle-row"><div class="grow"><div style="font-weight:600">Pause all sharing</div><div class="small muted">Temporarily stop collecting new photos.</div></div>${sw("paused", s.paused)}</div>
    </section>
    <section class="panel flush list">
      <button class="item" data-act="sheet" data-k="privacy"><span style="color:var(--accent)">${I.shield}</span><div class="grow"><div class="t">Privacy dashboard</div><div class="small muted">Everything Picnic knows and does, in one place</div></div>${I.chev}</button>
      <button class="item" data-act="sheet" data-k="uploads"><span style="color:var(--accent)">${I.upload}</span><div class="grow"><div class="t">My uploads and sharing</div><div class="small muted">Control who receives your photos</div></div>${I.chev}</button>
      <button class="item" data-act="signout"><span style="color:var(--muted)">${I.out}</span><div class="grow"><div class="t">Sign out</div></div></button>
    </section>
    <p class="small muted">Face detection runs on your device. Your face signature is stored privately and used only inside events you join.</p>
  </div>`;
}
function faceCard() {
  if (!faceReady()) return `<section class="panel stack"><div class="row"><div class="face-glyph">${I.face}</div><div class="grow"><h3>No face profile</h3><p class="small muted">Without one, you can share photos but won't receive any.</p></div></div><button class="btn primary" data-act="enroll">Set up face profile</button></section>`;
  return `<section class="panel stack"><div class="row"><div class="face-glyph" style="color:var(--ok);background:var(--ok-soft)">${I.face}</div><div class="grow"><h3>Face profile active</h3><p class="small muted mono">${S.faceCount} angles stored</p></div><span class="pill ok"><span class="dot"></span>Ready</span></div><div class="row"><button class="btn grow" data-act="enroll">Update</button><button class="btn danger grow" data-act="delface">Delete profile</button></div></section>`;
}

/* ----- Onboarding ----- */
function viewOnboarding() {
  const st = S.ui.obStep;
  const steps = `<div class="steps">${[0, 1, 2].map((i) => `<i class="${i <= st ? "on" : ""}"></i>`).join("")}</div>`;
  const brand = `<div class="brand">${LOGO}Picnic</div>`;
  if (st === 0) return `<div class="app"><div class="ob">${brand}${steps}
    <div class="stack"><h1>Before you start</h1><p class="muted">Picnic works only with your explicit permission. You can change each of these later in the Privacy dashboard.</p></div>
    ${!S.profile.name ? `<label class="field" for="c-name">Your name<input class="input" id="c-name" maxlength="60" placeholder="As friends know you"></label>` : ""}
    <label class="check" for="c-age"><input type="checkbox" id="c-age"><span><strong>I am 18 or older.</strong><br><span class="legal">Picnic is for adults during testing.</span></span></label>
    <label class="check" for="c-terms"><input type="checkbox" id="c-terms"><span><strong>I agree to the Terms and Privacy Policy.</strong><br><span class="legal">My account, events and photos I share are stored to run the service. I can delete my account and data at any time.</span></span></label>
    <label class="check" for="c-bio"><input type="checkbox" id="c-bio"><span><strong>I consent to Picnic processing my facial features.</strong><br><span class="legal">Selfies I take are turned into a face signature on my device. The signature is stored privately, used only to find me in photos shared in events I join, and deleted when I delete my profile. Processed under India's Digital Personal Data Protection Act, 2023.</span></span></label>
    <button class="btn primary block" data-act="obconsent">Continue</button></div></div>`;
  if (st === 1) return `<div class="app"><div class="ob">${brand}${steps}${enrollBody(true)}</div></div>`;
  return `<div class="app"><div class="ob">${brand}${steps}
    <div class="stack"><h1>You're set</h1><p class="muted">Join an event with its QR code, or create one. When someone shares photos you're in, they'll appear in Photos of Me.</p></div>
    <div class="notice acc">${I.info}<div class="small">You choose the photos you share. Picnic only sees photos you pick and never browses your gallery on its own.</div></div>
    <div class="notice">${I.info}<div class="small">On iPhone, tap Share then <strong>Add to Home Screen</strong> to use Picnic like an app.</div></div>
    <button class="btn primary block" data-act="obdone">Open Picnic</button></div></div>`;
}

/* ----- Enrollment ----- */
const enr = { slots: [null, null, null, null, null], busy: -1, err: {} };
const SLOT_LABEL = ["Look straight", "Turn slightly left", "Turn slightly right", "Optional: tilt up", "Optional: different light"];
function enrollBody(inOb) {
  const ok = enr.slots.filter(Boolean).length;
  const ready = enr.slots[0] && enr.slots[1] && enr.slots[2];
  return `<div class="stack"><h1>Register your face</h1><p class="muted">Take 3 to 5 selfies in good light. Each is checked on this device for one clear face, then discarded. Only the face signature is kept.</p></div>
  <div class="slots">${enr.slots.map((s, i) => `<button class="slot ${s ? "done" : ""} ${enr.err[i] ? "err" : ""}" data-act="shot" data-i="${i}" ${enr.busy >= 0 ? "disabled" : ""} id="slot${i}">${enr.busy === i ? '<span class="spin" style="color:var(--accent)"></span><span>Checking</span>' : s ? `${I.face}<span class="cap">Done</span><span class="small">${esc(SLOT_LABEL[i])}</span>` : `${I.camera}<span>${esc(SLOT_LABEL[i])}</span>`}</button>`).join("")}</div>
  ${Object.values(enr.err).filter(Boolean).slice(-1).map((e) => `<div class="notice bad">${I.info}<div class="small">${esc(e)}</div></div>`).join("")}
  <div class="notice">${I.shield}<div class="small">Basic liveness check: the turned selfies must show different head angles, and all selfies must be the same person. The first time, the face model downloads (about 12 MB).</div></div>
  <div class="row">${inOb ? `<button class="btn" data-act="obskip">Skip for now</button>` : ""}<button class="btn primary grow" data-act="enrollsave" ${ready && enr.busy < 0 ? "" : "disabled"}>Save face profile (${ok}/5)</button></div>`;
}
async function takeShot(i) {
  const [file] = await pick("image/*", { capture: "user" }); if (!file) return;
  enr.busy = i; enr.err[i] = null; refreshEnroll();
  try {
    await loadModels();
    const u = URL.createObjectURL(file); const img = await loadImg(u); URL.revokeObjectURL(u);
    const c = canvasFrom(img, 1024);
    const dets = await window.faceapi.detectAllFaces(c, detOpts()).withFaceLandmarks().withFaceDescriptors();
    if (!dets.length) throw new Error("No face found. Hold the phone at eye level in good light.");
    if (dets.length > 1) throw new Error("More than one face in that selfie. Take it on your own.");
    const d = dets[0];
    if (d.detection.score < 0.85) throw new Error("The face isn't clear enough. Try brighter light and hold still.");
    if (d.detection.box.width < Math.min(c.width, c.height) * 0.18) throw new Error("Move closer so your face fills more of the frame.");
    const yaw = yawOf(d.landmarks);
    if (i === 0 && Math.abs(yaw) > 0.14) throw new Error("Look straight at the camera for this one.");
    if ((i === 1 || i === 2) && Math.abs(yaw) < 0.06) throw new Error("Turn your head a little more for this angle.");
    const other = enr.slots[i === 1 ? 2 : 1];
    if ((i === 1 || i === 2) && other && Math.sign(other.yaw) === Math.sign(yaw)) throw new Error("Turn the other way for this angle.");
    for (const [j, s] of enr.slots.entries()) if (s && j !== i && dist(s.desc, d.descriptor) > 0.55) throw new Error("This doesn't look like the same person as your other selfies.");
    enr.slots[i] = { desc: Array.from(d.descriptor), yaw };
  } catch (e) { enr.err[i] = e.message || "Couldn't read that photo."; }
  enr.busy = -1; refreshEnroll();
}
function refreshEnroll() { if (!settings().onboarded) render(); else renderSheet(); }
async function saveEnroll() {
  const samples = enr.slots.filter(Boolean); if (samples.length < 3) return;
  const payload = samples.map((s) => s.desc.map((v) => +v.toFixed(5)));
  const okRes = await act(async () => { const n = await rpc("save_face_profile", { p_samples: payload }); await logConsent("biometric", "created"); return n; });
  if (okRes === false) return;
  enr.slots = [null, null, null, null, null]; enr.err = {};
  toast(okRes > 0 ? "Face profile saved. Found " + plural(okRes, "photo") + " of you." : "Face profile saved");
  if (!settings().onboarded) { S.ui.obStep = 2; render(); } else closeSheet();
}

/* ---------- sheets ---------- */
const LIVE = new Set(["event", "qr", "uploads", "manage", "view", "privacy"]);
function openSheet(type, data = {}, live) { S.sheet = { type, data, live: live ?? LIVE.has(type) }; renderSheet(); }
function closeSheet() { S.sheet = null; $("#sheet").innerHTML = ""; render(); }
function closeSheetSilent() { S.sheet = null; $("#sheet").innerHTML = ""; }
function renderSheet() {
  const sh = S.sheet; if (!sh) { $("#sheet").innerHTML = ""; return; }
  const f = { create: sheetCreate, join: sheetJoin, event: sheetEvent, qr: sheetQR, upload: sheetUpload, uploads: sheetUploads, view: sheetView, privacy: sheetPrivacy, enroll: sheetEnroll, album: sheetAlbum, manage: sheetManage }[sh.type];
  if (!f) return;
  const { title, body, full, dark, back } = f(sh.data);
  const scroll = $("#sheet .sheet-body"); const st = scroll ? scroll.scrollTop : 0;
  const ae = document.activeElement; const fid = ae && ae.closest && ae.closest("#sheet") ? ae.id : null;
  $("#sheet").innerHTML = `<div class="sheet-wrap" data-act="scrim"><div class="sheet ${full ? "full" : ""} ${dark ? "viewer" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head">${back ? `<button class="icon-btn" data-act="sheetback" aria-label="Back">${I.back}</button>` : ""}<h2>${esc(title)}</h2><button class="icon-btn" data-act="close" aria-label="Close">${I.x}</button></div><div class="sheet-body">${body}</div></div></div>`;
  const nb = $("#sheet .sheet-body"); if (nb) nb.scrollTop = st;
  if (fid) { const el = document.getElementById(fid); if (el) el.focus(); }
  hydrate();
}

function sheetCreate() {
  const today = new Date().toISOString().slice(0, 10);
  return { title: "Create event", body: `
  <form id="createForm" class="stack">
    <label class="field" for="ev-name">Event name<input class="input" id="ev-name" name="name" required maxlength="80" placeholder="Riviera 2026"></label>
    <div class="row wrap"><label class="field grow" for="ev-start">Starts<input class="input" type="date" id="ev-start" name="start" value="${today}" required></label><label class="field grow" for="ev-end">Ends<input class="input" type="date" id="ev-end" name="end" value="${today}"></label></div>
    <label class="field" for="ev-loc">Location (optional)<input class="input" id="ev-loc" name="loc" maxlength="80" placeholder="VIT Vellore"></label>
    <div class="panel flush">
      <div class="toggle-row"><div class="grow"><div style="font-weight:600">Approve people before they join</div><div class="small muted">Recommended for private events</div></div><input type="checkbox" id="ev-jap" name="jap" checked style="width:20px;height:20px"></div>
      <div class="toggle-row"><div class="grow"><div style="font-weight:600">Photographers approve each delivery</div><div class="small muted">Matches wait until the photographer says yes</div></div><input type="checkbox" id="ev-pap" name="pap" style="width:20px;height:20px"></div>
      <div class="toggle-row"><div class="grow"><div style="font-weight:600">Automatic photo delivery</div><div class="small muted">Deliver matched photos to participants</div></div><input type="checkbox" id="ev-auto" name="auto" checked style="width:20px;height:20px"></div>
    </div>
    <label class="check" for="ev-me"><input type="checkbox" id="ev-me" name="me" checked><span><strong>Match me in this event's photos.</strong><br><span class="legal">My face signature may be used to find me in photos shared in this event.</span></span></label>
    <button class="btn primary block" type="submit" id="ev-submit">Create event and QR code</button>
  </form>` };
}
async function submitCreate(form) {
  const fd = new FormData(form); const name = String(fd.get("name") || "").trim(); if (!name) return toast("Give the event a name.");
  const start = String(fd.get("start") || ""); let end = String(fd.get("end") || "") || start; if (end < start) end = start;
  $("#ev-submit").disabled = true;
  const id = await act(() => rpc("create_event", { p_name: name, p_start: start, p_end: end, p_location: String(fd.get("loc") || ""), p_join_approval: !!fd.get("jap"), p_photo_approval: !!fd.get("pap"), p_auto: !!fd.get("auto"), p_match_me: !!fd.get("me") }));
  if (!id) { $("#ev-submit").disabled = false; return; }
  if (fd.get("me")) logConsent("event", "granted for " + name);
  openSheet("qr", { id, fresh: true });
}
const joinLink = (t) => location.origin + "/?join=" + t;
function sheetQR({ id, fresh }) {
  const e = S.events[id]; if (!e) return { title: "Event QR", body: `<p class="muted">Loading event…</p>` };
  return { title: "Invite with QR", back: true, body: `
  ${fresh ? `<div class="notice acc">${I.info}<div class="small"><strong>${esc(e.name)} is live.</strong> Guests can scan this with their phone camera. It opens Picnic straight to your event.</div></div>` : ""}
  <div class="qr-card"><div class="eyebrow" style="color:#646873">Scan with your phone camera</div><div class="qr-box" data-qr="${esc(joinLink(e.token))}"></div><div class="code-big">${esc(fmtToken(e.token))}</div><div style="font-weight:600">${esc(e.name)}</div></div>
  <div class="row"><button class="btn grow" data-act="copy" data-v="${esc(joinLink(e.token))}">Copy invite link</button><button class="btn grow" data-act="copy" data-v="${esc(fmtToken(e.token))}">Copy code</button></div>
  <p class="small muted">Scanning only shows the event. Each guest must accept the event's sharing and face-matching terms${e.joinApproval ? ", and you approve them," : ""} before photos can reach them. Issued ${esc(ago(e.tokenIssuedAt || e.createdAt))}.</p>
  ${e.organizerId === S.me.id ? `<button class="btn danger" data-act="revoke" data-id="${esc(e.id)}">Revoke this code and issue a new one</button>` : ""}` };
}
async function drawQR(el, text) { try { const QR = (await import("qrcode")).default; const c = document.createElement("canvas"); await QR.toCanvas(c, text, { width: 220, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0C0E13", light: "#FFFFFF" } }); el.innerHTML = ""; el.appendChild(c); } catch { el.innerHTML = `<p class="small">QR unavailable. Use the code below.</p>`; } }

function sheetJoin(data) {
  if (data.found) {
    const e = data.found;
    if (e.my_status === "approved" || e.my_status === "pending") return { title: "Join event", body: `<div class="notice acc">${I.info}<div>You're already ${e.my_status === "approved" ? "in" : "waiting to join"} <strong>${esc(e.name)}</strong>.</div></div><button class="btn primary" data-act="event" data-id="${esc(e.id)}">Open event</button>` };
    return { title: "Join event", body: `
    <div class="hero-cover"><span class="init">${esc(e.name[0].toUpperCase())}</span></div>
    <div class="stack" style="gap:6px"><h1 style="font-size:1.6rem">${esc(e.name)}</h1><p class="muted">${esc(fmtDate(dayMs(e.start_date)))}${e.location ? " · " + esc(e.location) : ""} · organised by ${esc(e.organizer_name || "Someone")}</p></div>
    <div class="panel flush list"><div class="item">${I.lock}<div class="grow small">${e.join_approval ? "The organiser approves each guest." : "Guests join straight away."}</div></div><div class="item">${I.photo}<div class="grow small">${e.photo_approval ? "Photographers approve each delivery." : "Matched photos are delivered automatically."}</div></div></div>
    <label class="check" for="j-share"><input type="checkbox" id="j-share"><span><strong>I accept this event's sharing terms.</strong><br><span class="legal">Photos I share here may be delivered to participants who appear in them. I can stop sharing any photo later.</span></span></label>
    <label class="check" for="j-bio"><input type="checkbox" id="j-bio" ${faceReady() ? "checked" : ""}><span><strong>Match me in this event's photos.</strong><br><span class="legal">Picnic may compare my face signature with photos shared in this event. Leave unticked to join without receiving photos.</span></span></label>
    ${!faceReady() ? `<div class="notice warn">${I.face}<div class="small">You don't have a face profile yet. You can join now and set it up afterwards.</div></div>` : ""}
    <button class="btn primary block" data-act="dojoin" data-v="${esc(data.token)}">${e.join_approval ? "Request to join" : "Join event"}</button>` };
  }
  return { title: "Join an event", body: `
  <div class="stack"><button class="btn primary block" data-act="scanqr">${I.camera}Scan QR code</button><p class="small muted">Tip: your phone's own camera app can scan Picnic codes too.</p></div>
  <div class="divider">or enter the code</div>
  <form id="joinForm" class="stack"><input class="input code-input" id="j-code" name="code" placeholder="ABCD-2345" maxlength="9" autocomplete="off" autocapitalize="characters" aria-label="Join code" value="${esc(data.code || "")}"><button class="btn block" type="submit">Find event</button></form>
  ${data.err ? `<div class="notice bad">${I.info}<div class="small">${esc(data.err)}</div></div>` : ""}` };
}
function tokenFrom(raw) { const s = String(raw || ""); const m = s.match(/[?&]join=([A-Za-z0-9-]+)/); const t = (m ? m[1] : s).toUpperCase().replace(/^SNAPBACK:/, "").replace(/[^A-Z0-9]/g, ""); return t.length === 8 ? t : null; }
async function lookupToken(raw) {
  const t = tokenFrom(raw); if (!t) return openSheet("join", { code: raw, err: "That doesn't look like a Picnic code. Codes have 8 letters and numbers." });
  try { const e = await rpc("find_event", { p_token: t }); if (!e) return openSheet("join", { code: raw, err: "No active event uses that code. Check it with the organiser; codes can be revoked." }); openSheet("join", { found: e, token: t }); }
  catch (err) { openSheet("join", { code: raw, err: errMsg(err) }); }
}
async function scanQR() {
  const [file] = await pick("image/*", { capture: "environment" }); if (!file) return;
  try {
    const jsQR = (await import("jsqr")).default; const u = URL.createObjectURL(file); const img = await loadImg(u); URL.revokeObjectURL(u);
    let code = null; for (const max of [1000, 1600, 600]) { const c = canvasFrom(img, max); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height); code = jsQR(d.data, c.width, c.height); if (code) break; }
    if (!code) return openSheet("join", { err: "No QR code found in that picture. Fill the frame with the code and try again." });
    lookupToken(code.data);
  } catch (err) { openSheet("join", { err: errMsg(err) }); }
}
async function doJoin(token) {
  const share = $("#j-share")?.checked, bio = $("#j-bio")?.checked;
  if (!share) return toast("Accept the event's sharing terms to join.");
  const e = S.sheet.data.found;
  const id = await act(() => rpc("join_event", { p_token: token, p_receive: !!bio }), e.join_approval ? "Request sent to the organiser" : "You joined " + e.name);
  if (!id) return;
  logConsent("event", (bio ? "matching granted" : "joined without matching") + " for " + e.name);
  openSheet("event", { id });
}

function sheetEvent({ id }) {
  const e = S.events[id]; if (!evAlive(e)) return { title: "Event", body: `<div class="empty">${I.events}<p class="muted">This event isn't available. It may have been deleted, or your request is still loading.</p></div>` };
  const org = e.organizerId === S.me.id; const m = myMember(id);
  const mine = delivered().filter((x) => x.p.eventId === id);
  const ups = Object.values(S.photos).filter((p) => p.eventId === id && p.uploaderId === S.me.id).sort((a, b) => b.createdAt - a.createdAt);
  const parts = S.members.filter((x) => x.eventId === id);
  const appr = parts.filter((x) => x.status === "approved"); const pend = parts.filter((x) => x.status === "pending");
  const cover = coverFor(e);
  const canUpload = (org || (m && m.status === "approved")) && e.status === "active";
  const status = e.status === "paused" ? '<span class="pill warn">Sharing paused</span>' : evPhase(e) === "past" ? '<span class="pill">Ended</span>' : evPhase(e) === "upcoming" ? '<span class="pill acc">Upcoming</span>' : '<span class="pill ok"><span class="dot"></span>Live</span>';
  return { title: e.name, full: true, body: `
  <div class="hero-cover">${cover ? `<img src="${cover}" alt="">` : `<span class="init">${esc(e.name[0].toUpperCase())}</span>`}</div>
  <div class="stack" style="gap:8px"><div class="row wrap">${status}${org ? '<span class="pill">You organise this</span>' : m && m.status === "pending" ? '<span class="pill warn">Waiting for approval</span>' : m && m.status === "approved" ? (m.receive ? '<span class="pill acc">Matching you</span>' : '<span class="pill">Not matching you</span>') : ""}</div>
  <h1 style="font-size:1.6rem">${esc(e.name)}</h1><p class="muted">${esc(fmtDate(dayMs(e.startDate)))}${e.endDate && e.endDate !== e.startDate ? " to " + esc(fmtDate(dayMs(e.endDate))) : ""}${e.location ? " · " + esc(e.location) : ""}</p>
  <p class="small muted mono">${plural(appr.length, "participant")} · organised by ${esc(nm(e.organizerId))}</p></div>
  <div class="row wrap">${canUpload ? `<button class="btn primary grow" data-act="sheet" data-k="upload" data-id="${esc(id)}">${I.upload}Share photos</button>` : ""}${e.token ? `<button class="btn grow" data-act="qr" data-id="${esc(id)}">${I.qr}Invite QR</button>` : ""}</div>
  ${m && m.status === "approved" ? `<div class="panel flush"><div class="toggle-row"><div class="grow"><div style="font-weight:600">${org ? "Match me in this event" : "Receive photos from this event"}</div><div class="small muted">Turn off to stop matching you here</div></div>${sw("memrecv", m.receive, `data-id="${esc(id)}"`)}</div></div>` : ""}
  <section class="stack"><div class="row spread"><h2>Photos of you</h2><span class="mono small muted">${mine.length}</span></div>${mine.length ? `<div class="grid">${mine.map((x) => tile(x)).join("")}</div>` : `<p class="small muted">${m && m.status === "approved" && receiving() ? "None yet. Photos appear as guests share them." : "Turn on matching to receive photos from this event."}</p>`}</section>
  <section class="stack"><div class="row spread"><h2>Your uploads</h2><span class="mono small muted">${ups.length}</span></div>${ups.length ? `<div class="grid">${ups.map((p) => `<button class="tile" data-act="manage" data-id="${esc(p.id)}"><img src="${url(p.thumb)}" alt="" loading="lazy">${p.sharing !== "on" ? '<span class="badge pill">Not shared</span>' : ""}</button>`).join("")}</div>` : `<p class="small muted">Photos you share here are matched against participants who opted in.</p>`}</section>
  ${org ? organiserPanel(e, appr, pend) : ""}
  ${m && !org && ["approved", "pending"].includes(m.status) ? `<button class="btn danger" data-act="leave" data-id="${esc(id)}">Leave event</button>` : ""}` };
}
function organiserPanel(e, appr, pend) {
  const row = (x, actions) => `<div class="item"><img class="avatar sm" src="${esc(av(x.userId))}" alt=""><div class="grow"><div class="t">${esc(nm(x.userId))}</div><div class="small muted">${x.receive ? "Matching on" : "Matching off"} · joined ${esc(ago(x.joinedAt))}</div></div>${actions}</div>`;
  const btn = (x, v, label, cls) => `<button class="btn sm ${cls}" data-act="member" data-e="${esc(x.eventId)}" data-u="${esc(x.userId)}" data-v="${v}">${label}</button>`;
  return `<section class="stack"><h2>Organiser controls</h2>
  ${pend.length ? `<div class="stack" style="gap:8px"><p class="eyebrow">Requests ${pend.length}</p><div class="panel flush list">${pend.map((x) => row(x, btn(x, "removed", "Decline", "") + btn(x, "approved", "Approve", "primary"))).join("")}</div></div>` : ""}
  <div class="stack" style="gap:8px"><p class="eyebrow">Participants ${appr.length}</p><div class="panel flush list">${appr.map((x) => row(x, x.userId === S.me.id ? '<span class="pill">You</span>' : btn(x, "removed", "Remove", "danger"))).join("") || `<div class="item small muted">Nobody yet. Share the QR code.</div>`}</div></div>
  <div class="panel flush">
    <div class="toggle-row"><div class="grow"><div style="font-weight:600">Approve people before they join</div></div>${sw("ev:join_approval", e.joinApproval, `data-id="${esc(e.id)}"`)}</div>
    <div class="toggle-row"><div class="grow"><div style="font-weight:600">Photographers approve each delivery</div><div class="small muted">Applies to matches from now on</div></div>${sw("ev:photo_approval", e.photoApproval, `data-id="${esc(e.id)}"`)}</div>
    <div class="toggle-row"><div class="grow"><div style="font-weight:600">Automatic photo delivery</div></div>${sw("ev:auto_delivery", e.autoDelivery, `data-id="${esc(e.id)}"`)}</div>
  </div>
  <div class="row wrap">
    ${e.status === "active" ? `<button class="btn grow" data-act="evstatus" data-id="${esc(e.id)}" data-v="paused">${I.pause}Pause sharing</button>` : e.status === "paused" ? `<button class="btn grow" data-act="evstatus" data-id="${esc(e.id)}" data-v="active">Resume sharing</button>` : ""}
    ${e.status !== "ended" ? `<button class="btn grow" data-act="evstatus" data-id="${esc(e.id)}" data-v="ended">End event</button>` : `<button class="btn grow" data-act="evstatus" data-id="${esc(e.id)}" data-v="active">Reopen event</button>`}
  </div>
  <button class="btn danger" data-act="evdelete" data-id="${esc(e.id)}">Delete event</button>
  <p class="small muted">Ending an event stops new uploads and permanently deletes the face signatures found in its photos. Deleting hides it for everyone.</p></section>`;
}

function sheetUpload(data) {
  const evs = myEvents().filter((e) => e.status === "active" && (e.organizerId === S.me.id || isApproved(e.id)));
  const sel = data.id || (evs[0] && evs[0].id) || "";
  const e = S.events[sel];
  if (data.progress) return { title: "Sharing photos", body: `<div class="stack">${data.progress.map((r) => `<div class="row"><span class="grow small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</span>${r.state === "done" ? `<span class="pill ok">${r.faces != null ? plural(r.faces, "face") : "Shared"}${r.matches ? " · sent to " + r.matches : ""}</span>` : r.state === "dup" ? '<span class="pill">Already shared</span>' : r.state === "err" ? `<span class="pill bad" title="${esc(r.err)}">Failed</span>` : '<span class="spin" style="color:var(--accent)"></span>'}</div>`).join("")}</div>${data.progress.some((r) => r.state === "err") ? `<div class="notice bad">${I.info}<div class="small">${esc(data.progress.find((r) => r.state === "err").err)}</div></div>` : ""}${data.finished ? `<div class="notice acc">${I.info}<div class="small">Photos were matched as they uploaded. Participants who join later are matched while the event is active.</div></div><button class="btn primary" data-act="close">Done</button>` : ""}` };
  if (!evs.length) return { title: "Share photos", body: `<div class="empty">${I.events}<p class="muted">Photos are shared inside events, so only the people there can receive them. Create or join an event first.</p><div class="row"><button class="btn primary sm" data-act="sheet" data-k="create">Create event</button><button class="btn sm" data-act="sheet" data-k="join">Join event</button></div></div>` };
  return { title: "Share photos", body: `
  <label class="field" for="up-ev">Event<select class="input" id="up-ev">${evs.map((x) => `<option value="${esc(x.id)}" ${x.id === sel ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
  <div class="panel flush">
    <div class="toggle-row"><div class="grow"><div style="font-weight:600">Share with people in these photos</div><div class="small muted">Off keeps them private to you</div></div><input type="checkbox" id="up-share" checked style="width:20px;height:20px"></div>
    <div class="toggle-row"><div class="grow"><div style="font-weight:600">I approve each delivery first</div><div class="small muted">${e && e.photoApproval ? "Required by the organiser" : "You'll see requests under Alerts"}</div></div><input type="checkbox" id="up-appr" ${e && e.photoApproval ? "checked disabled" : ""} style="width:20px;height:20px"></div>
  </div>
  <button class="btn primary block" data-act="pickphotos">${I.photo}Choose from gallery</button>
  <p class="small muted">Photos are resized to 2048 px. Faces are found on this device; only their signatures are sent for matching. Only participants who opted in can be matched.</p>` };
}
async function doUpload() {
  const eid = $("#up-ev").value; const share = $("#up-share").checked; const appr = $("#up-appr").checked || !!S.events[eid]?.photoApproval;
  const files = await pick("image/*", { multiple: true }); if (!files.length) return;
  const progress = files.map((f) => ({ name: f.name, state: "wait" }));
  openSheet("upload", { id: eid, progress }, false);
  let modelsOk = true; try { await loadModels(); } catch { modelsOk = false; }
  for (let i = 0; i < files.length; i++) {
    const f = files[i]; const r = progress[i];
    try {
      const buf = await f.arrayBuffer(); const hash = await sha256(buf);
      if (Object.values(S.photos).some((p) => p.uploaderId === S.me.id && p.eventId === eid && p.hash === hash)) { r.state = "dup"; renderSheet(); continue; }
      const u = URL.createObjectURL(f); const img = await loadImg(u); URL.revokeObjectURL(u);
      const full = canvasFrom(img, 2048), th = canvasFrom(img, 480);
      let descs = [];
      if (modelsOk) { try { descs = (await window.faceapi.detectAllFaces(canvasFrom(img, 1280), detOpts()).withFaceLandmarks().withFaceDescriptors()).map((d) => Array.from(d.descriptor, (v) => +v.toFixed(5))); } catch {} }
      const [b1, b2] = await Promise.all([toJpeg(full, 0.86), toJpeg(th, 0.8)]);
      const pid = crypto.randomUUID(); const path = `${eid}/${pid}.jpg`, tpath = `${eid}/${pid}_t.jpg`;
      let e1 = (await sb.storage.from("photos").upload(path, b1, { contentType: "image/jpeg" })).error; if (e1) throw e1;
      e1 = (await sb.storage.from("photos").upload(tpath, b2, { contentType: "image/jpeg" })).error; if (e1) throw e1;
      const { error } = await sb.from("photos").insert({ id: pid, event_id: eid, uploader_id: S.me.id, path, thumb_path: tpath, width: full.width, height: full.height, hash, faces: descs.length, taken_at: new Date(f.lastModified || now()).toISOString(), sharing: share, require_approval: appr });
      if (error) { await sb.storage.from("photos").remove([path, tpath]); throw error; }
      S.photos[pid] = { id: pid, eventId: eid, uploaderId: S.me.id, hash };
      r.matches = descs.length ? await rpc("add_photo_faces", { p_photo: pid, p_faces: descs }) : 0;
      r.state = "done"; r.faces = modelsOk ? descs.length : null;
    } catch (e) { r.state = "err"; r.err = errMsg(e); }
    renderSheet();
  }
  S.sheet.data.finished = true; renderSheet(); refresh();
}

function sheetUploads() {
  const ups = Object.values(S.photos).filter((p) => p.uploaderId === S.me.id).sort((a, b) => b.createdAt - a.createdAt);
  const byEv = {}; ups.forEach((p) => (byEv[p.eventId] = byEv[p.eventId] || []).push(p));
  return { title: "My uploads", full: true, body: ups.length ? Object.entries(byEv).map(([eid, ps]) => `<section class="stack"><div class="row spread"><h3>${esc(S.events[eid]?.name || "Event")}</h3><span class="mono small muted">${ps.length}</span></div><div class="grid">${ps.map((p) => `<button class="tile" data-act="manage" data-id="${esc(p.id)}"><img src="${url(p.thumb)}" alt="" loading="lazy">${p.sharing !== "on" ? '<span class="badge pill">Not shared</span>' : ""}</button>`).join("")}</div></section>`).join("") : `<div class="empty">${I.upload}<p class="muted">Photos you share in events appear here, with who received each one.</p><button class="btn primary sm" data-act="sheet" data-k="upload">Share photos</button></div>` };
}
function sheetManage({ id }) {
  const p = S.photos[id]; if (!p || !p.path) return { title: "Photo", body: `<p class="muted">This photo isn't available.</p>` };
  const e = S.events[p.eventId]; const ds = S.outbox.filter((d) => d.photoId === id);
  const parts = S.members.filter((m) => m.eventId === p.eventId && m.status === "approved" && m.userId !== S.me.id);
  const stLabel = { delivered: ["ok", "Received"], pending: ["warn", "Awaiting you"], declined: ["", "You declined"], rejected: ["", "They removed it"], reported: ["bad", "Reported wrong match"], removal_requested: ["bad", "Asked for removal"] };
  return { title: "Your photo", full: true, back: true, body: `
  <div class="viewer-img" style="min-height:0;background:var(--sunk)"><img src="${url(p.path)}" alt="" style="max-height:52vh"></div>
  <div class="row wrap"><span class="pill">${esc(e?.name || "Event")}</span>${p.faces != null ? `<span class="pill">${plural(p.faces, "face")} detected</span>` : ""}${p.sharing === "on" ? '<span class="pill ok"><span class="dot"></span>Sharing on</span>' : '<span class="pill">Not shared</span>'}</div>
  <div class="panel flush">
    <div class="toggle-row"><div class="grow"><div style="font-weight:600">Share this photo</div><div class="small muted">Off hides it from everyone who received it. Copies they saved stay with them.</div></div>${sw("ph:sharing", p.sharing === "on", `data-id="${esc(id)}"`)}</div>
    <div class="toggle-row"><div class="grow"><div style="font-weight:600">Approve each delivery</div></div>${sw("ph:require_approval", p.requireApproval, `data-id="${esc(id)}" ${e && e.photoApproval ? "disabled" : ""}`)}</div>
  </div>
  <section class="stack"><h3>Delivered to</h3>${ds.length ? `<div class="panel flush list">${ds.map((d) => { const [c, l] = stLabel[d.status] || ["", d.status]; return `<div class="item"><img class="avatar sm" src="${esc(av(d.recipientId))}" alt=""><div class="grow"><div class="t">${esc(nm(d.recipientId))}</div><div class="small muted mono">distance ${Number(d.distance).toFixed(3)} · ${esc(ago(d.createdAt))}</div></div><span class="pill ${c}">${esc(l)}</span>${d.status === "pending" ? `<button class="btn sm primary" data-act="approve" data-id="${esc(d.id)}" data-v="delivered">Send</button>` : ""}</div>`; }).join("")}</div>` : `<p class="small muted">No matches yet. People who join later are matched while the event is active.</p>`}</section>
  ${parts.length ? `<section class="stack"><h3>Never send to</h3><div class="panel flush">${parts.map((m) => `<div class="toggle-row"><img class="avatar sm" src="${esc(av(m.userId))}" alt=""><div class="grow" style="font-weight:600">${esc(nm(m.userId))}</div>${sw("ph:exclude", (p.excluded || []).includes(m.userId), `data-id="${esc(id)}" data-u="${esc(m.userId)}"`)}</div>`).join("")}</div></section>` : ""}
  <button class="btn danger" data-act="delphoto" data-id="${esc(id)}">Delete photo for everyone</button>` };
}
function sheetView({ id }) {
  const p = S.photos[id]; if (!p) return { title: "Photo", dark: true, full: true, body: `<p>This photo is no longer available.</p>` };
  if (p.uploaderId === S.me.id) return sheetManage({ id });
  const d = S.inbox.find((x) => x.photoId === id); const e = S.events[p.eventId];
  const blocked = settings().blocked.includes(p.uploaderId);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  return { title: e?.name || "Photo", dark: true, full: true, body: `
  <div class="viewer-img"><img src="${url(p.path)}" alt="Photo of you from ${esc(e?.name || "an event")}"></div>
  <dl class="meta"><dt>Event</dt><dd>${esc(e?.name || "")}</dd><dt>Photographer</dt><dd>${esc(nm(p.uploaderId))}</dd><dt>Taken</dt><dd>${esc(fmtDay(p.takenAt || p.createdAt))}, ${esc(fmtTime(p.takenAt || p.createdAt))}</dd><dt>Size</dt><dd class="mono">${p.width}×${p.height}</dd>${d ? `<dt>Match</dt><dd class="mono">distance ${Number(d.distance).toFixed(3)} (threshold ${thr().toFixed(2)})</dd>` : ""}</dl>
  <div class="row wrap"><button class="btn primary grow" data-act="savephoto" data-id="${esc(id)}">${I.download}Save</button>${canShare ? `<button class="btn grow" data-act="sharephoto" data-id="${esc(id)}">${I.share}Share</button>` : ""}<button class="btn grow" data-act="addtoalbum1" data-id="${esc(id)}">Add to album</button></div>
  <div class="stack" style="gap:8px">
    <button class="btn" data-act="recip" data-id="${esc(id)}" data-v="rejected">Remove from my photos</button>
    <button class="btn" data-act="recip" data-id="${esc(id)}" data-v="reported">This isn't me: report wrong match</button>
    <button class="btn danger" data-act="recip" data-id="${esc(id)}" data-v="removal_requested">Ask ${esc(nm(p.uploaderId))} to delete this photo</button>
    <button class="btn danger" data-act="block" data-id="${esc(p.uploaderId)}">${blocked ? "Unblock" : "Block"} ${esc(nm(p.uploaderId))}</button>
  </div>` };
}
function sheetPrivacy() {
  const s = settings();
  const mem = S.members.filter((m) => m.userId === S.me.id && m.status === "approved");
  const ups = Object.values(S.photos).filter((p) => p.uploaderId === S.me.id);
  return { title: "Privacy dashboard", full: true, body: `
  <div class="panel flush list">
    <div class="item"><div class="grow">Face profile</div>${faceReady() ? `<span class="pill ok">${S.faceCount} angles stored</span>` : '<span class="pill">None</span>'}</div>
    <div class="item"><div class="grow">Face matching</div>${s.recognition ? '<span class="pill ok">On</span>' : '<span class="pill">Off</span>'}</div>
    <div class="item"><div class="grow">Automatic reception</div>${s.paused ? '<span class="pill warn">Paused</span>' : s.reception ? '<span class="pill ok">On</span>' : '<span class="pill">Off</span>'}</div>
    <div class="item"><div class="grow">Events matching you</div><span class="pill mono">${mem.filter((m) => m.receive).length}</span></div>
    <div class="item"><div class="grow">Photos you share</div><span class="pill mono">${ups.filter((p) => p.sharing === "on").length} of ${ups.length}</span></div>
    <div class="item"><div class="grow">Blocked people</div><span class="pill mono">${s.blocked.length}</span></div>
  </div>
  <section class="stack"><h3>Face profile</h3>${faceCard()}
    <div class="stack" style="gap:8px"><p class="eyebrow">Match strictness</p><div class="seg">${["strict", "balanced", "relaxed"].map((k) => `<button data-act="strict" data-k="${k}" aria-pressed="${s.strictness === k}">${k[0].toUpperCase() + k.slice(1)} <span class="mono">${THRESH[k]}</span></button>`).join("")}</div><p class="small muted">Lower numbers mean fewer wrong matches but more missed photos. Balanced suits most events.</p></div>
  </section>
  <section class="stack"><h3>How your face data is handled</h3><div class="panel stack small">
    <div class="point"><span class="k">01</span><div>Selfies are processed on your device and discarded. Only a 128-number signature per angle is saved, protected so no other user, including organisers, can read it.</div></div>
    <div class="point"><span class="k">02</span><div>When someone shares a photo, their device finds the faces and sends only signatures. Picnic compares them with people who joined that event and consented. Nobody else is identified.</div></div>
    <div class="point"><span class="k">03</span><div>Signatures from shared photos are kept only while an event is active, so late joiners can be matched, and are deleted when it ends.</div></div>
  </div></section>
  <section class="stack"><h3>Events</h3>${mem.length ? `<div class="panel flush">${mem.map((m) => { const e = S.events[m.eventId]; if (!evAlive(e)) return ""; return `<div class="toggle-row"><div class="grow"><div style="font-weight:600">${esc(e.name)}</div><div class="small muted">${e.organizerId === S.me.id ? "You organise this" : "Joined " + esc(ago(m.joinedAt))}</div></div>${sw("memrecv", m.receive, `data-id="${esc(m.eventId)}"`)}</div>`; }).join("")}</div>` : `<p class="small muted">You haven't joined any events.</p>`}</section>
  <section class="stack"><h3>Blocked people</h3>${s.blocked.length ? `<div class="panel flush list">${s.blocked.map((u) => `<div class="item"><img class="avatar sm" src="${esc(av(u))}" alt=""><div class="grow t">${esc(nm(u))}</div><button class="btn sm" data-act="block" data-id="${esc(u)}">Unblock</button></div>`).join("")}</div>` : `<p class="small muted">Nobody. Block someone from any photo they shared of you.</p>`}</section>
  <section class="stack"><h3>Consent history</h3>${S.consents.length ? `<div class="panel flush list">${S.consents.slice(0, 20).map((c) => `<div class="item small"><div class="grow">${esc(consentLabel(c))}</div><span class="mono muted">${esc(fmtDate(c.at))}</span></div>`).join("")}</div>` : `<p class="small muted">No records yet.</p>`}</section>
  <section class="stack"><h3>Your data</h3><div class="notice bad">${I.info}<div class="small">Deleting your account removes your face profile, matches, albums, event memberships, events you organise and every photo you uploaded. This can't be undone.</div></div><button class="btn danger" data-act="nuke">Delete my account and data</button></section>` };
}
function sheetEnroll() { return { title: "Face profile", full: true, body: enrollBody(false) }; }
function sheetAlbum() { return { title: "Add to album", body: `
  ${S.albums.length ? `<div class="panel flush list">${S.albums.map((a) => `<button class="item" data-act="toalbum" data-id="${esc(a.id)}"><div class="grow"><div class="t">${esc(a.name)}</div><div class="small muted mono">${a.photoIds.length} photos</div></div>${I.plus}</button>`).join("")}</div>` : ""}
  <form id="albumForm" class="row"><input class="input grow" id="al-name" name="name" placeholder="New album name" maxlength="40" required><button class="btn primary" type="submit">Create</button></form>` }; }

/* ---------- actions ---------- */
const confirmState = {};
function needConfirm(btn, key, label) { if (confirmState[key] && now() - confirmState[key] < 4000) { delete confirmState[key]; return false; } confirmState[key] = now(); const old = btn.innerHTML; btn.textContent = label || "Tap again to confirm"; setTimeout(() => { if (btn.isConnected && confirmState[key]) { btn.innerHTML = old; delete confirmState[key]; } }, 4000); return true; }
async function fetchBlob(path) { const r = await fetch(url(path)); if (!r.ok) throw new Error("Couldn't download the photo"); return r.blob(); }
function saveBlob(blob, name) { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
const fileName = (p) => "picnic-" + slug(S.events[p.eventId]?.name) + "-" + p.id.slice(0, 6) + ".jpg";
async function savePhoto(id) { const p = S.photos[id]; try { saveBlob(await fetchBlob(p.path), fileName(p)); } catch (e) { toast(errMsg(e)); } }
async function sharePhoto(id) { const p = S.photos[id]; try { const b = await fetchBlob(p.path); const f = new File([b], fileName(p), { type: "image/jpeg" }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] }); else saveBlob(b, fileName(p)); } catch (e) { if (e.name !== "AbortError") toast(errMsg(e)); } }
async function saveZip(ids) {
  if (!ids.length) return; toast("Preparing " + plural(ids.length, "photo") + "…");
  try { await loadScript(JSZIP_URL); const z = new window.JSZip(); for (const id of ids) { const p = S.photos[id]; if (p) z.file(fileName(p), await fetchBlob(p.path)); } saveBlob(await z.generateAsync({ type: "blob" }), "picnic-photos.zip"); S.ui.select = false; S.ui.sel.clear(); render(); } catch (e) { toast(errMsg(e)); }
}
async function deletePhoto(id) { const p = S.photos[id]; if (!p) return; await sb.storage.from("photos").remove([p.path, p.thumb]); const { error } = await sb.from("photos").delete().eq("id", id); if (error) throw error; }
async function copyText(v) { try { await navigator.clipboard.writeText(v); toast("Copied"); } catch { toast(v); } }

function bind() {
  document.addEventListener("click", async (ev) => {
    const t = ev.target.closest("[data-act]"); if (!t) return;
    const a = t.dataset.act, k = t.dataset.k, id = t.dataset.id, v = t.dataset.v;
    if (a === "scrim") { if (ev.target === t) closeSheet(); return; }
    switch (a) {
      case "authmode": S.ui.authMode = k; render(); break;
      case "google": { const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.search } }); if (error) toast(errMsg(error)); break; }
      case "signout": await sb.auth.signOut(); break;
      case "tab": S.ui.tab = k; S.ui.select = false; S.ui.sel.clear(); closeSheetSilent(); render(); window.scrollTo(0, 0); break;
      case "close": closeSheet(); break;
      case "sheetback": { const d = S.sheet && S.sheet.data; const p = d && d.id && S.photos[d.id]; if (S.sheet.type === "qr") openSheet("event", { id: d.id }); else if (S.sheet.type === "manage" && p) openSheet("event", { id: p.eventId }); else closeSheet(); break; }
      case "sheet": openSheet(k, id ? { id } : {}); break;
      case "event": openSheet("event", { id }); break;
      case "qr": openSheet("qr", { id }); break;
      case "view": openSheet("view", { id }); break;
      case "manage": openSheet("manage", { id }); break;
      case "enroll": enr.slots = [null, null, null, null, null]; enr.err = {}; openSheet("enroll", {}, false); break;
      case "shot": takeShot(+t.dataset.i); break;
      case "enrollsave": t.disabled = true; await saveEnroll(); break;
      case "obconsent": {
        const age = $("#c-age").checked, terms = $("#c-terms").checked, bio = $("#c-bio").checked; const nameEl = $("#c-name");
        if (nameEl && !nameEl.value.trim()) return toast("Add your name so friends recognise you.");
        if (!age) return toast("Picnic is for people aged 18 and over.");
        if (!terms) return toast("Accept the Terms and Privacy Policy to continue.");
        const patch = { age_confirmed: true, recognition: bio }; if (nameEl) patch.name = nameEl.value.trim();
        const { error } = await sb.from("profiles").update(patch).eq("id", S.me.id); if (error) return toast(errMsg(error));
        S.profile = { ...S.profile, ...patch }; if (patch.name) { S.me.name = patch.name; S.people[S.me.id] = { ...(S.people[S.me.id] || {}), name: patch.name }; }
        logConsent("age", "18+ confirmed"); logConsent("terms", "accepted"); logConsent("biometric", bio ? "granted" : "declined");
        S.ui.obStep = bio ? 1 : 2; render(); break;
      }
      case "obskip": S.ui.obStep = 2; render(); break;
      case "obdone": await setSettings({ onboarded: true }); S.ui.tab = "home"; render(); if (S.pendingJoin) { const t2 = S.pendingJoin; S.pendingJoin = null; lookupToken(t2); } break;
      case "set": { const on = v === "1"; if (k === "recognition" && on && !faceReady()) { enr.slots = [null, null, null, null, null]; enr.err = {}; openSheet("enroll", {}, false); break; } await setSettings({ [k]: on }); logConsent(k, on ? "on" : "off"); break; }
      case "toggle": {
        if (t.disabled) return; const on = t.getAttribute("aria-checked") !== "true";
        if (["recognition", "reception", "paused"].includes(k)) { if (k === "recognition" && on && !faceReady()) { enr.slots = [null, null, null, null, null]; enr.err = {}; openSheet("enroll", {}, false); break; } await setSettings({ [k]: on }); logConsent(k, on ? "on" : "off"); break; }
        if (k === "memrecv") { await act(() => rpc("set_receive", { p_event: id, p_receive: on })); logConsent("event", (on ? "matching granted" : "matching withdrawn") + " for " + (S.events[id]?.name || "event")); break; }
        if (k.startsWith("ev:")) { await act(async () => { const { error } = await sb.from("events").update({ [k.slice(3)]: on }).eq("id", id); if (error) throw error; }); break; }
        if (k === "ph:sharing") { await act(async () => { const { error } = await sb.from("photos").update({ sharing: on }).eq("id", id); if (error) throw error; if (on) await rpc("rematch_photo", { p_photo: id }); }, on ? "Sharing on" : "Photo no longer shared"); break; }
        if (k === "ph:require_approval") { await act(async () => { const { error } = await sb.from("photos").update({ require_approval: on }).eq("id", id); if (error) throw error; }); break; }
        if (k === "ph:exclude") { const p = S.photos[id]; const u = t.dataset.u; const ex = new Set(p.excluded || []); on ? ex.add(u) : ex.delete(u); await act(async () => { const { error } = await sb.from("photos").update({ excluded: [...ex] }).eq("id", id); if (error) throw error; const d = S.outbox.find((x) => x.photoId === id && x.recipientId === u); if (on && d && ["pending", "delivered"].includes(d.status)) await rpc("respond_delivery", { p_id: d.id, p_status: "declined" }); }); break; }
        break;
      }
      case "filter": S.ui.filter = k; render(); break;
      case "filterme": S.ui.tab = "me"; S.ui.filter = k; render(); window.scrollTo(0, 0); break;
      case "evseg": S.ui.evSeg = k; render(); break;
      case "selmode": S.ui.select = !S.ui.select; S.ui.sel.clear(); render(); break;
      case "selpick": S.ui.sel.has(id) ? S.ui.sel.delete(id) : S.ui.sel.add(id); render(); break;
      case "selall": currentMeItems().forEach((x) => S.ui.sel.add(x.p.id)); render(); break;
      case "zip": saveZip([...S.ui.sel]); break;
      case "bulkremove": { if (needConfirm(t, "bulk", "Tap again to remove")) return; const ids = [...S.ui.sel]; await act(async () => { for (const pid of ids) { const d = S.inbox.find((x) => x.photoId === pid); if (d) await rpc("respond_delivery", { p_id: d.id, p_status: "rejected" }); } }, "Removed from your photos"); S.ui.sel.clear(); S.ui.select = false; render(); break; }
      case "addtoalbum": openSheet("album", { ids: [...S.ui.sel] }, false); break;
      case "addtoalbum1": openSheet("album", { ids: [id] }, false); break;
      case "newalbum": openSheet("album", { ids: [] }, false); break;
      case "toalbum": { const al = S.albums.find((x) => x.id === id); const ids = [...new Set([...al.photoIds, ...S.sheet.data.ids])]; await act(async () => { const { error } = await sb.from("albums").update({ photo_ids: ids }).eq("id", id); if (error) throw error; }, "Added to " + al.name); S.ui.select = false; S.ui.sel.clear(); closeSheet(); break; }
      case "delalbum": if (needConfirm(t, "al" + id)) return; await act(async () => { const { error } = await sb.from("albums").delete().eq("id", id); if (error) throw error; }); S.ui.filter = "all"; render(); break;
      case "savephoto": savePhoto(id); break;
      case "sharephoto": sharePhoto(id); break;
      case "recip": {
        const d = S.inbox.find((x) => x.photoId === id); if (!d) return;
        const msg = { rejected: "Removed from your photos", reported: "Reported. It's gone from your collection.", removal_requested: "Request sent to the photographer" }[v];
        const ok = await act(async () => { await rpc("respond_delivery", { p_id: d.id, p_status: v }); if (v === "reported") await sb.from("reports").insert({ delivery_id: d.id, photo_id: id, reason: "wrong_match" }); }, msg);
        if (ok) closeSheet(); break;
      }
      case "block": { const b = new Set(settings().blocked); const was = b.has(id); was ? b.delete(id) : b.add(id); await setSettings({ blocked: [...b] }); toast(was ? "Unblocked" : "Blocked. You won't receive their photos."); if (S.sheet && S.sheet.type === "view") closeSheet(); break; }
      case "approve": await act(() => rpc("respond_delivery", { p_id: id, p_status: v }), v === "delivered" ? "Sent" : "Declined"); break;
      case "member": { if (v === "removed" && needConfirm(t, "m" + t.dataset.u, "Tap again")) return; await act(() => rpc("decide_member", { p_event: t.dataset.e, p_user: t.dataset.u, p_status: v }), v === "approved" ? "Approved" : "Removed"); break; }
      case "leave": { if (needConfirm(t, "leave", "Tap again to leave")) return; const ok = await act(() => rpc("leave_event", { p_event: id }), "You left the event"); if (ok) { logConsent("event", "left " + (S.events[id]?.name || "event")); closeSheet(); } break; }
      case "revoke": { if (needConfirm(t, "rv", "Tap again: the old code stops working")) return; await act(() => rpc("revoke_token", { p_event: id }), "New code issued. The old one no longer works."); break; }
      case "evstatus": { if (v === "ended" && needConfirm(t, "end", "Tap again to end")) return; await act(async () => { const { error } = await sb.from("events").update({ status: v }).eq("id", id); if (error) throw error; }, { paused: "Sharing paused", active: "Sharing on", ended: "Event ended" }[v]); break; }
      case "evdelete": { if (needConfirm(t, "del", "Tap again to delete for everyone")) return; const ok = await act(() => rpc("delete_event", { p_event: id }), "Event deleted"); if (ok) closeSheet(); break; }
      case "delphoto": { if (needConfirm(t, "dp", "Tap again to delete")) return; const ok = await act(() => deletePhoto(id), "Photo deleted"); if (ok) closeSheet(); break; }
      case "delface": { if (needConfirm(t, "df", "Tap again to delete")) return; await act(async () => { await rpc("delete_face_profile"); await logConsent("biometric", "deleted"); }, "Face profile deleted"); break; }
      case "strict": await setSettings({ strictness: k }); break;
      case "copy": copyText(v); break;
      case "scanqr": scanQR(); break;
      case "dojoin": doJoin(v); break;
      case "pickphotos": doUpload(); break;
      case "nuke": {
        if (needConfirm(t, "nuke", "Tap again to delete everything")) return;
        try { const mine = Object.values(S.photos).filter((p) => p.uploaderId === S.me.id).flatMap((p) => [p.path, p.thumb]); for (let i = 0; i < mine.length; i += 100) await sb.storage.from("photos").remove(mine.slice(i, i + 100)); await rpc("delete_my_account"); await sb.auth.signOut(); toast("Your account and data were deleted"); } catch (e) { toast(errMsg(e)); }
        break;
      }
    }
  });
  document.addEventListener("input", (ev) => { const t = ev.target; if (t.dataset && t.dataset.input === "q") { S.ui.q = t.value; clearTimeout(S._qt); S._qt = setTimeout(render, 150); } });
  document.addEventListener("change", (ev) => { const t = ev.target; if (t.id === "up-ev") { S.sheet.data.id = t.value; renderSheet(); } });
  document.addEventListener("submit", async (ev) => {
    ev.preventDefault(); const f = ev.target;
    if (f.id === "authForm") {
      const fd = new FormData(f); const email = String(fd.get("email")).trim(), password = String(fd.get("password"));
      const btn = $("#a-submit"); btn.disabled = true;
      let res;
      if (S.ui.authMode === "signup") res = await sb.auth.signUp({ email, password, options: { data: { full_name: String(fd.get("name") || "").trim() }, emailRedirectTo: location.origin } });
      else res = await sb.auth.signInWithPassword({ email, password });
      btn.disabled = false;
      if (res.error) return toast(/Invalid login/i.test(res.error.message) ? "Wrong email or password." : errMsg(res.error));
      if (S.ui.authMode === "signup" && !res.data.session) toast("Check your email to confirm your account, then sign in.");
      return;
    }
    if (f.id === "createForm") return submitCreate(f);
    if (f.id === "joinForm") return lookupToken($("#j-code").value);
    if (f.id === "albumForm") { const name = $("#al-name").value.trim(); if (!name) return; const ids = S.sheet.data.ids || []; const { data, error } = await sb.from("albums").insert({ name, photo_ids: ids }).select().single(); if (error) return toast(errMsg(error)); toast("Album created"); S.ui.select = false; S.ui.sel.clear(); if (!ids.length) S.ui.filter = "al:" + data.id; closeSheet(); refresh(); }
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && S.sheet) closeSheet(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.me) refresh(); });
  setInterval(() => { if (document.visibilityState === "visible" && S.me && !S.sheet?.type?.match(/upload|enroll/)) refresh(); }, 20000);
}

/* ---------- start ---------- */
let started = false;
export async function start() {
  if (started) return; started = true;
  if (!SUPABASE_URL || !SUPABASE_KEY) return renderError("The Supabase keys are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.");
  sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const j = new URLSearchParams(location.search).get("join"); if (j) { S.pendingJoin = j; history.replaceState(null, "", location.pathname); }
  bind();
  const { data } = await sb.auth.getSession();
  await onSession(data.session);
  sb.auth.onAuthStateChange((_e, session) => { if ((session && session.user.id) !== (S.session && S.session.user.id)) onSession(session); else S.session = session; });
}
async function onSession(session) {
  S.session = session;
  if (!session) { S.me = null; S.loaded = false; S.profile = null; closeSheetSilent(); render(); return; }
  const u = session.user; S.me = { id: u.id, name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || "" };
  S.loaded = false; render();
  await loadAll();
  if (S.pendingJoin && settings().onboarded) { const t = S.pendingJoin; S.pendingJoin = null; lookupToken(t); }
}
