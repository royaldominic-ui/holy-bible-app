// ═══════════════════════════════════════════════════════════════
// HOLY BIBLE APP — VERSE SHARE AS IMAGE MODULE
// verse-share.js  — Instagram-ready verse cards using Canvas API
// ═══════════════════════════════════════════════════════════════

var VERSE_SHARE = (function(){

  // ── Templates ───────────────────────────────────────────────
  var TEMPLATES = {
    classic:   { bg: ['#8B4513','#D2691E'], text: '#FFFFFF', accent: '#DAA520'  },
    dark:      { bg: ['#0a0a0f','#1a1428'], text: '#e8e0d0', accent: '#c8a96e'  },
    ocean:     { bg: ['#1565C0','#1976D2'], text: '#FFFFFF', accent: '#29B6F6'  },
    forest:    { bg: ['#1B5E20','#2E7D32'], text: '#FFFFFF', accent: '#81C784'  },
    royal:     { bg: ['#4A148C','#7B1FA2'], text: '#FFFFFF', accent: '#CE93D8'  },
    sunrise:   { bg: ['#FF6B35','#F7C59F'], text: '#2C1810', accent: '#FFAB40'  },
    midnight:  { bg: ['#0D0D1A','#0A1628'], text: '#E3F2FD', accent: '#90CAF9'  },
    gold:      { bg: ['#2C1810','#5C3A1E'], text: '#DAA520', accent: '#F0E68C'  },
  };

  // ── Generate Canvas Image ────────────────────────────────────
  function generate(text, reference, templateName) {
    return new Promise(function(resolve) {
      var tmpl = TEMPLATES[templateName] || TEMPLATES.classic;
      var W = 1080, H = 1080; // Instagram square

      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext('2d');

      // Background gradient
      var grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, tmpl.bg[0]);
      grad.addColorStop(1, tmpl.bg[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Decorative cross watermark (top-right)
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.font = 'bold 380px serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText('✝', W * 0.75, H * 0.55);
      ctx.restore();

      // Large opening quote
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.font = 'bold 280px Georgia';
      ctx.fillStyle = tmpl.accent;
      ctx.textAlign = 'left';
      ctx.fillText('"', 55, 280);
      ctx.restore();

      // Decorative top line
      ctx.strokeStyle = tmpl.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(80, 110); ctx.lineTo(W - 80, 110); ctx.stroke();
      ctx.globalAlpha = 1;

      // App name header
      ctx.font = '500 28px "Cinzel", serif';
      ctx.fillStyle = tmpl.accent;
      ctx.textAlign = 'center';
      ctx.fillText('✝  HOLY BIBLE', W / 2, 78);

      // Verse text — wrapped
      ctx.font = 'italic 44px "Crimson Text", Georgia, serif';
      ctx.fillStyle = tmpl.text;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.95;
      var lines = wrapText(ctx, text, W - 160, 44);
      var lineH = 64;
      var totalH = lines.length * lineH;
      var startY = (H - totalH) / 2 - 40;
      lines.forEach(function(line, i) {
        ctx.fillText(line, W / 2, startY + i * lineH);
      });

      // Reference
      ctx.font = 'bold 36px "Inter", Arial, sans-serif';
      ctx.fillStyle = tmpl.accent;
      ctx.globalAlpha = 1;
      ctx.fillText('— ' + reference, W / 2, startY + totalH + 60);

      // Bottom line
      ctx.strokeStyle = tmpl.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(80, H - 110); ctx.lineTo(W - 80, H - 110); ctx.stroke();
      ctx.globalAlpha = 1;

      // "CYBERNATE247" footer
      ctx.font = '400 24px "Inter", Arial, sans-serif';
      ctx.fillStyle = tmpl.text;
      ctx.globalAlpha = 0.5;
      ctx.fillText('CYBERNATE247', W / 2, H - 70);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    });
  }

  // ── Text wrap helper ─────────────────────────────────────────
  function wrapText(ctx, text, maxW, fontSize) {
    var words = text.split(' ');
    var lines = [];
    var current = '';
    words.forEach(function(word) {
      var test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && current) {
        lines.push(current); current = word;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    // Cap at 8 lines — truncate gracefully
    if (lines.length > 8) { lines = lines.slice(0, 7); lines.push('…'); }
    return lines;
  }

  // ── Show share modal ─────────────────────────────────────────
  function openShareModal(text, reference) {
    // Remove existing
    var existing = document.getElementById('shareImgModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'shareImgModal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,.8);display:flex;align-items:center;
      justify-content:center;padding:20px;
    `;

    var currentTemplate = 'classic';

    modal.innerHTML = `
      <div style="background:var(--modal-bg);border-radius:16px;padding:20px;max-width:420px;width:100%;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <span style="font-weight:700;font-size:16px;color:var(--primary)">📤 Share Verse</span>
          <button onclick="document.getElementById('shareImgModal').remove()"
            style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-muted)">×</button>
        </div>
        <canvas id="shareCanvas" style="width:100%;border-radius:10px;margin-bottom:14px;"></canvas>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;" id="tmplPicker">
          ${Object.keys(TEMPLATES).map(t => `
            <button class="shr-tmpl" data-t="${t}"
              style="padding:5px 10px;border-radius:10px;border:2px solid ${t==='classic'?'var(--primary)':'var(--border)'};
              background:${TEMPLATES[t].bg[0]};color:${TEMPLATES[t].text};
              font-size:11px;font-weight:600;cursor:pointer;transition:all .18s;">
              ${t.charAt(0).toUpperCase()+t.slice(1)}
            </button>`).join('')}
        </div>
        <div style="display:flex;gap:8px;">
          <button id="downloadBtn"
            style="flex:1;padding:11px;background:var(--primary);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;">
            ⬇️ Download
          </button>
          <button id="nativeShareBtn"
            style="flex:1;padding:11px;background:transparent;border:2px solid var(--primary);color:var(--primary);border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;">
            📤 Share
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Render initial preview
    async function renderPreview(tmplName) {
      var dataUrl = await generate(text, reference, tmplName);
      var canvas = document.getElementById('shareCanvas');
      if (!canvas) return;
      canvas.width = 1080; canvas.height = 1080;
      var img = new Image();
      img.onload = function() {
        canvas.getContext('2d').drawImage(img, 0, 0, 1080, 1080);
      };
      img.src = dataUrl;
      modal._lastDataUrl = dataUrl;
    }
    renderPreview(currentTemplate);

    // Template picker
    modal.querySelector('#tmplPicker').addEventListener('click', function(e) {
      var btn = e.target.closest('.shr-tmpl');
      if (!btn) return;
      currentTemplate = btn.dataset.t;
      modal.querySelectorAll('.shr-tmpl').forEach(b => b.style.borderColor = 'var(--border)');
      btn.style.borderColor = 'var(--primary)';
      renderPreview(currentTemplate);
    });

    // Download
    modal.querySelector('#downloadBtn').addEventListener('click', async function() {
      var dataUrl = modal._lastDataUrl || await generate(text, reference, currentTemplate);
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = reference.replace(/\s+/g,'_') + '.jpg';
      a.click();
      if (window.FBLOG) FBLOG('verse_downloaded');
    });

    // Native share (mobile)
    modal.querySelector('#nativeShareBtn').addEventListener('click', async function() {
      var dataUrl = modal._lastDataUrl || await generate(text, reference, currentTemplate);
      if (navigator.share) {
        try {
          var res = await fetch(dataUrl);
          var blob = await res.blob();
          var file = new File([blob], reference.replace(/\s+/g,'_')+'.jpg', { type: 'image/jpeg' });
          await navigator.share({ files: [file], title: reference, text: '"' + text + '" — ' + reference });
          if (window.FBLOG) FBLOG('verse_shared');
        } catch(e) {
          // Fall back to text share
          navigator.share({ title: reference, text: '"' + text + '" — ' + reference + '\n\nHoly Bible App' });
        }
      } else {
        // Copy to clipboard
        navigator.clipboard?.writeText('"' + text + '" — ' + reference).then(() => {
          if (typeof toast === 'function') toast('📋 Verse copied to clipboard!');
        });
      }
    });

    // Close on backdrop
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  }

  return { generate, openShareModal };
})();

window.VERSE_SHARE = VERSE_SHARE;
window.shareVerseAsImage = function(text, ref) { VERSE_SHARE.openShareModal(text, ref); };
