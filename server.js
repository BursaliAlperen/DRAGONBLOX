'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const FRONTEND = path.join(ROOT, 'frontend');
const DB_FILE = process.env.DB_FILE || path.join(ROOT, 'db.json');
const PORT = Number(process.env.PORT || 3000);
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ADMIN_TOKEN_HASH = process.env.ADMIN_TOKEN_HASH || sha256(process.env.ADMIN_TOKEN || 'rbxdraco-local-admin-token');
const GAMEPASS_SECRET = process.env.GAMEPASS_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7;
const MAX_BODY = 20_000;

const dragonArt = {
  ember: '/red_dragon.png', verdant: '/green_dragon.png', azure: '/blue_dragon.png', violet: '/purple_dragon.png',
  solar: '/sun_dragon.png', shadow: '/shadow_dragon.png', phantom: '/phantom_dragon.png', cosmic: '/cosmic_dragon.png', gold: '/gold_dragon.png'
};

const catalog = Object.freeze({
  currency: { id: 'draco', name: 'Draco Ember', icon: '✦', lore: 'Scarce progression fire used to bind dragons through the RbxDraco forge.' },
  dragons: [
    ['ember', 'Ember Whelp', 'Common', 0, 1, 1, dragonArt.ember], ['verdant', 'Verdant Drake', 'Uncommon', 180, 2, 2, dragonArt.verdant],
    ['azure', 'Azure Wyvern', 'Rare', 650, 4, 4, dragonArt.azure], ['violet', 'Violet Runejaw', 'Epic', 1800, 7, 8, dragonArt.violet],
    ['solar', 'Solar Tyrant', 'Legendary', 5000, 11, 15, dragonArt.solar], ['shadow', 'Shadow Seraph', 'Mythic', 11000, 16, 28, dragonArt.shadow],
    ['phantom', 'Phantom Leviathan', 'Ascendant', 26000, 22, 45, dragonArt.phantom], ['cosmic', 'Cosmic Ancient', 'Celestial', 62000, 30, 82, dragonArt.cosmic]
  ].map(([id, name, rarity, cost, tier, yieldRate, img]) => ({ id, name, rarity, cost, tier, yieldRate, img })),
  eggs: [
    ['cinder', 'Cinder Reliquary Egg', 'Common', 35], ['moss', 'Mossbound Relic Egg', 'Uncommon', 110],
    ['storm', 'Stormglass Egg', 'Rare', 320], ['eclipse', 'Eclipse Vault Egg', 'Epic', 950], ['star', 'Starforged Egg', 'Legendary', 2800]
  ].map(([id, name, rarity, cost]) => ({ id, name, rarity, cost, img: '/egg_icon.png' })),
  sinks: [
    { id: 'focus', name: 'Forge Focus', cost: 380, desc: '+15% claim focus stored server-side for the next forge cycle.' },
    { id: 'ward', name: 'Vault Ward', cost: 900, desc: 'Adds an account ward flag and audit note for payout reviews.' },
    { id: 'sigil', name: 'Celestial Sigil', cost: 2200, desc: 'Prestige burn that removes Draco Ember from circulation.' }
  ],
  quests: [
    { id: 'daily-flame', name: 'Daily Flame Contract', reward: 75, cooldownMs: 86_400_000, minTier: 1 },
    { id: 'vault-audit', name: 'Vault Audit Run', reward: 140, cooldownMs: 43_200_000, minTier: 3 },
    { id: 'mythic-hunt', name: 'Mythic Hunt Board', reward: 420, cooldownMs: 86_400_000, minTier: 8 }
  ],
  season: { name: 'Obsidian Season', passFree: true, milestones: [500, 1500, 4000, 9000, 18000] },
  goals: { dailyBase: 180, dailyPerTier: 45, weekly: 1500 },
  withdraw: { minimum: 20, cooldownMs: 86_400_000, states: ['pending', 'approved', 'rejected'] }
});

let db = loadDb();
setInterval(() => saveDb(), 30_000).unref();

