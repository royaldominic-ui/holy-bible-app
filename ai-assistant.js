// ═══════════════════════════════════════════════════════════════
// HOLY BIBLE APP — AI BIBLE ASSISTANT MODULE
// ai-assistant.js
//
// Powers the floating AI chat bubble with Claude integration.
// Add <script src="ai-assistant.js"></script> before </body>
// ═══════════════════════════════════════════════════════════════

var AI_ASSISTANT = (function(){

  var _history = [];       // conversation history
  var _isOpen  = false;
  var _isDragging = false;

  // ── Your Claude API key (set via env variable in your backend proxy) ──
  // IMPORTANT: Never expose API keys in frontend code!
  // Route through a simple Cloudflare Worker or Firebase Function:
  var API_ENDPOINT = 'https://your-proxy.workers.dev/ai'; // replace with your proxy

  // For testing only (GitHub Pages static) — use this pattern:
  // Proxy Worker code is in cloudflare-worker.js (see that file)

  // ── Inject UI ───────────────────────────────────────────────
  function injectUI() {
    if (document.getElementById('aiBubble')) return;

    var style = document.createElement('style');
    style.textContent = `
      #aiBubble {
        position: fixed; bottom: 90px; right: 18px; z-index: 500;
        width: 52px; height: 52px; border-radius: 50%;
        background: var(--primary); color: #fff;
        border: none; font-size: 22px; cursor: pointer;
        box-shadow: 0 4px 18px var(--shadow);
        transition: transform .2s, box-shadow .2s;
        display: flex; align-items: center; justify-content: center;
        user-select: none;
      }
      #aiBubble:hover { transform: scale(1.1); }
      #aiBubble.pulse { animation: aipulse 2s ease-in-out infinite; }
      @keyframes aipulse {
        0%,100%{ box-shadow: 0 4px 18px var(--shadow); }
        50%{ box-shadow: 0 4px 24px var(--primary), 0 0 0 8px rgba(139,69,19,.15); }
      }
      #aiPanel {
        position: fixed; bottom: 158px; right: 18px; z-index: 501;
        width: min(360px, calc(100vw - 36px)); height: min(480px, 70vh);
        background: var(--modal-bg); border: 1px solid var(--border);
        border-radius: 16px; box-shadow: 0 8px 40px var(--shadow);
        display: none; flex-direction: column; overflow: hidden;
        transform-origin: bottom right;
        animation: aiOpen .22s cubic-bezier(.4,0,.2,1);
      }
      @keyframes aiOpen { from { opacity:0; transform: scale(.9) translateY(10px); } to { opacity:1; transform: none; } }
      #aiPanel.visible { display: flex; }
      .ai-head {
        padding: 12px 16px; background: var(--bg-votd); color: #fff;
        display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        border-radius: 16px 16px 0 0;
      }
      .ai-head-ico { font-size: 20px; }
      .ai-head-title { font-weight: 700; font-size: 14px; flex: 1; }
      .ai-head-close { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0 4px; }
      .ai-msgs {
        flex: 1; overflow-y: auto; padding: 14px;
        display: flex; flex-direction: column; gap: 10px;
      }
      .ai-msg {
        max-width: 88%; padding: 10px 13px; border-radius: 12px;
        font-size: 13.5px; line-height: 1.6; white-space: pre-wrap;
        word-break: break-word;
      }
      .ai-msg.user {
        align-self: flex-end;
        background: var(--primary); color: #fff;
        border-radius: 12px 12px 2px 12px;
      }
      .ai-msg.bot {
        align-self: flex-start;
        background: var(--bg-hover); color: var(--text-primary);
        border-radius: 12px 12px 12px 2px; border: 1px solid var(--border);
      }
      .ai-msg.typing { opacity: .7; }
      .ai-typing-dots span {
        display: inline-block; width: 7px; height: 7px; border-radius: 50%;
        background: var(--primary); margin: 0 2px;
        animation: aidot 1.2s ease-in-out infinite;
      }
      .ai-typing-dots span:nth-child(2) { animation-delay: .2s; }
      .ai-typing-dots span:nth-child(3) { animation-delay: .4s; }
      @keyframes aidot { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
      .ai-suggestions {
        display: flex; gap: 6px; flex-wrap: wrap;
        padding: 0 14px 10px;
      }
      .ai-sug {
        padding: 5px 10px; border: 1.5px solid var(--primary);
        border-radius: 14px; font-size: 11px; font-weight: 600;
        color: var(--primary); background: transparent; cursor: pointer;
        transition: all .18s; white-space: nowrap;
      }
      .ai-sug:hover { background: var(--primary); color: #fff; }
      .ai-footer {
        padding: 10px 12px; border-top: 1px solid var(--border);
        display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0;
      }
      .ai-input {
        flex: 1; padding: 9px 12px; border: 2px solid var(--border-strong);
        border-radius: 10px; font-size: 13px; resize: none;
        background: var(--bg-input); color: var(--text-primary);
        max-height: 90px; min-height: 40px; overflow-y: auto;
        font-family: 'Inter', sans-serif; line-height: 1.4;
      }
      .ai-input:focus { outline: none; border-color: var(--primary); }
      .ai-send {
        width: 40px; height: 40px; border-radius: 50%;
        background: var(--primary); color: #fff;
        border: none; font-size: 16px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all .2s; flex-shrink: 0;
      }
      .ai-send:hover { background: var(--primary-light); }
      .ai-send:disabled { opacity: .5; cursor: not-allowed; }
      .ai-context-bar {
        padding: 6px 14px; background: var(--tag-bg);
        border-bottom: 1px solid var(--border);
        font-size: 11px; color: var(--primary); font-weight: 600;
        display: none; align-items: center; gap: 6px;
      }
      .ai-context-bar.visible { display: flex; }
      .ai-clear-ctx { margin-left: auto; cursor: pointer; opacity: .7; font-size: 10px; }
    `;
    document.head.appendChild(style);

    var html = `
    <button id="aiBubble" class="pulse" onclick="AI_ASSISTANT.toggle()" title="AI Bible Assistant">✦</button>
    <div id="aiPanel">
      <div class="ai-head">
        <span class="ai-head-ico">✦</span>
        <span class="ai-head-title">Bible Assistant</span>
        <button class="ai-head-close" onclick="AI_ASSISTANT.close()">×</button>
      </div>
      <div id="aiContextBar" class="ai-context-bar">
        <span id="aiCtxLabel">Context: John 3:16</span>
        <span class="ai-clear-ctx" onclick="AI_ASSISTANT.clearContext()">✕ clear</span>
      </div>
      <div id="aiMsgs" class="ai-msgs"></div>
      <div id="aiSugs" class="ai-suggestions">
        <button class="ai-sug" onclick="AI_ASSISTANT.quickAsk('Explain the current verse')">Explain verse</button>
        <button class="ai-sug" onclick="AI_ASSISTANT.quickAsk('Generate a prayer based on this chapter')">Generate prayer</button>
        <button class="ai-sug" onclick="AI_ASSISTANT.quickAsk('What is the historical context here?')">History</button>
        <button class="ai-sug" onclick="AI_ASSISTANT.quickAsk('Give me related verses')">Related verses</button>
      </div>
      <div class="ai-footer">
        <textarea class="ai-input" id="aiInput" placeholder="Ask about any verse…" rows="1"
          onkeydown="AI_ASSISTANT.handleKey(event)"></textarea>
        <button class="ai-send" id="aiSendBtn" onclick="AI_ASSISTANT.send()">➤</button>
      </div>
    </div>`;

    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    // Auto-resize textarea
    document.getElementById('aiInput').addEventListener('input', function(){
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 90) + 'px';
    });

    // Drag support for bubble
    makeDraggable(document.getElementById('aiBubble'));
  }

  // ── Draggable bubble ────────────────────────────
  function makeDraggable(el) {
    var ox, oy, sx, sy;
    el.addEventListener('touchstart', function(e){
      var t = e.touches[0];
      sx = el.getBoundingClientRect().left; sy = el.getBoundingClientRect().top;
      ox = t.clientX - sx; oy = t.clientY - sy;
    }, {passive:true});
    el.addEventListener('touchmove', function(e){
      _isDragging = true;
      var t = e.touches[0];
      var nx = t.clientX - ox; var ny = t.clientY - oy;
      el.style.left = nx + 'px'; el.style.bottom = 'auto'; el.style.top = ny + 'px'; el.style.right = 'auto';
      e.preventDefault();
    }, {passive:false});
    el.addEventListener('touchend', function(){ setTimeout(()=>{ _isDragging = false; }, 100); });
  }

  // ── Context (current verse/chapter) ─────────────
  var _context = null;
  function setContext(text, ref) {
    _context = { text, ref };
    var bar = document.getElementById('aiContextBar');
    var lbl = document.getElementById('aiCtxLabel');
    if (bar && lbl) { lbl.textContent = '📖 ' + ref; bar.classList.add('visible'); }
  }
  function clearContext() {
    _context = null;
    var bar = document.getElementById('aiContextBar');
    if (bar) bar.classList.remove('visible');
  }

  // ── Open / Close ─────────────────────────────────
  function open() {
    _isOpen = true;
    var panel = document.getElementById('aiPanel');
    if (panel) panel.classList.add('visible');
    var input = document.getElementById('aiInput');
    if (input) setTimeout(() => input.focus(), 50);
    var bubble = document.getElementById('aiBubble');
    if (bubble) bubble.classList.remove('pulse');

    if (!document.getElementById('aiMsgs')?.children.length) {
      addBotMsg("✝️ Peace be with you! I'm your AI Bible assistant.\n\nI can help you:\n• Explain verses & parables\n• Give historical context\n• Generate prayers\n• Find related passages\n• Answer any Bible question\n\nWhat would you like to explore?");
    }

    if (window.FBLOG) FBLOG('ai_assistant_open');
  }

  function close() {
    _isOpen = false;
    var panel = document.getElementById('aiPanel');
    if (panel) panel.classList.remove('visible');
  }

  function toggle() {
    if (_isDragging) return;
    _isOpen ? close() : open();
  }

  // ── Add message to chat ──────────────────────────
  function addUserMsg(text) {
    var msgs = document.getElementById('aiMsgs');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'ai-msg user';
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addBotMsg(text) {
    var msgs = document.getElementById('aiMsgs');
    if (!msgs) return;
    // Remove typing indicator
    var typing = msgs.querySelector('.typing');
    if (typing) msgs.removeChild(typing);

    var div = document.createElement('div');
    div.className = 'ai-msg bot';
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    var msgs = document.getElementById('aiMsgs');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'ai-msg bot typing';
    div.innerHTML = '<div class="ai-typing-dots"><span></span><span></span><span></span></div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Send message ──────────────────────────────────
  async function send() {
    var input = document.getElementById('aiInput');
    var btn = document.getElementById('aiSendBtn');
    if (!input || !btn) return;

    var text = input.value.trim();
    if (!text) return;

    input.value = ''; input.style.height = 'auto';
    addUserMsg(text);
    showTyping();
    btn.disabled = true;

    // Build message with context
    var userMsg = text;
    if (_context) {
      userMsg = `Context: "${_context.text}" (${_context.ref})\n\nUser question: ${text}`;
    }

    // Add to history
    _history.push({ role: 'user', content: userMsg });
    if (_history.length > 10) _history = _history.slice(-10); // keep last 10 turns

    try {
      var response = await callClaudeAPI(_history);
      addBotMsg(response);
      _history.push({ role: 'assistant', content: response });
      if (window.FBLOG) FBLOG('ai_question_asked');
    } catch(e) {
      addBotMsg('Sorry, I couldn\'t connect. Please check your internet and try again.');
    }

    btn.disabled = false;
  }

  function quickAsk(prompt) {
    var input = document.getElementById('aiInput');
    if (input) { input.value = prompt; send(); }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── Call Claude API via proxy ────────────────────
  async function callClaudeAPI(messages) {
    var SYSTEM = `You are a knowledgeable and compassionate Bible study assistant.
You help users understand the Bible — its verses, historical context, theological meaning, and practical applications.
You provide thoughtful, accurate, faith-affirming answers.
Keep responses concise but complete (max 3 paragraphs).
When discussing verses, always mention the biblical reference.
Always respond with warmth and spiritual insight.`;

    var res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: SYSTEM,
        messages: messages
      })
    });

    if (!res.ok) throw new Error('API error ' + res.status);
    var data = await res.json();
    return data.content?.[0]?.text || 'I couldn\'t generate a response. Please try again.';
  }

  // ── Init ─────────────────────────────────────────
  function init() {
    injectUI();
    // Expose context setter so verse actions can call it
    window.setAIContext = setContext;
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { toggle, open, close, send, quickAsk, handleKey, setContext, clearContext };
})();

window.AI_ASSISTANT = AI_ASSISTANT;
