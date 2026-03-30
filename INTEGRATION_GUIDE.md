# ═══════════════════════════════════════════════════════════════
# HOLY BIBLE APP — MASTER INTEGRATION GUIDE
# Step-by-step instructions to upgrade your existing index.html
# ═══════════════════════════════════════════════════════════════

## OVERVIEW OF FILES DELIVERED
```
bible-upgrade/
├── firebase-auth.js        # Firebase auth (replaces localStorage AUTH)
├── firebase-sync.js        # Cloud sync for bookmarks/notes/highlights
├── ai-assistant.js         # AI Bible chat bubble (Claude-powered)
├── cloudflare-worker.js    # API proxy (deploy to Cloudflare Workers)
├── verse-share.js          # Instagram verse cards (Canvas API)
├── mobile-ux.js            # Mobile UX: install prompt, progress bar, likes
├── mobile-ux-patches.css   # CSS fixes: toolbar bug, dark mode, etc.
├── sw.js                   # Service Worker (offline + PWA)
├── manifest.json           # Updated PWA manifest
└── firestore.rules         # Firebase security rules
```

═══════════════════════════════════════════════════════════════
## STEP 1: FIREBASE SETUP (15 minutes)
═══════════════════════════════════════════════════════════════

1. Go to: https://console.firebase.google.com
2. Click "Add Project" → Name it "holy-bible-app"
3. Enable Google Analytics (recommended)
4. Click "Add App" → Choose Web (</>)
5. Register app → Copy the firebaseConfig object

6. Enable Authentication:
   - Build → Authentication → Get Started
   - Sign-in methods → Enable: Google + Email/Password

7. Enable Firestore:
   - Build → Firestore Database → Create database
   - Start in Production mode
   - Choose your region (e.g., asia-south1 for India)

8. Copy firestore.rules content → Paste in Rules tab → Publish

9. Enable Analytics:
   - Already enabled in step 3

═══════════════════════════════════════════════════════════════
## STEP 2: CLOUDFLARE WORKER SETUP (10 minutes)
═══════════════════════════════════════════════════════════════

1. Go to: https://workers.cloudflare.com
2. Sign up (free) → Create Worker
3. Paste cloudflare-worker.js content
4. Add Secret: Settings → Variables → Add Variable
   Name: ANTHROPIC_API_KEY
   Value: sk-ant-api03-... (your Claude API key)