function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function safeEqual(a, b) { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }
function rid() { return crypto.randomBytes(18).toString('hex'); }
function now() { return Date.now(); }
function today() { return new Date().toISOString().slice(0, 10); }
function weekKey() { const d = new Date(); const y = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-W${Math.ceil((((d - y) / 86400000) + y.getDay() + 1) / 7)}`; }
function loadDb() { try { return fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : freshDb(); } catch { return freshDb(); } }
function freshDb() { return { users: {}, sessions: {}, withdrawals: {}, audit: [], ipHits: {} }; }
function saveDb() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function passHash(password, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.pbkdf2Sync(String(password), salt, 210000, 32, 'sha256').toString('hex')}`; }
function validPass(password, stored) { const [salt, hash] = String(stored || '').split(':'); return !!salt && safeEqual(passHash(password, salt).split(':')[1], hash); }

function makeUser(uid, email) {
  return db.users[uid] ||= {
    id: uid, email, role: 'player', createdAt: now(),
    profile: { name: email.split('@')[0].slice(0, 18), tier: 1, xp: 0, daily: { day: '', earned: 0 }, weekly: { week: '', earned: 0 } },
    balances: { draco: 80, robux: 0 },
    dragons: { ember: { id: 'ember', level: 1, unlockedAt: now() } },
    eggs: { cinder: 1 }, quests: {}, withdrawals: [], tx: [], limits: {}, flags: {}, security: { failedLogins: 0 }
  };
}
function publicUser(u) { return { id: u.id, email: u.email, role: u.role, profile: u.profile, balances: u.balances, dragons: u.dragons, eggs: u.eggs, quests: u.quests || {}, withdrawals: u.withdrawals.map(id => db.withdrawals[id]).filter(Boolean), tx: u.tx.slice(0, 80), flags: u.flags }; }
function addTx(u, type, delta, meta = {}) { u.tx.unshift({ id: rid(), at: now(), type, delta, meta }); u.tx = u.tx.slice(0, 100); }
function userLimit(u, key, ms) { const last = u.limits[key] || 0; if (now() - last < ms) throw httpError(429, 'rate_limited'); u.limits[key] = now(); }
function ipLimit(req, key, max, ms) { const ip = req.socket.remoteAddress || 'local'; const id = `${ip}:${key}`; const hit = db.ipHits[id] || { at: now(), count: 0 }; if (now() - hit.at > ms) { hit.at = now(); hit.count = 0; } if (++hit.count > max) throw httpError(429, 'too_many_requests'); db.ipHits[id] = hit; }
function httpError(code, message) { const e = new Error(message); e.code = code; return e; }

function sessionUser(req) {
  const sid = (req.headers.cookie || '').match(/(?:^|; )sid=([a-f0-9]+)/)?.[1];
  const s = sid && db.sessions[sid];
  if (!s || now() - s.at > SESSION_TTL) return null;
  s.at = now();
  return db.users[s.uid] || null;
}
function verifyOrigin(req) {
  if (req.method === 'GET') return;
  const origin = req.headers.origin;
  if (origin && origin.replace(/\/$/, '') !== APP_URL) throw httpError(403, 'bad_origin');
}
function requireAdmin(req, user) {
  const token = req.headers['x-admin-token'] || '';
  if (user?.role === 'admin') return true;
  if (token && safeEqual(sha256(token), ADMIN_TOKEN_HASH)) return true;
  throw httpError(403, 'admin_forbidden');
}
function verifyGamePass(url, amount, email) {
  const parsed = new URL(String(url));
  if (!['www.roblox.com', 'roblox.com', 'create.roblox.com', 'localhost'].includes(parsed.hostname)) return false;
  const pass = parsed.searchParams.get('pass') || parsed.pathname.match(/game-passes\/(\d+)/)?.[1] || parsed.pathname.split('/').filter(Boolean).pop();
  const price = Number(parsed.searchParams.get('price'));
  const sig = parsed.searchParams.get('sig') || '';
  const expected = sha256(`${pass}:${price}:${email}:${GAMEPASS_SECRET}`).slice(0, 24);
  return Boolean(pass) && price === amount && safeEqual(sig, expected);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > MAX_BODY) reject(httpError(413, 'payload_too_large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(httpError(400, 'invalid_json')); } });
  });
}
function send(res, code, data, cookie) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin', 'content-security-policy': "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'",
    ...(cookie ? { 'set-cookie': cookie } : {})
  });
  res.end(JSON.stringify(data));
}

