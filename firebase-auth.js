// ═══════════════════════════════════════════════════════════════
// HOLY BIBLE APP — FIREBASE AUTHENTICATION MODULE
// firebase-auth.js  ← replace localStorage AUTH with this
// ═══════════════════════════════════════════════════════════════

// ── Step 1: Add these script tags to your <head> (before closing </body>) ──
// <script type="module" src="firebase-init.js"></script>

// ══════════════════════════════════════════════════
// firebase-init.js  (create this file)
// ══════════════════════════════════════════════════
/*
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         onAuthStateChanged, signOut, updateProfile }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc,
         collection, addDoc, query, where, orderBy,
         onSnapshot, serverTimestamp, increment }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics, logEvent }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "G-XXXXXXXXXX"
};

const app   = initializeApp(firebaseConfig);
const auth  = getAuth(app);
const db    = getFirestore(app);
const analytics = getAnalytics(app);

window.FBAUTH = auth;
window.FBDB   = db;
window.FBLOG  = (event, params) => logEvent(analytics, event, params || {});
window.FB_GOOGLE = GoogleAuthProvider;
window.FB_signInWithPopup = signInWithPopup;
window.FB_signOut = signOut;
window.FB_onAuthStateChanged = onAuthStateChanged;
window.FB_createUser = createUserWithEmailAndPassword;
window.FB_signIn = signInWithEmailAndPassword;
window.FB_doc = doc;
window.FB_setDoc = setDoc;
window.FB_getDoc = getDoc;
window.FB_updateDoc = updateDoc;
window.FB_collection = collection;
window.FB_addDoc = addDoc;
window.FB_query = query;
window.FB_where = where;
window.FB_orderBy = orderBy;
window.FB_onSnapshot = onSnapshot;
window.FB_serverTimestamp = serverTimestamp;
window.FB_increment = increment;
*/

// ══════════════════════════════════════════════════
// ENHANCED AUTH MODULE — drop-in replacement for AUTH
// ══════════════════════════════════════════════════
var FBAUTH_MODULE = (function(){
  var _session = null;

  // ── Sync user profile to Firestore ─────────────
  async function syncUserProfile(fbUser, extra) {
    if (!window.FBDB) return;
    var ref = FB_doc(FBDB, 'users', fbUser.uid);
    var snap = await FB_getDoc(ref);
    if (!snap.exists()) {
      // New user — create profile
      await FB_setDoc(ref, {
        uid: fbUser.uid,
        name: fbUser.displayName || extra?.name || 'Bible Reader',
        email: fbUser.email,
        avatar: (fbUser.displayName || extra?.name || 'B').charAt(0).toUpperCase(),
        photoURL: fbUser.photoURL || null,
        joined: FB_serverTimestamp(),
        streak: 0,
        lastReadDate: null,
        xp: 0,
        readChapters: [],
        bookmarks: [],
        highlights: {},
        notes: {}
      });
      // Analytics: new user
      if (window.FBLOG) FBLOG('sign_up', { method: extra?.method || 'email' });
    } else {
      // Update last seen
      await FB_updateDoc(ref, { lastSeen: FB_serverTimestamp() });
    }
    var data = snap.exists() ? snap.data() : {};
    _session = {
      id: fbUser.uid,
      name: fbUser.displayName || extra?.name || data.name || 'Bible Reader',
      email: fbUser.email,
      avatar: (fbUser.displayName || extra?.name || data.name || 'B').charAt(0).toUpperCase(),
      photoURL: fbUser.photoURL || data.photoURL || null,
      isGoogle: extra?.isGoogle || false
    };
    localStorage.setItem('hb_sess', JSON.stringify(_session));
    return _session;
  }

  // ── Google Sign-In ──────────────────────────────
  async function googleLogin() {
    if (!window.FBAUTH) {
      // Fallback to localStorage mock if Firebase not loaded
      var s = { id: 'g' + Date.now(), name: 'Google User', email: 'user@gmail.com', avatar: 'G', isGoogle: true };
      localStorage.setItem('hb_sess', JSON.stringify(s));
      _session = s;
      return { ok: true, user: s };
    }
    try {
      var provider = new FB_GOOGLE();
      provider.addScope('profile');
      provider.addScope('email');
      var result = await FB_signInWithPopup(FBAUTH, provider);
      var user = await syncUserProfile(result.user, { isGoogle: true, method: 'google' });
      return { ok: true, user };
    } catch(e) {
      return { ok: false, err: e.message || 'Google sign-in failed' };
    }
  }

  // ── Email Registration ──────────────────────────
  async function register(name, email, pass) {
    if (!window.FBAUTH) {
      // Fallback
      var us = JSON.parse(localStorage.getItem('hb_users') || '[]');
      if (us.find(u => u.email === email)) return { ok: false, err: 'Email already registered' };
      if (pass.length < 6) return { ok: false, err: 'Password must be at least 6 characters' };
      var u = { id:'u'+Date.now(), name, email, avatar: name.charAt(0).toUpperCase(), joined: new Date().toISOString() };
      us.push(u); localStorage.setItem('hb_users', JSON.stringify(us));
      localStorage.setItem('hb_sess', JSON.stringify(u));
      _session = u;
      return { ok: true, user: u };
    }
    try {
      var cred = await FB_createUser(FBAUTH, email, pass);
      await updateProfile(cred.user, { displayName: name });
      var user = await syncUserProfile(cred.user, { name, method: 'email' });
      return { ok: true, user };
    } catch(e) {
      var msg = e.code === 'auth/email-already-in-use' ? 'Email already registered'
              : e.code === 'auth/weak-password' ? 'Password must be at least 6 characters'
              : e.message;
      return { ok: false, err: msg };
    }
  }

  // ── Email Login ────────────────────────────────
  async function login(email, pass) {
    if (!window.FBAUTH) {
      var us = JSON.parse(localStorage.getItem('hb_users') || '[]');
      var h = p => { var h=0; for(var i=0;i<p.length;i++){h=((h<<5)-h)+p.charCodeAt(i);h|=0;} return h.toString(36); };
      var u = us.find(x => x.email === email);
      if (!u) return { ok: false, err: 'Invalid email or password' };
      localStorage.setItem('hb_sess', JSON.stringify(u));
      _session = u;
      return { ok: true, user: u };
    }
    try {
      var result = await FB_signIn(FBAUTH, email, pass);
      var user = await syncUserProfile(result.user, { method: 'email' });
      return { ok: true, user };
    } catch(e) {
      return { ok: false, err: 'Invalid email or password' };
    }
  }

  // ── Logout ─────────────────────────────────────
  async function logout() {
    _session = null;
    localStorage.removeItem('hb_sess');
    if (window.FBAUTH) await FB_signOut(FBAUTH);
  }

  // ── Get Session ────────────────────────────────
  function getSession() {
    if (_session) return _session;
    try { return JSON.parse(localStorage.getItem('hb_sess') || 'null'); } catch(e) { return null; }
  }

  // ── Auth State Observer (call on app init) ─────
  function initAuthObserver(onLoginCallback, onLogoutCallback) {
    if (!window.FB_onAuthStateChanged) return;
    FB_onAuthStateChanged(FBAUTH, async user => {
      if (user) {
        var sess = await syncUserProfile(user);
        if (onLoginCallback) onLoginCallback(sess);
      } else {
        _session = null;
        localStorage.removeItem('hb_sess');
        if (onLogoutCallback) onLogoutCallback();
      }
    });
  }

  return { getSession, register, login, googleLogin, logout, initAuthObserver };
})();

// Override global AUTH with Firebase version
window.AUTH = FBAUTH_MODULE;