5. Update ALLOWED_ORIGINS with your GitHub Pages URL
6. Deploy → Copy your worker URL (e.g., https://bible-ai.YOUR.workers.dev/ai)
7. Update API_ENDPOINT in ai-assistant.js

═══════════════════════════════════════════════════════════════
## STEP 3: MODIFY index.html (30 minutes)
═══════════════════════════════════════════════════════════════

### A. Add to <head> (AFTER existing <style> but BEFORE </head>):

```html
<!-- Mobile UX CSS patches -->
<style>
  /* PASTE entire contents of mobile-ux-patches.css here */
</style>

<!-- Firebase SDK -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getAuth, GoogleAuthProvider, signInWithPopup,
           createUserWithEmailAndPassword, signInWithEmailAndPassword,
           onAuthStateChanged, signOut, updateProfile }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
  import { getFirestore, doc, setDoc, getDoc, updateDoc,
           collection, addDoc, serverTimestamp, increment }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
  import { getAnalytics, logEvent }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",         // ← Replace
    authDomain: "YOUR.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "G-XXXXXXXXXX"
  };

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);
  const analytics = getAnalytics(app);

  // Expose globals
  window.FBAUTH = auth;
  window.FBDB   = db;
  window.FBLOG  = (e, p) => logEvent(analytics, e, p || {});
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
  window.FB_serverTimestamp = serverTimestamp;
  window.FB_increment = increment;
  window.updateProfile = updateProfile;
</script>
```

### B. Add before </body> (in this order):

```html
<!-- Firebase Auth Module -->
<script src="firebase-auth.js"></script>

<!-- Cloud Sync Module -->  
<script src="firebase-sync.js"></script>

<!-- AI Assistant -->
<script src="ai-assistant.js"></script>

<!-- Verse Share as Image -->
<script src="verse-share.js"></script>

<!-- Mobile UX Patches -->
<script src="mobile-ux.js"></script>
```

═══════════════════════════════════════════════════════════════
## STEP 4: UPDATE AUTH MODAL (Add Google button)
═══════════════════════════════════════════════════════════════

Find this in your HTML (around line 3253):
```html
<div id="frmIn" class="auth-form">
  <input class="auth-inp" type="email"...
```

Replace the ENTIRE #frmIn div with:
```html
<div id="frmIn" class="auth-form">
  <!-- Google Sign-In (PRIMARY) -->
  <button class="google-btn" onclick="doGoogleSignIn()">
    <span class="g-logo"></span>
    Continue with Google
  </button>
  
  <div class="auth-divider">or sign in with email</div>
  
  <input class="auth-inp" type="email" id="siEmail" placeholder="Email address" autocomplete="email">
  <input class="auth-inp" type="password" id="siPass" placeholder="Password" autocomplete="current-password">
  <div class="auth-err" id="siErr"></div>
  <button class="auth-submit" onclick="doSignIn()">Sign In ✝</button>
  
  <button onclick="doGuestMode()" style="width:100%;margin-top:8px;padding:9px;background:transparent;
    border:1.5px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:13px;cursor:pointer;">
    👤 Continue as Guest
  </button>
</div>
```

Also add to the Create Account form (frmUp), same Google button pattern.

═══════════════════════════════════════════════════════════════
## STEP 5: UPDATE AUTH JS FUNCTIONS
═══════════════════════════════════════════════════════════════

Find doSignIn() and doSignUp() functions. Add these new functions
AFTER the existing auth initialization block (around line 3950):

```javascript
// Google Sign-In
async function doGoogleSignIn() {
  var err = document.getElementById('siErr');
  if (err) err.textContent = '';
  var btn = document.querySelector('.google-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  
  var result = await AUTH.googleLogin();
  if (result.ok) {
    updateHeaderBtn();
    closeModal('authModal');
    // Pull cloud data
    if (window.CLOUD_SYNC) await CLOUD_SYNC.pullUserData();
    toast('✝️ Welcome, ' + result.user.name + '!');
    haptic([20, 10, 30]);
    if (window.FBLOG) FBLOG('login', { method: 'google' });
  } else {
    if (err) err.textContent = result.err || 'Google sign-in failed';
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '<span class="g-logo"></span>Continue with Google'; }
}
window.doGoogleSignIn = doGoogleSignIn;

// Guest mode
function doGuestMode() {
  closeModal('authModal');
  toast('👤 Browsing as guest — sign in to sync your data');
}
window.doGuestMode = doGuestMode;
```

Also update existing doSignIn to async and call CLOUD_SYNC.pullUserData() on success:
```javascript
async function doSignIn() {
  // ... existing code ...
  var result = await AUTH.login(email, pass);
  if (result.ok) {
    updateHeaderBtn();
    closeModal('authModal');
    if (window.CLOUD_SYNC) await CLOUD_SYNC.pullUserData();  // ← ADD THIS
    toast('Welcome back, ' + result.user.name + '! ✝️');
  }
}
```

═══════════════════════════════════════════════════════════════
## STEP 6: ADD HEADER PROFILE AVATAR
═══════════════════════════════════════════════════════════════

Find the updateHeaderBtn() function. Add profile avatar rendering:

```javascript
function updateHeaderBtn() {
  var sess = AUTH.getSession();
  var btn = document.getElementById('authBtn');
  
  if (sess) {
    // Show avatar instead of "Sign In" button
    btn.innerHTML = `
      <div class="hb-avatar" onclick="openAuthModal()">
        ${sess.photoURL ? 
          `<img src="${sess.photoURL}" alt="${sess.name}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
           <span style="display:none">${sess.avatar}</span>` :
          sess.avatar
        }
      </div>`;
    
    // Add streak badge if streak > 0
    var game = JSON.parse(localStorage.getItem('hb-game') || '{}');
    if (game.streak > 1) {
      var streakBadge = document.createElement('div');
      streakBadge.className = 'streak-badge';
      streakBadge.innerHTML = `<span class="fire">🔥</span>${game.streak}`;
      btn.parentNode.insertBefore(streakBadge, btn.nextSibling);
    }
  } else {
    btn.innerHTML = 'Sign In ✝';
    btn.onclick = openAuthModal;
  }
}
```

═══════════════════════════════════════════════════════════════
## STEP 7: ADD VERSE ACTIONS (Like + Share as Image)
═══════════════════════════════════════════════════════════════

Find the renderVerses() function. In the verse HTML, add like button:

Look for the .vacts div generation — add a like button and share button:
```javascript
// In the vacts button group, add:
+'<button class="vab '+(isLiked?'liked':'')+'" title="Like" '
+'onclick="toggleLikeVerse(this,\''+key+'\',\''+esc(v.text)+'\',\''+curBook+' '+curCh+':'+v.verse+'\')">'
+(isLiked?'♥':'♡')+'</button>'

// Share as image button:
+'<button class="vab" title="Share as Image" '
+'onclick="shareVerseAsImage(\''+esc(v.text)+'\',\''+curBook+' '+curCh+':'+v.verse+'\')">'
+'🖼</button>'

// AI explain button:  
+'<button class="vab" title="Ask AI" '
+'onclick="AI_ASSISTANT.setContext(\''+esc(v.text)+'\',\''+curBook+' '+curCh+':'+v.verse+'\');AI_ASSISTANT.open();">'
+'✦</button>'
```

Also load likes on render:
```javascript
var likes = JSON.parse(localStorage.getItem('hb-likes') || '{}');
var isLiked = !!likes[curBook+'-'+curCh+'-'+v.verse];
```

═══════════════════════════════════════════════════════════════
## STEP 8: HOOK CHAPTER LOAD INTO STREAK TRACKING
═══════════════════════════════════════════════════════════════

Find where chapters are loaded (the loadChapter or loadBook function).
After verses are rendered, add:

```javascript
// After rendering verses:
if (typeof window.onChapterLoad === 'function') {
  window.onChapterLoad(curBook, curCh);
}
```

═══════════════════════════════════════════════════════════════
## STEP 9: DEPLOY FILES TO GITHUB PAGES
═══════════════════════════════════════════════════════════════

1. Copy sw.js to your GitHub repo root
2. Copy manifest.json (replace existing) to root
3. Copy all .js files to root (or a /js/ folder and update src paths)
4. Commit and push:
   ```
   git add .
   git commit -m "World-class upgrade: Firebase, AI, offline PWA, verse sharing"
   git push origin main
   ```

═══════════════════════════════════════════════════════════════
## STEP 10: PLAY STORE — BUBBLEWRAP (TWA)
═══════════════════════════════════════════════════════════════

Convert your PWA to a Play Store APK using Google's Bubblewrap:

```bash
# Install Node.js first, then:
npm install -g @bubblewrap/cli

# Initialize
bubblewrap init --manifest https://YOUR-USERNAME.github.io/manifest.json

# Build APK
bubblewrap build
```

Then:
1. Sign up at play.google.com/console ($25 one-time fee)
2. Create app → Upload the .aab file
3. Fill in store listing (use your verse-share images as screenshots)
4. Submit for review (2-3 days)

═══════════════════════════════════════════════════════════════
## ANALYTICS EVENTS TRACKED
═══════════════════════════════════════════════════════════════

Firebase Analytics will automatically track:
- sign_up (method: google/email)
- login (method: google/email)
- chapter_read (book, chapter)
- ai_assistant_open
- ai_question_asked
- like_verse / unlike_verse
- verse_downloaded
- verse_shared
- pwa_installed

View in: Firebase Console → Analytics → Events

═══════════════════════════════════════════════════════════════
## PERFORMANCE CHECKLIST
═══════════════════════════════════════════════════════════════

✅ Service Worker caches app shell (offline after first load)
✅ Verses rendered with DocumentFragment (no layout thrash)
✅ Cloud sync is debounced (1.5s after last change)
✅ Images lazy-loaded (browser native)
✅ Fonts preloaded via <link rel="preload">
✅ Install prompt non-intrusive (30s delay)
✅ Auth state persists across sessions (localStorage + Firebase)

Target: < 2 second load on 3G, fully offline capable

═══════════════════════════════════════════════════════════════
## ZAPIER INTEGRATION (Optional — for CRM / Email lists)
═══════════════════════════════════════════════════════════════

To capture new user emails in your CRM:

1. Create a Zapier Webhook trigger
2. Copy the webhook URL
3. In firebase-auth.js syncUserProfile(), add after FB_setDoc:

```javascript
// Notify Zapier of new signup
if (extra?.method) {
  fetch('YOUR_ZAPIER_WEBHOOK_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: fbUser.displayName || extra?.name,
      email: fbUser.email,
      method: extra.method,
      timestamp: new Date().toISOString()
    })
  }).catch(() => {}); // Fire and forget
}
```

4. Connect Zapier to: Mailchimp / HubSpot / Google Sheets / Notion
