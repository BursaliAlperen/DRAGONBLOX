const $ = selector => document.querySelector(selector);
const rarityColor = { Common: '#aeb7c2', Uncommon: '#50f09b', Rare: '#4db6ff', Epic: '#b56cff', Legendary: '#ffbe3d', Mythic: '#ff4d7d', Ascendant: '#95fff4', Celestial: '#fff6a8' };
const state = { user: null, catalog: null, tab: 'home', busy: false, adminToken: localStorage.rbxDracoAdminToken || '' };

const isFileMode = location.protocol === 'file:';
let simulationMode = false;
const simStoreKey = 'rbxdraco-sim-db-v2';

async function api(url, data, headers = {}) {
  if (simulationMode || isFileMode) return simApi(url, data);
  try {
    const response = await fetch(url, { method: data ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...headers }, body: data && JSON.stringify(data) });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'request_failed');
    return json;
  } catch (error) {
    simulationMode = true;
    toast('Backend bulunamadı; simülasyon modu açıldı', 'bad');
    return simApi(url, data);
  }
}
function asset(path) { return isFileMode ? String(path).replace(/^\//, '') : path; }
function format(n) { return Math.floor(n || 0).toLocaleString('tr-TR'); }
function toast(message, type = 'ok') { const item = document.createElement('b'); item.className = type; item.textContent = message; $('#toast').append(item); setTimeout(() => item.remove(), 4200); }
function dragon(id) { return state.catalog.dragons.find(item => item.id === id); }
function empty(text) { return `<div class="empty glass">${text}</div>`; }

async function boot() {
  try { const session = await api('/api/me'); Object.assign(state, { user: session.user, catalog: session.catalog }); }
  catch { state.catalog = (await api('/api/catalog')).catalog; }
  render();
  embers();
}

function simDb() {
  const fresh = { session: null, users: {}, withdrawals: {}, catalog: {
    currency: { id: 'draco', name: 'Draco Ember', icon: '✦' },
    dragons: [
      ['ember','Ember Whelp','Common',0,1,1,'red_dragon.png'],['verdant','Verdant Drake','Uncommon',180,2,2,'green_dragon.png'],['azure','Azure Wyvern','Rare',650,4,4,'blue_dragon.png'],['violet','Violet Runejaw','Epic',1800,7,8,'purple_dragon.png'],['solar','Solar Tyrant','Legendary',5000,11,15,'sun_dragon.png'],['shadow','Shadow Seraph','Mythic',11000,16,28,'shadow_dragon.png'],['phantom','Phantom Leviathan','Ascendant',26000,22,45,'phantom_dragon.png'],['cosmic','Cosmic Ancient','Celestial',62000,30,82,'cosmic_dragon.png']
    ].map(([id,name,rarity,cost,tier,yieldRate,img])=>({id,name,rarity,cost,tier,yieldRate,img})),
    eggs: [['cinder','Cinder Reliquary Egg','Common',35],['moss','Mossbound Relic Egg','Uncommon',110],['storm','Stormglass Egg','Rare',320],['eclipse','Eclipse Vault Egg','Epic',950],['star','Starforged Egg','Legendary',2800]].map(([id,name,rarity,cost])=>({id,name,rarity,cost,img:'egg_icon.png'})),
    sinks: [{id:'focus',name:'Forge Focus',cost:380,desc:'+15% claim focus stored for simulation.'},{id:'ward',name:'Vault Ward',cost:900,desc:'Payout review protection flag.'},{id:'sigil',name:'Celestial Sigil',cost:2200,desc:'Prestige burn sink.'}],
    quests: [{ id: 'daily-flame', name: 'Daily Flame Contract', reward: 75, cooldownMs: 86400000, minTier: 1 }, { id: 'vault-audit', name: 'Vault Audit Run', reward: 140, cooldownMs: 43200000, minTier: 3 }, { id: 'mythic-hunt', name: 'Mythic Hunt Board', reward: 420, cooldownMs: 86400000, minTier: 8 }], season: { name: 'Obsidian Season', milestones: [500,1500,4000,9000,18000] }, goals: { dailyBase: 180, dailyPerTier: 45, weekly: 1500 }, withdraw: { minimum: 20 }
  }};
  return JSON.parse(localStorage.getItem(simStoreKey) || JSON.stringify(fresh));
}
function saveSim(db) { localStorage.setItem(simStoreKey, JSON.stringify(db)); }
function simUser(email, name = email.split('@')[0]) {
  const db = simDb();
  db.users[email] ||= { id: email, email, role: email.includes('admin') ? 'admin' : 'player', profile: { name: name.slice(0, 18), tier: 1, xp: 0, daily: { day: new Date().toISOString().slice(0,10), earned: 0 }, weekly: { week: 'sim', earned: 0 } }, balances: { draco: 500, robux: 100 }, dragons: { ember: { id: 'ember', level: 1, unlockedAt: Date.now() } }, eggs: { cinder: 1 }, quests: {}, withdrawals: [], tx: [], flags: {} };
  db.session = email;
  saveSim(db);
  return db.users[email];
}
async function simApi(url, data = {}) {
  const db = simDb();
  const user = db.session && db.users[db.session];
  const reply = extra => ({ user, catalog: db.catalog, brand: 'RbxDraco', ...extra });
  if (url === '/api/catalog') return { catalog: db.catalog, brand: 'RbxDraco' };
  if (url === '/api/me') { if (!user) throw new Error('auth_required'); return reply(); }
  if (url === '/api/register' || url === '/api/login') return { user: simUser(String(data.email || 'demo@rbxdraco.local').toLowerCase()), catalog: db.catalog, brand: 'RbxDraco' };
  if (url === '/api/google') return { user: simUser(String(data.email || 'google@rbxdraco.local').toLowerCase(), data.name || 'Google Rider'), catalog: db.catalog, brand: 'RbxDraco' };
  if (url === '/api/logout') { db.session = null; saveSim(db); return { ok: true }; }
  if (!user) throw new Error('auth_required');
  if (url === '/api/claim') { const gain = 32; user.balances.draco += gain; user.profile.daily.earned += gain; user.profile.weekly.earned += gain; user.tx.unshift({ id: crypto.randomUUID?.() || String(Date.now()), at: Date.now(), type: 'Sim Draco Ember claim', delta: gain, meta: { simulation: true } }); saveSim(db); return reply({ gain }); }
  if (url === '/api/unlock-dragon') { const d = db.catalog.dragons.find(x => x.id === data.id); if (!d || user.dragons[d.id]) throw new Error('not_unlockable'); if (user.profile.tier < d.tier) throw new Error('tier_locked'); if (user.balances.draco < d.cost) throw new Error('insufficient_draco'); user.balances.draco -= d.cost; user.dragons[d.id] = { id: d.id, level: 1, unlockedAt: Date.now() }; user.tx.unshift({ at: Date.now(), type: 'Sim Dragon forged', delta: -d.cost, meta: { dragon: d.id } }); saveSim(db); return reply(); }
  if (url === '/api/upgrade-dragon') { const d = user.dragons[data.id]; if (!d) throw new Error('dragon_not_owned'); const cost = Math.ceil(100 + Math.pow(d.level + 1, 2.1) * 30); if (user.balances.draco < cost) throw new Error('insufficient_draco'); user.balances.draco -= cost; d.level += 1; user.tx.unshift({ at: Date.now(), type: 'Sim Dragon mastery upgrade', delta: -cost, meta: { dragon: data.id, level: d.level } }); saveSim(db); return reply(); }
  if (url === '/api/complete-quest') { const q = db.catalog.quests.find(x => x.id === data.id); if (!q) throw new Error('unknown_quest'); user.quests ||= {}; if (user.profile.tier < q.minTier) throw new Error('quest_tier_locked'); const reward = q.reward; user.balances.draco += reward; user.profile.xp += reward; user.profile.weekly.earned += reward; user.quests[q.id] = { at: Date.now(), reward }; user.tx.unshift({ at: Date.now(), type: 'Sim Quest contract completed', delta: reward, meta: { quest: q.id } }); saveSim(db); return reply({ reward }); }
  if (url === '/api/leaderboard') return { rows: Object.values(db.users).map(u => ({ name: u.profile.name, tier: u.profile.tier, draco: u.balances.draco, dragons: Object.keys(u.dragons).length, eggs: Object.values(u.eggs).reduce((a,b)=>a+b,0) })).sort((a,b)=>b.tier-a.tier || b.draco-a.draco) };
  if (url === '/api/buy-egg') { const e = db.catalog.eggs.find(x => x.id === data.id); if (!e || user.balances.draco < e.cost) throw new Error('insufficient_draco'); user.balances.draco -= e.cost; user.eggs[e.id] = (user.eggs[e.id] || 0) + 1; user.tx.unshift({ at: Date.now(), type: 'Sim Egg vaulted', delta: -e.cost, meta: { egg: e.id } }); saveSim(db); return reply(); }
  if (url === '/api/sink') { const sink = db.catalog.sinks.find(x => x.id === data.id); if (!sink || user.balances.draco < sink.cost) throw new Error('insufficient_draco'); user.balances.draco -= sink.cost; user.flags[sink.id] = (user.flags[sink.id] || 0) + 1; user.tx.unshift({ at: Date.now(), type: 'Sim Sink burned', delta: -sink.cost, meta: { sink: sink.id } }); saveSim(db); return reply(); }
  if (url === '/api/withdraw') { const amount = Math.floor(Number(data.amount)); if (amount < 20 || user.balances.robux < amount) throw new Error('invalid_withdrawal'); const w = { id: String(Date.now()), email: user.email, amount, state: 'pending', at: Date.now() }; db.withdrawals[w.id] = w; user.withdrawals.unshift(w.id); user.balances.robux -= amount; user.tx.unshift({ at: Date.now(), type: 'Sim Withdrawal pending', delta: -amount, meta: { id: w.id } }); saveSim(db); return reply({ withdrawal: w }); }
  if (url === '/api/admin') return { users: Object.values(db.users), withdrawals: Object.values(db.withdrawals), audit: [{ at: Date.now(), admin: 'simulation', action: 'local_dashboard' }] };
  if (url === '/api/admin/review') { const w = db.withdrawals[data.id]; if (w) w.state = data.approve ? 'approved' : 'rejected'; saveSim(db); return { ok: true }; }
  if (url === '/api/admin/grant') { const target = Object.values(db.users).find(u => u.id === data.uid); if (target) target.balances.draco += Number(data.amount || 0); saveSim(db); return { user: target }; }
  throw new Error('sim_not_found');
}
async function googleLogin() {
  const email = prompt('Google hesabı simülasyonu için email gir:', 'google@rbxdraco.local');
  if (!email) return;
  try { const res = await api('/api/google', { email, name: email.split('@')[0], credential: 'simulated-google-button' }); Object.assign(state, { user: res.user, catalog: res.catalog }); toast('Google ile devam edildi'); render(); } catch (e) { toast(e.message, 'bad'); }
}

function render() {
  if (!state.user) return renderAuth();
  const user = state.user;
  $('#app').innerHTML = `<aside class="rail">
    <div class="brand"><img src="${asset('/cosmic_dragon.png')}" alt="RbxDraco"><h1>RbxDraco</h1><span>Secure Dragon Nexus</span></div>
    ${[['home', 'Dashboard'], ['dragons', 'Dragon Vault'], ['eggs', 'Egg Vault'], ['forge', 'Forge / Sinks'], ['quests', 'Quest Hub'], ['leaderboard', 'Leaderboard'], ['withdraw', 'Robux Desk'], ['history', 'Ledger'], ['admin', 'Admin']].map(([id, label]) => `<button class="nav ${state.tab === id ? 'on' : ''}" onclick="go('${id}')">${label}</button>`).join('')}
    <button class="nav ghost" onclick="logout()">Çıkış</button>
  </aside>
  <main class="shell">
    <header class="top glass"><div><p class="eyebrow">RbxDraco Premium Companion</p><h2>${user.profile.name}</h2></div><div class="balances"><b>✦ ${format(user.balances.draco)} Draco Ember</b><b>R$ ${format(user.balances.robux)}</b><b>Tier ${user.profile.tier}</b></div></header>
    <section class="view">${views[state.tab]()}</section>
  </main>`;
}
function renderAuth() {
  $('#app').innerHTML = `<section class="auth glass">
    <p class="eyebrow">Backend + Frontend Ayrı • Render Ready</p><h1>RbxDraco</h1>
    <p>TaskPoint yerine <b>Draco Ember</b> kullanan, server-authoritative dragon ekonomisine giriş yap. Şifreler PBKDF2 ile hashlenir; oturum HttpOnly cookie ile saklanır.</p>
    <input id="email" autocomplete="email" placeholder="email" />
    <input id="password" type="password" autocomplete="current-password" placeholder="şifre (min 8 karakter)" />
    <div class="row"><button onclick="login('/api/login')">Giriş Yap</button><button onclick="login('/api/register')">Kayıt Ol</button></div><button class="google" onclick="googleLogin()">Google ile devam et</button>
    <small>Backend yoksa local simülasyon devreye girer; gerçek deployment'ta ekonomi, Game Pass ve admin kararları backend tarafından doğrulanır.</small>
  </section>`;
}
async function login(endpoint) { try { const res = await api(endpoint, { email: $('#email').value, password: $('#password').value }); Object.assign(state, { user: res.user, catalog: res.catalog }); toast('RbxDraco Nexus açıldı'); render(); } catch (e) { toast(e.message, 'bad'); } }
async function logout() { await api('/api/logout', {}); state.user = null; render(); }
function go(tab) { state.tab = tab; render(); }

const views = {
  home() {
    const user = state.user;
    const power = Object.values(user.dragons).reduce((sum, item) => sum + (dragon(item.id)?.yieldRate || 0) * item.level, 0);
    const dailyCap = state.catalog.goals.dailyBase + user.profile.tier * state.catalog.goals.dailyPerTier;
    return `<div class="hero glass"><div><p class="eyebrow">AAA Economy Command</p><h1>Draco Ember kıt, değerli ve tamamen backend kontrollü.</h1><p>Dragon acquisition yalnızca forge/unlock sistemiyle olur. Egg inventory bağımsızdır; egg hiçbir zaman dragon'a çevrilmez, trade edilmez veya dönüştürülmez.</p><button onclick="act('/api/claim')">Claim Draco Ember</button></div><img src="${asset('/shadow_dragon.png')}" alt="Shadow dragon"></div>
    <div class="cards"><article class="stat glass"><span>Dragon Power</span><b>${format(power)}/claim</b><progress value="${user.profile.daily.earned}" max="${dailyCap}"></progress><small>Daily cap: ${format(user.profile.daily.earned)} / ${format(dailyCap)}</small></article><article class="stat glass"><span>Weekly Goal</span><b>${format(user.profile.weekly.earned)} / ${format(state.catalog.goals.weekly)}</b><progress value="${user.profile.weekly.earned}" max="${state.catalog.goals.weekly}"></progress><small>Optional weekly goal; not mandatory grind.</small></article><article class="stat glass"><span>Security</span><b>Server-side</b><small>Rate limits, balance checks, duplicate withdrawal protection, admin audit logging.</small></article></div>
    <h3>Legendary Showcase</h3><div class="grid">${state.catalog.dragons.slice(-4).map(dragonCard).join('')}</div><section class="loot-strip glass"><b>Obsidian Season</b><span>Milestones: ${state.catalog.season?.milestones?.map(format).join(' ✦ ') || 'live'}</span><button onclick="go('quests')">Open Quest Hub</button></section>`;
  },
  dragons() { return `<h2>Dragon Vault</h2><p class="muted">Rarity, tier, price and unlock rules are supplied by the backend catalog.</p><div class="grid">${state.catalog.dragons.map(dragonCard).join('')}</div>`; },
  eggs() { return `<h2>Independent Egg Vault</h2><p class="muted">Eggs are persistent collectibles with their own inventory. They never mint dragons.</p><div class="grid">${state.catalog.eggs.map(egg => `<article class="card glass"><img src="${asset(egg.img)}" alt="${egg.name}"><i style="color:${rarityColor[egg.rarity]}">${egg.rarity}</i><h3>${egg.name}</h3><p>Owned: ${state.user.eggs[egg.id] || 0}</p><b>✦ ${format(egg.cost)}</b><button onclick="act('/api/buy-egg',{id:'${egg.id}'})">Vault Egg</button></article>`).join('')}</div>`; },
  quests() { return `<h2>Quest Hub</h2><p class="muted">Gemsloot hissi: net ödüller, cooldown mantığı, şeffaf CTA ve server-side doğrulama. Para ile kumar yok; sadece progression görevleri.</p><div class="grid">${state.catalog.quests.map(q => `<article class="card glass"><h3>${q.name}</h3><i>Tier ${q.minTier}+</i><p>Reward: ✦ ${format(q.reward)} Draco Ember</p><b>${state.user.quests?.[q.id] ? 'Completed' : 'Ready'}</b><button onclick="act('/api/complete-quest',{id:'${q.id}'})">Complete Contract</button></article>`).join('')}</div>`; },
  leaderboard() { loadLeaderboard(); return `<h2>Leaderboard</h2><p class="muted">Live prestige board based on server/simulation data.</p><div id="leaderboard" class="ledger">${empty('Loading leaderboard…')}</div>`; },
  forge() { return `<h2>Forge Progression + Economic Sinks</h2><div class="split"><section><h3>Dragon Unlocks</h3><div class="grid slim">${state.catalog.dragons.map(dragonCard).join('')}</div></section><section><h3>Draco Ember Sinks</h3>${state.catalog.sinks.map(sink => `<article class="sink glass"><b>${sink.name}</b><p>${sink.desc}</p><button onclick="act('/api/sink',{id:'${sink.id}'})">Burn ✦ ${format(sink.cost)}</button></article>`).join('')}</section></div>`; },
  withdraw() { return `<div class="withdraw glass"><p class="eyebrow">Robux Withdrawal GUI</p><h2>Secure Payout Desk</h2><p>Minimum <b>20 Robux</b>. Backend validates balance, cooldown, duplicate requests, Game Pass host/details/signature, and admin review state. Never trust client-submitted values.</p><div class="steps"><b>1 Balance</b><b>2 Game Pass</b><b>3 Pending</b><b>4 Admin Review</b></div><input id="wamt" type="number" min="20" placeholder="Amount, min 20"><input id="wurl" placeholder="Roblox Game Pass URL"><button onclick="withdraw()">Submit Secure Request</button><small>Production: replace local signature verifier with Roblox Open Cloud details/ownership lookup in backend only.</small></div>${withdrawList()}`; },
  history() { return `<h2>Transaction Ledger</h2><div class="ledger">${state.user.tx.map(tx => `<article class="glass"><b>${tx.type}</b><span>${new Date(tx.at).toLocaleString()} • ${tx.delta > 0 ? '+' : ''}${format(tx.delta)}</span><code>${JSON.stringify(tx.meta)}</code></article>`).join('') || empty('No transactions yet')}</div>`; },
  admin() { return `<h2>Admin Backend Dashboard</h2><div class="adminbar glass"><input id="atok" placeholder="Admin token" value="${state.adminToken}"><button onclick="adminLoad()">Secure Admin Login</button></div><div id="adminout" class="muted">Admin APIs require role=admin or x-admin-token. Use this panel for player lookup, economy inspection, withdrawal review and audit logs.</div>`; }
};
function dragonCard(item) { const owned = state.user.dragons[item.id]; const locked = state.user.profile.tier < item.tier; return `<article class="card glass ${owned ? 'owned' : ''}"><img src="${asset(item.img)}" alt="${item.name}"><i style="color:${rarityColor[item.rarity]}">${item.rarity}</i><h3>${item.name}</h3><p>Tier ${item.tier} • Yield ${item.yieldRate}</p><b>${owned ? `Owned Lv ${owned.level}` : `✦ ${format(item.cost)}`}</b>${owned ? `<button onclick="act('/api/upgrade-dragon',{id:'${item.id}'})">Upgrade Mastery</button>` : ''}<button ${owned || locked ? 'disabled' : ''} onclick="act('/api/unlock-dragon',{id:'${item.id}'})">${owned ? 'Unlocked' : locked ? 'Tier Locked' : 'Forge Dragon'}</button></article>`; }
function withdrawList() { return `<h3>Withdrawal Requests</h3><div class="ledger">${state.user.withdrawals.map(w => `<article class="glass"><b>R$ ${w.amount}</b><span class="pill ${w.state}">${w.state}</span><small>${new Date(w.at).toLocaleString()}</small></article>`).join('') || empty('No withdrawals')}</div>`; }
async function act(url, data = {}) { if (state.busy) return; state.busy = true; try { const res = await api(url, data); state.user = res.user; toast(res.gain ? `+${res.gain} Draco Ember` : 'Success'); render(); } catch (e) { toast(e.message, 'bad'); } finally { state.busy = false; } }
async function withdraw() { await act('/api/withdraw', { amount: $('#wamt').value, gamepassUrl: $('#wurl').value }); }
async function loadLeaderboard() { try { const res = await api('/api/leaderboard'); const el = $('#leaderboard'); if (el) el.innerHTML = res.rows.map((r, i) => `<article class="glass"><b>#${i + 1} ${r.name}</b><span>Tier ${r.tier} • ✦ ${format(r.draco)} • Dragons ${r.dragons} • Eggs ${r.eggs}</span></article>`).join('') || empty('No players yet'); } catch (e) { toast(e.message, 'bad'); } }
async function adminLoad() { try { state.adminToken = $('#atok').value; localStorage.rbxDracoAdminToken = state.adminToken; const res = await api('/api/admin', null, { 'x-admin-token': state.adminToken }); $('#adminout').innerHTML = `<div class="split"><section><h3>Players</h3>${res.users.map(u => `<article class="glass admin-card"><b>${u.email}</b><p>✦ ${format(u.balances.draco)} • R$ ${format(u.balances.robux)} • Dragons ${Object.keys(u.dragons).length} • Eggs ${Object.keys(u.eggs).length}</p><button onclick="grant('${u.id}',100)">Grant +100 Draco</button><button onclick="grant('${u.id}',-100)">Remove -100 Draco</button></article>`).join('')}</section><section><h3>Withdrawals</h3>${res.withdrawals.map(w => `<article class="glass admin-card"><b>${w.email} • R$${w.amount}</b><p>${w.state}</p><button onclick="review('${w.id}',true)">Approve</button><button onclick="review('${w.id}',false)">Reject + Refund</button></article>`).join('') || empty('No requests')}<h3>Audit</h3>${res.audit.map(a => `<code>${new Date(a.at).toLocaleString()} ${a.admin} ${a.action} ${a.state || a.amount || ''}</code>`).join('<br>')}</section></div>`; } catch (e) { toast(e.message, 'bad'); } }
async function review(id, approve) { await api('/api/admin/review', { id, approve, reason: approve ? 'approved' : 'policy_reject' }, { 'x-admin-token': state.adminToken }); toast('Review saved'); adminLoad(); }
async function grant(uid, amount) { await api('/api/admin/grant', { uid, amount }, { 'x-admin-token': state.adminToken }); toast('Economy updated'); adminLoad(); }
function embers() { const canvas = $('#embers'); const ctx = canvas.getContext('2d'); const particles = []; const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; }; addEventListener('resize', resize); resize(); for (let i = 0; i < 120; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2.2 + .6, v: Math.random() * .9 + .18 }); setInterval(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.y -= p.v; if (p.y < -4) p.y = canvas.height + 4; ctx.fillStyle = 'rgba(255,145,54,.48)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }); }, 33); }

Object.assign(window, { go, login, logout, googleLogin, act, withdraw, loadLeaderboard, adminLoad, review, grant });
boot();
