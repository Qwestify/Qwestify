// ============================================================
// QWESTIFY — Configuration Supabase
// ============================================================

const SUPABASE_URL = 'https://eqyhqfeftebvntcmtuih.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zFry61gKUlxxj0uyvaer0Q_3xFtmYqK';

// Initialisation du client Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// AUTH — Inscription / Connexion / Déconnexion
// ============================================================

async function signUp(email, password, username) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await db.auth.signOut();
  localStorage.removeItem('qst-loggedin');
  window.location = 'index.html';
}

async function getUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

// ============================================================
// PROFIL UTILISATEUR
// ============================================================

async function getProfile(userId) {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function updateProfile(userId, updates) {
  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
  return data;
}

// ============================================================
// QUÊTES
// ============================================================

async function getCampaigns() {
  const { data, error } = await db
    .from('campaigns')
    .select('*, quests(*)')
    .eq('active', true)
    .order('is_featured', { ascending: false });
  if (error) throw error;
  return data;
}

async function getCampaign(slug) {
  const { data, error } = await db
    .from('campaigns')
    .select('*, quests(*)')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

async function getUserProgress(userId, campaignId) {
  const { data, error } = await db
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('campaign_id', campaignId);
  if (error) throw error;
  return data;
}

async function completeQuest(userId, questId, campaignId) {
  const { data, error } = await db
    .from('user_progress')
    .upsert({
      user_id: userId,
      quest_id: questId,
      campaign_id: campaignId,
      completed_at: new Date().toISOString()
    });
  if (error) throw error;
  return data;
}

// ============================================================
// BONS / COUPONS
// ============================================================

async function generateCoupon(userId, campaignId, rewardValue) {
  const code = 'QST-' +
    Math.random().toString(36).substr(2, 4).toUpperCase() + '-' +
    Math.random().toString(36).substr(2, 4).toUpperCase();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data, error } = await db
    .from('coupons')
    .insert({
      user_id: userId,
      campaign_id: campaignId,
      code,
      reward_value: rewardValue,
      expires_at: expiresAt.toISOString(),
      status: 'active'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getUserCoupons(userId) {
  const { data, error } = await db
    .from('coupons')
    .select('*, campaigns(name, logo_color)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function validateCoupon(code) {
  const { data, error } = await db
    .from('coupons')
    .select('*, profiles(username), campaigns(name)')
    .eq('code', code)
    .eq('status', 'active')
    .single();
  if (error) return null;
  return data;
}

async function useCoupon(code) {
  const { data, error } = await db
    .from('coupons')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('code', code);
  if (error) throw error;
  return data;
}

// ============================================================
// GM / STREAK
// ============================================================

async function claimGMToday(userId) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await db
    .from('gm_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) return { alreadyClaimed: true };

  const { error } = await db
    .from('gm_logs')
    .insert({ user_id: userId, date: today });
  if (error) throw error;

  // Update streak in profile
  await db.rpc('increment_streak', { p_user_id: userId });
  return { alreadyClaimed: false, success: true };
}

async function getStreak(userId) {
  const { data, error } = await db
    .from('profiles')
    .select('streak_current, streak_record, gm_total')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// CLASSEMENT
// ============================================================

async function getLeaderboard(limit = 50) {
  const { data, error } = await db
    .from('profiles')
    .select('id, username, points, level, league')
    .order('points', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

async function getUserRank(userId) {
  const { data, error } = await db
    .rpc('get_user_rank', { p_user_id: userId });
  if (error) throw error;
  return data;
}