async function api(req, res) {
  try {
    ipLimit(req, 'api', 240, 60_000);
    verifyOrigin(req);
    const body = req.method === 'POST' ? await readJson(req) : {};
    const user = sessionUser(req);
    if (req.url === '/api/catalog') return send(res, 200, { catalog, brand: 'RbxDraco' });
    if (req.url === '/api/register' || req.url === '/api/login') return auth(req, res, body);
    if (req.url === '/api/google') return googleAuth(req, res, body);
    if (req.url === '/api/logout') return logout(req, res);
    if (!user) throw httpError(401, 'auth_required');
    if (req.url === '/api/me') return send(res, 200, { user: publicUser(user), catalog, brand: 'RbxDraco' });
    if (req.url === '/api/claim') return claim(res, user);
    if (req.url === '/api/unlock-dragon') return unlockDragon(res, user, body.id);
    if (req.url === '/api/upgrade-dragon') return upgradeDragon(res, user, body.id);
    if (req.url === '/api/complete-quest') return completeQuest(res, user, body.id);
    if (req.url === '/api/leaderboard') return leaderboard(res);
    if (req.url === '/api/buy-egg') return buyEgg(res, user, body.id);
    if (req.url === '/api/sink') return buySink(res, user, body.id);
    if (req.url === '/api/withdraw') return withdraw(res, user, body);
    if (req.url.startsWith('/api/admin')) return admin(req, res, user, body);
    throw httpError(404, 'not_found');
  } catch (e) {
    send(res, e.code || 500, { error: e.message || 'server_error' });
  }
}

function auth(req, res, body) {
  ipLimit(req, 'auth', 20, 60_000);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 96) throw httpError(400, 'invalid_credentials');
  const uid = sha256(`rbxdraco:${email}`).slice(0, 28);
  const user = makeUser(uid, email);
  if (req.url === '/api/register' && user.passwordHash) throw httpError(409, 'account_exists');
  if (!user.passwordHash) user.passwordHash = passHash(password);
  if (!validPass(password, user.passwordHash)) { user.security.failedLogins++; throw httpError(401, 'wrong_password'); }
  user.security.failedLogins = 0;
  const sid = rid();
  db.sessions[sid] = { uid, at: now(), ua: sha256(req.headers['user-agent'] || '') };
  addTx(user, 'Secure session opened', 0, { ip: sha256(req.socket.remoteAddress || '') });
  saveDb();
  send(res, 200, { user: publicUser(user), catalog, brand: 'RbxDraco' }, `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}`);
}

function googleAuth(req, res, body) {
  ipLimit(req, 'google_auth', 20, 60_000);
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || email.split('@')[0] || 'Google Rider').slice(0, 18);
  const credential = String(body.credential || 'simulation');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'invalid_google_email');
  // Production note: verify Google Identity Services JWT here using Google's certs before trusting email/profile.
  const uid = sha256(`rbxdraco:google:${email}`).slice(0, 28);
  const user = makeUser(uid, email);
  user.profile.name = name;
  user.security.googleLinked = true;
  user.security.googleCredentialHash = sha256(credential).slice(0, 18);
  const sid = rid();
  db.sessions[sid] = { uid, at: now(), provider: 'google', ua: sha256(req.headers['user-agent'] || '') };
  addTx(user, 'Google session opened', 0, { provider: 'google' });
  saveDb();
  send(res, 200, { user: publicUser(user), catalog, brand: 'RbxDraco' }, `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}`);
}

