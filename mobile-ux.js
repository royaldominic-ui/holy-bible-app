// ═══════════════════════════════════════════════════════════════
// HOLY BIBLE APP — MOBILE UX JS PATCHES
// mobile-ux.js  — Add <script src="mobile-ux.js"></script> before </body>
// ═══════════════════════════════════════════════════════════════

(function(){

  // ══════════════════════════════════════════════════
  // 1. PWA INSTALL PROMPT
  // ══════════════════════════════════════════════════
  var _installEvent = null;

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    _installEvent = e;

    // Show banner after 30 seconds (not intrusive)
    var dismissed = localStorage.getItem('hb-install-dismissed');
    if (dismissed) return;

    setTimeout(function() {
      var banner = document.getElementById('installBanner');
      if (banner) banner.classList.add('show');
    }, 30000);
  });

  // Inject install banner HTML
  document.addEventListener('DOMContentLoaded', function() {
    var banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.innerHTML = `
      <span style="font-size:20px">📱</span>
      <div class="ib-text">
        Install Holy Bible
        <small>Works offline · No app store needed</small>
      </div>
      <div class="ib-btns">
        <button class="ib-yes" onclick="installPWA()">Install</button>
        <button class="ib-no" onclick="dismissInstall()">×</button>
      </div>
    `;
    document.body.appendChild(banner);
  });

  window.installPWA = async function() {
    if (!_installEvent) return;
    _installEvent.prompt();
    var choice = await _installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      if (typeof toast === 'function') toast('✝️ Holy Bible installed!');
      if (window.FBLOG) FBLOG('pwa_installed');
    }
    _installEvent = null;
    dismissInstall();
  };

  window.dismissInstall = function() {
    var banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('show');
    localStorage.setItem('hb-install-dismissed', '1');
  };

  // ══════════════════════════════════════════════════
  // 2. CHAPTER READING PROGRESS BAR (scroll indicator)
  // ══════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function() {
    var bar = document.createElement('div');
    bar.id = 'chapterProgressBar';
    bar.innerHTML = '<div id="chapterProgressFill"></div>';
    document.body.appendChild(bar);
  });

  window.addEventListener('scroll', function() {
    var fill = document.getElementById('chapterProgressFill');
    if (!fill) return;
    var scrollTop = window.scrollY;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docH > 0 ? (scrollTop / docH * 100) : 0;
    fill.style.width = pct + '%';
  }, { passive: true });

  // ══════════════════════════════════════════════════
  // 3. CONTINUE READING BAR
  // ══════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function() {
    var last = localStorage.getItem('hb-last');
    if (!last) return;
    try {
      var d = JSON.parse(last);
      if (!d.book || !d.ch) return;

      // Total chapters in that book
      var BK_CHAPTERS = { Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,'Ruth':4,'1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,'Song of Solomon':8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4,Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,'1 Corinthians':16,'2 Corinthians':13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,'1 Thessalonians':5,'2 Thessalonians':3,'1 Timothy':6,'2 Timothy':4,Titus:3,Philemon:1,Hebrews:13,James:5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,'3 John':1,Jude:1,Revelation:22 };
      var total = BK_CHAPTERS[d.book] || 50;
      var pct = Math.round(d.ch / total * 100);

      var bar = document.createElement('div');
      bar.id = 'continueReadingBar';
      bar.onclick = function() { if (typeof doContinueReading === 'function') doContinueReading(); };
      bar.innerHTML = `
        <span class="crb-icon">📖</span>
        <div style="flex:1">
          <div class="crb-title">Continue: ${d.book} ${d.ch}</div>
          <div class="crb-sub">${d.book} · Chapter ${d.ch} of ${total}</div>
          <div class="crb-progress"><div class="crb-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <span style="font-size:18px;color:var(--primary)">→</span>
      `;

      // Insert before VOTD
      var votd = document.querySelector('.votd');
      if (votd && votd.parentNode) votd.parentNode.insertBefore(bar, votd);
    } catch(e) {}
  });

  // ══════════════════════════════════════════════════
  // 4. LIKE VERSE (heart button integration)
  // ══════════════════════════════════════════════════
  window.toggleLikeVerse = async function(btn, verseKey, text, ref) {
    var likes = JSON.parse(localStorage.getItem('hb-likes') || '{}');
    var wasLiked = !!likes[verseKey];

    // Optimistic UI
    btn.classList.toggle('liked', !wasLiked);
    btn.textContent = wasLiked ? '♡' : '♥';
    btn.style.color = wasLiked ? '' : '#e53e3e';

    // Animate
    btn.style.transform = 'scale(1.4)';
    setTimeout(() => btn.style.transform = '', 200);

    // Save
    if (window.CLOUD_SYNC) {
      await CLOUD_SYNC.toggleLike(verseKey, text, ref);
    } else {
      if (wasLiked) delete likes[verseKey];
      else likes[verseKey] = { ts: new Date().toISOString(), text, ref };
      localStorage.setItem('hb-likes', JSON.stringify(likes));
    }

    if (typeof haptic === 'function') haptic(wasLiked ? 20 : [20,10,30]);
  };

  // ══════════════════════════════════════════════════
  // 5. AUTO THEME (system dark/light)
  // ══════════════════════════════════════════════════
  (function applyAutoTheme() {
    var savedTheme = localStorage.getItem('hb-theme');
    if (savedTheme) return; // User has chosen — respect it

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      // Mark the dark dot as active
      document.querySelectorAll('.tdot').forEach(d => d.classList.remove('on'));
      var darkDot = document.querySelector('.tdot-dark');
      if (darkDot) darkDot.classList.add('on');
    }

    // Listen for changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if (localStorage.getItem('hb-theme')) return;
      if (typeof setTheme === 'function') setTheme(e.matches ? 'dark' : 'classic');
    });
  })();

  // ══════════════════════════════════════════════════
  // 6. PERFORMANCE: Lazy load verses
  // ══════════════════════════════════════════════════
  // Override the global renderVerses to use DocumentFragment batching
  var _origRenderVerses = window.renderVerses;
  if (_origRenderVerses) {
    window.renderVerses = function(verses) {
      if (!verses || verses.length < 50) return _origRenderVerses(verses);
      // For large chapters: render first 30 immediately, rest async
      var first = verses.slice(0, 30);
      var rest = verses.slice(30);
      _origRenderVerses(first);
      if (rest.length) {
        requestAnimationFrame(function() {
          _origRenderVerses(verses); // Full render on next frame
        });
      }
    };
  }

  // ══════════════════════════════════════════════════
  // 7. HANDLE ?action= URL params (shortcuts)
  // ══════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    var action = params.get('action');
    if (!action) return;

    setTimeout(function() {
      switch(action) {
        case 'votd':
          document.querySelector('.votd')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'continue':
          if (typeof doContinueReading === 'function') doContinueReading();
          break;
        case 'search':
          if (typeof openModal === 'function') openModal('searchModal');
          break;
      }
      // Clean URL
      history.replaceState({}, '', './');
    }, 800);
  });

  // ══════════════════════════════════════════════════
  // 8. RECORD READING for streak/progress
  // ══════════════════════════════════════════════════
  // Hook into chapter loading to record reading progress
  var _recordingDone = false;
  var _readingTimer = null;

  window.onChapterLoad = function(book, ch) {
    _recordingDone = false;
    clearTimeout(_readingTimer);
    // Record after 30 seconds of reading (not just a quick scroll)
    _readingTimer = setTimeout(function() {
      if (!_recordingDone && book && ch) {
        _recordingDone = true;
        if (window.CLOUD_SYNC) {
          CLOUD_SYNC.recordReading(book, ch);
        } else {
          // Local only
          var game = JSON.parse(localStorage.getItem('hb-game') || '{}');
          var today = new Date().toDateString();
          if (game.lastDay !== today) {
            var yesterday = new Date(Date.now()-86400000).toDateString();
            game.streak = game.lastDay === yesterday ? (game.streak||0)+1 : 1;
            game.lastDay = today;
            game.xp = (game.xp||0) + 10;
            localStorage.setItem('hb-game', JSON.stringify(game));
            if (typeof updateStreakUI === 'function') updateStreakUI();
          }
        }
      }
    }, 30000);
  };

})();
