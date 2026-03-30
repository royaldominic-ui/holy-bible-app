// ═══════════════════════════════════════════════════════════════
// HOLY BIBLE APP — CLOUD SYNC MODULE
// firebase-sync.js  ← cloud-backed version of localStorage S.*
// ═══════════════════════════════════════════════════════════════

var CLOUD_SYNC = (function(){

  // ── Debounce helper ──────────────────────────────────────────
  function debounce(fn, ms) {
    var t; return function() { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), ms); };
  }

  // ── Get user doc ref ────────────────────────────────────────
  function userRef() {
    var sess = AUTH.getSession();
    if (!sess || !window.FBDB) return null;
    return FB_doc(FBDB, 'users', sess.id);
  }

  // ══════════════════════════════════════════════════
  // BOOKMARKS — sync to Firestore
  // ══════════════════════════════════════════════════
  var _syncBookmarks = debounce(async function(bms) {
    var ref = userRef(); if (!ref) return;
    await FB_updateDoc(ref, { bookmarks: bms });
  }, 1500);

  function saveBookmark(key, data) {
    // 1. Write to localStorage immediately (instant UI response)
    var bms = JSON.parse(localStorage.getItem('hb-bm') || '[]');
    var existing = bms.findIndex(b => b.key === key);
    if (existing > -1) bms.splice(existing, 1);
    else bms.push({ key, ...data, ts: new Date().toISOString() });
    localStorage.setItem('hb-bm', JSON.stringify(bms));
    // 2. Sync to cloud (debounced)
    _syncBookmarks(bms);
    return bms;
  }

  function removeBookmark(key) {
    var bms = JSON.parse(localStorage.getItem('hb-bm') || '[]').filter(b => b.key !== key);
    localStorage.setItem('hb-bm', JSON.stringify(bms));
    _syncBookmarks(bms);
    return bms;
  }

  // ══════════════════════════════════════════════════
  // HIGHLIGHTS — sync to Firestore
  // ══════════════════════════════════════════════════
  var _syncHighlights = debounce(async function(hls) {
    var ref = userRef(); if (!ref) return;
    await FB_updateDoc(ref, { highlights: hls });
  }, 1500);

  function saveHighlight(key, color) {
    var hls = JSON.parse(localStorage.getItem('hb-hl') || '{}');
    if (color) hls[key] = color; else delete hls[key];
    localStorage.setItem('hb-hl', JSON.stringify(hls));
    _syncHighlights(hls);
    return hls;
  }

  // ══════════════════════════════════════════════════
  // NOTES — sync to Firestore
  // ══════════════════════════════════════════════════
  var _syncNotes = debounce(async function(notes) {
    var ref = userRef(); if (!ref) return;
    await FB_updateDoc(ref, { notes });
  }, 2000);

  function saveNote(key, text) {
    var notes = JSON.parse(localStorage.getItem('hb-nt') || '{}');
    if (text) notes[key] = { text, ts: new Date().toISOString() };
    else delete notes[key];
    localStorage.setItem('hb-nt', JSON.stringify(notes));
    _syncNotes(notes);
    return notes;
  }

  // ══════════════════════════════════════════════════
  // READING PROGRESS + STREAK
  // ══════════════════════════════════════════════════
  async function recordReading(book, chapter) {
    var ref = userRef();
    var key = book + '-' + chapter;
    var today = new Date().toDateString();

    // localStorage read progress
    var rd = JSON.parse(localStorage.getItem('hb-rd') || '{}');
    rd[key] = { ts: new Date().toISOString(), book, chapter };
    localStorage.setItem('hb-rd', JSON.stringify(rd));

    // Streak logic
    var game = JSON.parse(localStorage.getItem('hb-game') || '{}');
    var lastDay = game.lastDay || '';
    var yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastDay !== today) {
      game.streak = lastDay === yesterday ? (game.streak || 0) + 1 : 1;
      game.lastDay = today;
      game.xp = (game.xp || 0) + 10;
      localStorage.setItem('hb-game', JSON.stringify(game));
    }

    // Cloud update
    if (ref) {
      await FB_updateDoc(ref, {
        [`readChapters`]: FB_increment ? undefined : null, // arrayUnion if available
        lastReadDate: today,
        streak: game.streak,
        xp: game.xp,
        [`readProgress.${key}`]: new Date().toISOString()
      }).catch(() => {});
    }

    // Analytics
    if (window.FBLOG) FBLOG('chapter_read', { book, chapter });
  }

  // ══════════════════════════════════════════════════
  // LIKES — per-verse likes
  // ══════════════════════════════════════════════════
  async function toggleLike(verseKey, text, ref_label) {
    var sess = AUTH.getSession();
    if (!sess) return false;

    var likes = JSON.parse(localStorage.getItem('hb-likes') || '{}');
    var isLiked = !!likes[verseKey];

    if (isLiked) {
      delete likes[verseKey];
    } else {
      likes[verseKey] = { ts: new Date().toISOString(), text, ref: ref_label };
    }
    localStorage.setItem('hb-likes', JSON.stringify(likes));

    // Cloud: store in user's liked subcollection
    if (window.FBDB) {
      var likeRef = FB_doc(FBDB, 'users', sess.id, 'likes', verseKey.replace(/[^a-zA-Z0-9]/g, '_'));
      if (isLiked) {
        // delete — use deleteDoc
        await FB_setDoc(likeRef, { deleted: true }).catch(() => {});
      } else {
        await FB_setDoc(likeRef, { verseKey, text, ref: ref_label, ts: FB_serverTimestamp() }).catch(() => {});
      }
    }

    if (window.FBLOG) FBLOG(isLiked ? 'unlike_verse' : 'like_verse', { verse: ref_label });
    return !isLiked;
  }

  // ══════════════════════════════════════════════════
  // PULL USER DATA (on login — merge cloud → local)
  // ══════════════════════════════════════════════════
  async function pullUserData() {
    var ref = userRef();
    if (!ref) return;
    try {
      var snap = await FB_getDoc(ref);
      if (!snap.exists()) return;
      var data = snap.data();

      // Merge bookmarks: cloud wins for cross-device
      if (data.bookmarks?.length) {
        var localBm = JSON.parse(localStorage.getItem('hb-bm') || '[]');
        var merged = [...localBm];
        data.bookmarks.forEach(cb => {
          if (!merged.find(b => b.key === cb.key)) merged.push(cb);
        });
        localStorage.setItem('hb-bm', JSON.stringify(merged));
      }

      // Merge highlights
      if (data.highlights && Object.keys(data.highlights).length) {
        var localHl = JSON.parse(localStorage.getItem('hb-hl') || '{}');
        localStorage.setItem('hb-hl', JSON.stringify({ ...localHl, ...data.highlights }));
      }

      // Merge notes
      if (data.notes && Object.keys(data.notes).length) {
        var localNt = JSON.parse(localStorage.getItem('hb-nt') || '{}');
        localStorage.setItem('hb-nt', JSON.stringify({ ...localNt, ...data.notes }));
      }

      // Streak / XP
      if (data.streak) {
        var game = JSON.parse(localStorage.getItem('hb-game') || '{}');
        game.streak = Math.max(game.streak || 0, data.streak);
        game.xp = Math.max(game.xp || 0, data.xp || 0);
        if (data.lastReadDate) game.lastDay = data.lastReadDate;
        localStorage.setItem('hb-game', JSON.stringify(game));
      }

      console.log('[BibleApp] Cloud data synced successfully');
    } catch(e) {
      console.warn('[BibleApp] Cloud sync failed (offline?):', e);
    }
  }

  return { saveBookmark, removeBookmark, saveHighlight, saveNote, recordReading, toggleLike, pullUserData };
})();

window.CLOUD_SYNC = CLOUD_SYNC;