function logout(req, res) {
  const sid = (req.headers.cookie || '').match(/(?:^|; )sid=([a-f0-9]+)/)?.[1];
  if (sid) delete db.sessions[sid];
  saveDb();
  send(res, 200, { ok: true }, 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}
function claim(res, user) {
  userLimit(user, 'claim', 25_000);
  const dailyKey = today();
  const weekly = weekKey();
  if (user.profile.daily.day !== dailyKey) user.profile.daily = { day: dailyKey, earned: 0 };
  if (user.profile.weekly.week !== weekly) user.profile.weekly = { week: weekly, earned: 0 };
  const power = Object.values(user.dragons).reduce((sum, owned) => sum + (catalog.dragons.find(d => d.id === owned.id)?.yieldRate || 0) * owned.level, 0);
  const cap = catalog.goals.dailyBase + user.profile.tier * catalog.goals.dailyPerTier;
  const raw = 10 + power + Math.floor(user.profile.tier / 2);
  const gain = Math.max(0, Math.min(raw, cap - user.profile.daily.earned));
  user.balances.draco += gain;
  user.profile.xp += gain;
  user.profile.tier = Math.max(user.profile.tier, Math.floor(user.profile.xp / 550) + 1);
  user.profile.daily.earned += gain;
  user.profile.weekly.earned += gain;
  addTx(user, 'Draco Ember claim', gain, { cap, power });
  saveDb();
  send(res, 200, { user: publicUser(user), gain });
}
function unlockDragon(res, user, dragonId) {
  userLimit(user, 'unlock', 2_000);
  const dragon = catalog.dragons.find(d => d.id === String(dragonId));
  if (!dragon) throw httpError(400, 'unknown_dragon');
  if (user.dragons[dragon.id]) throw httpError(409, 'already_unlocked');
  if (user.profile.tier < dragon.tier) throw httpError(403, 'tier_locked');
  if (user.balances.draco < dragon.cost) throw httpError(400, 'insufficient_draco');
  user.balances.draco -= dragon.cost;
  user.dragons[dragon.id] = { id: dragon.id, level: 1, unlockedAt: now() };
  addTx(user, 'Dragon forged', -dragon.cost, { dragon: dragon.id, rarity: dragon.rarity });
  saveDb();
  send(res, 200, { user: publicUser(user) });
}

function upgradeDragon(res, user, dragonId) {
  userLimit(user, 'upgrade', 2_000);
  const owned = user.dragons[String(dragonId)];
  const dragon = owned && catalog.dragons.find(d => d.id === owned.id);
  if (!owned || !dragon) throw httpError(400, 'dragon_not_owned');
  if (owned.level >= 25) throw httpError(400, 'max_level');
  const cost = Math.ceil((dragon.cost || 120) * 0.24 + Math.pow(owned.level + 1, 2.15) * 34);
  if (user.balances.draco < cost) throw httpError(400, 'insufficient_draco');
  user.balances.draco -= cost;
  owned.level += 1;
  addTx(user, 'Dragon mastery upgrade', -cost, { dragon: dragon.id, level: owned.level });
  saveDb();
  send(res, 200, { user: publicUser(user), cost });
}
function completeQuest(res, user, questId) {
  userLimit(user, 'quest', 2_000);
  user.quests ||= {};
  const quest = catalog.quests.find(q => q.id === String(questId));
  if (!quest) throw httpError(400, 'unknown_quest');
  if (user.profile.tier < quest.minTier) throw httpError(403, 'quest_tier_locked');
  const last = user.quests[quest.id]?.at || 0;
  if (now() - last < quest.cooldownMs) throw httpError(429, 'quest_cooldown');
  const reward = quest.reward + Math.floor(user.profile.tier * 3);
  user.quests[quest.id] = { at: now(), reward };
  user.balances.draco += reward;
  user.profile.xp += reward;
  user.profile.weekly.earned += reward;
  user.profile.tier = Math.max(user.profile.tier, Math.floor(user.profile.xp / 550) + 1);
  addTx(user, 'Quest contract completed', reward, { quest: quest.id });
  saveDb();
  send(res, 200, { user: publicUser(user), reward });
}
function leaderboard(res) {
  const rows = Object.values(db.users).map(u => ({ name: u.profile.name, tier: u.profile.tier, draco: u.balances.draco, dragons: Object.keys(u.dragons).length, eggs: Object.values(u.eggs).reduce((a, b) => a + b, 0) })).sort((a, b) => (b.tier - a.tier) || (b.draco - a.draco)).slice(0, 20);
  send(res, 200, { rows });
}

function buyEgg(res, user, eggId) {
  userLimit(user, 'egg', 2_000);
  const egg = catalog.eggs.find(e => e.id === String(eggId));
  if (!egg) throw httpError(400, 'unknown_egg');
  if (user.balances.draco < egg.cost) throw httpError(400, 'insufficient_draco');
  user.balances.draco -= egg.cost;
  user.eggs[egg.id] = (user.eggs[egg.id] || 0) + 1;
  addTx(user, 'Egg vaulted', -egg.cost, { egg: egg.id, note: 'Eggs are independent collectibles, not dragon transforms.' });
  saveDb();
  send(res, 200, { user: publicUser(user) });
}
function buySink(res, user, sinkId) {
  const sink = catalog.sinks.find(s => s.id === String(sinkId));
  if (!sink) throw httpError(400, 'unknown_sink');
  if (user.balances.draco < sink.cost) throw httpError(400, 'insufficient_draco');
  user.balances.draco -= sink.cost;
  user.flags[sink.id] = (user.flags[sink.id] || 0) + 1;
  addTx(user, 'Economy sink burned', -sink.cost, { sink: sink.id });
  saveDb();
  send(res, 200, { user: publicUser(user) });
}
function withdraw(res, user, body) {
  userLimit(user, 'withdraw_attempt', 10_000);
  const amount = Math.floor(Number(body.amount));
  if (!Number.isFinite(amount) || amount < catalog.withdraw.minimum || amount > 100_000) throw httpError(400, 'invalid_withdraw_amount');
  if (user.balances.robux < amount) throw httpError(400, 'insufficient_robux');
  const duplicate = Object.values(db.withdrawals).find(w => w.uid === user.id && ['pending', 'approved'].includes(w.state) && now() - w.at < catalog.withdraw.cooldownMs);
  if (duplicate) throw httpError(409, 'cooldown_or_duplicate_request');
  if (!verifyGamePass(body.gamepassUrl, amount, user.email)) throw httpError(400, 'gamepass_validation_failed');
  const wid = rid();
  db.withdrawals[wid] = { id: wid, uid: user.id, email: user.email, amount, state: 'pending', gamepassUrl: String(body.gamepassUrl).slice(0, 300), at: now(), reviewedAt: null, risk: { ward: !!user.flags.ward, ipHash: 'server-side' } };
  user.balances.robux -= amount;
  user.withdrawals.unshift(wid);
  addTx(user, 'Withdrawal pending review', -amount, { wid, state: 'pending' });
  saveDb();
  send(res, 200, { user: publicUser(user), withdrawal: db.withdrawals[wid] });
}
function admin(req, res, user, body) {
  requireAdmin(req, user);
  if (req.url === '/api/admin') return send(res, 200, { users: Object.values(db.users).map(publicUser), withdrawals: Object.values(db.withdrawals), audit: db.audit.slice(-100) });
  if (req.url === '/api/admin/review') {
    const w = db.withdrawals[String(body.id)];
    const target = w && db.users[w.uid];
    if (!w || !target || w.state !== 'pending') throw httpError(400, 'invalid_withdrawal');
    w.state = body.approve ? 'approved' : 'rejected';
    w.reason = String(body.reason || '').slice(0, 120);
    w.reviewedAt = now();
    if (!body.approve) { target.balances.robux += w.amount; addTx(target, 'Withdrawal rejected refund', w.amount, { wid: w.id }); }
    db.audit.push({ at: now(), admin: user.email, action: 'withdrawal_review', wid: w.id, state: w.state });
    saveDb();
    return send(res, 200, { ok: true, withdrawal: w });
  }
  if (req.url === '/api/admin/grant') {
    const target = db.users[String(body.uid)];
    const amount = Math.floor(Number(body.amount));
    if (!target || !Number.isFinite(amount) || Math.abs(amount) > 50_000) throw httpError(400, 'invalid_grant');
    target.balances.draco += amount;
    addTx(target, 'Admin Draco Ember adjustment', amount, { by: user.email });
    db.audit.push({ at: now(), admin: user.email, action: 'draco_adjustment', uid: target.id, amount });
    saveDb();
    return send(res, 200, { user: publicUser(target) });
  }
  throw httpError(404, 'not_found');
}

function serveStatic(req, res) {
  const raw = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const frontendPath = path.normalize(path.join(FRONTEND, raw));
  const rootAsset = path.normalize(path.join(ROOT, raw));
  let file = raw === '/index.html' && fs.existsSync(rootAsset) ? rootAsset : (frontendPath.startsWith(FRONTEND) && fs.existsSync(frontendPath) ? frontendPath : rootAsset);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(FRONTEND, 'index.html');
  const ext = path.extname(file);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => req.url.startsWith('/api/') ? api(req, res) : serveStatic(req, res))
  .listen(PORT, () => console.log(`RbxDraco backend listening on ${APP_URL}`));
