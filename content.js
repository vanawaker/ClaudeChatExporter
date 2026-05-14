(() => {
  'use strict';

  // Claude.ai DOM contract (verified 2026-05-11):
  //   user      → <div data-testid="user-message" class="... !font-user-message ...">
  //   assistant → <div class="font-claude-response ..."> — note this class also
  //               appears on nested child wrappers of the same message, so we
  //               keep only top-level matches (no font-claude-response ancestor).
  //   share btn → <button aria-label="Share"> in the conversation header. Used
  //               as the visual anchor: the export button is positioned just
  //               below it and inherits its size + corner radius.
  // If user/assistant counts drop to 0 on a real conversation page, the contract
  // changed. Run window.cceDebug() in the DevTools console for selector hits.

  const SEL = {
    user: '[data-testid="user-message"]',
    assistant: '[class*="font-claude-response"]',
    share: [
      'button[aria-label*="Share" i]',
      'button[data-testid*="share" i]',
      '[role="button"][aria-label*="Share" i]',
    ],
  };

  const BTN_ID = 'cce-export-btn';
  const BOX_WIDTH = 60;

  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  const ICON_URL = browserAPI.runtime.getURL('icons/icon-128.png');

  // ---------- Detection ----------

  function collectMessages() {
    const userMsgs = Array.from(document.querySelectorAll(SEL.user))
      .map(el => ({ el, role: 'user' }));

    const asstMsgs = Array.from(document.querySelectorAll(SEL.assistant))
      .filter(el => !el.parentElement?.closest(SEL.assistant))
      .map(el => ({ el, role: 'assistant' }));

    return sortByDomOrder([...userMsgs, ...asstMsgs]);
  }

  function sortByDomOrder(nodes) {
    return nodes.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }

  function findShareButton() {
    for (const s of SEL.share) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function isConversationPath() {
    const p = location.pathname;
    if (p === '/new' || p === '/new/') return true;
    return p.startsWith('/chat/')
        || p.startsWith('/chats/')
        || p.startsWith('/project/');
  }

  // ---------- Text extraction ----------

  function extractText(el) {
    const clone = el.cloneNode(true);

    clone.querySelectorAll('button, [role="button"], [aria-hidden="true"]').forEach(n => n.remove());

    clone.querySelectorAll('pre').forEach(pre => {
      const code = pre.innerText.replace(/\n+$/, '');
      const indented = code.split('\n').map(l => '    ' + l).join('\n');
      const wrap = document.createElement('div');
      wrap.textContent = '\n' + indented + '\n';
      pre.replaceWith(wrap);
    });

    clone.querySelectorAll('code').forEach(c => {
      if (c.closest('pre')) return;
      c.textContent = '`' + c.textContent + '`';
    });

    const text = (clone.innerText || clone.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    return text;
  }

  // ---------- Formatting ----------

  function format(title, messages) {
    const stamp = new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16);
    const bar = '═'.repeat(BOX_WIDTH);

    let out = '';
    out += bar + '\n';
    out += '  Claude Conversation Export\n';
    out += '  ' + title + '\n';
    out += '  Exported · ' + stamp + '\n';
    out += bar + '\n\n\n';

    for (const m of messages) {
      const label = m.role.toUpperCase();
      const head = '┌─ ' + label + ' ' + '─'.repeat(Math.max(0, BOX_WIDTH - 4 - label.length));
      const body = m.text.split('\n').map(l => l.length ? '  ' + l : '').join('\n');
      const foot = '└' + '─'.repeat(BOX_WIDTH - 1);
      out += head + '\n\n' + body + '\n\n' + foot + '\n\n\n';
    }
    return out;
  }

  // ---------- Metadata helpers ----------

  function getTitle() {
    const candidates = ['header h1', '[data-testid="conversation-title"]'];
    for (const s of candidates) {
      const el = document.querySelector(s);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return (document.title || '').replace(/\s*[-–|·]\s*Claude.*$/i, '').trim() || 'Untitled';
  }

  function sanitize(name) {
    return name.replace(/[\/\\:*?"<>|]/g, '_').replace(/\s+/g, ' ').slice(0, 80).trim();
  }

  function dateStamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  // ---------- Download ----------

  function download(content, filename) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Orchestration ----------

  function doExport() {
    const pairs = collectMessages();
    if (!pairs.length) {
      console.warn('[CCE] no messages found. Run cceDebug() to diagnose.');
      alert('Claude Chat Exporter: no messages found.\nOpen DevTools Console, run cceDebug(), and paste the output into a new issue:\nhttps://github.com/vanawaker/ClaudeChatExporter/issues');
      return;
    }

    const messages = pairs
      .map(p => ({ role: p.role, text: extractText(p.el) }))
      .filter(m => m.text);

    if (!messages.length) {
      alert('Claude Chat Exporter: found message nodes but could not extract any text.');
      return;
    }

    const title = getTitle();
    const filename = `claude-${sanitize(title)}-${dateStamp()}.txt`;
    download(format(title, messages), filename);
    console.info(`[CCE] exported ${messages.length} messages → ${filename}`);
  }

  // ---------- Button injection ----------

  function makeButton() {
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.title = 'Export this Claude conversation to .txt';
    btn.setAttribute('aria-label', 'Export conversation to .txt');

    const img = document.createElement('img');
    img.src = ICON_URL;
    img.alt = '';
    img.draggable = false;
    Object.assign(img.style, {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      pointerEvents: 'none',
      display: 'block',
    });
    btn.appendChild(img);

    Object.assign(btn.style, {
      position: 'fixed',
      top: '60px',
      right: '20px',
      zIndex: '99999',
      width: '32px',
      height: '32px',
      padding: '0',
      background: 'transparent',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      overflow: 'hidden',
      transition: 'transform .12s ease, opacity .12s ease',
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.08)';
      btn.style.opacity = '0.88';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.opacity = '1';
    });
    btn.addEventListener('click', doExport);
    return btn;
  }

  function placeFallback(btn) {
    btn.style.top = '60px';
    btn.style.right = '20px';
    btn.style.left = 'auto';
    btn.style.width = '32px';
    btn.style.height = '32px';
    btn.style.borderRadius = '8px';
  }

  function alignToShare(btn) {
    const share = findShareButton();
    if (share) {
      const r = share.getBoundingClientRect();
      if (r.width && r.height) {
        btn.style.top = (r.bottom + 8) + 'px';
        btn.style.left = r.left + 'px';
        btn.style.right = 'auto';
        btn.style.width = r.width + 'px';
        btn.style.height = r.height + 'px';
        const radius = window.getComputedStyle(share).borderRadius;
        if (radius) btn.style.borderRadius = radius;
        return;
      }
    }
    placeFallback(btn);
  }

  function isConversationContext() {
    if (!isConversationPath()) return false;
    if (findShareButton()) return true;
    if (document.querySelector(SEL.user)) return true;
    if (document.querySelector(SEL.assistant)) return true;
    return false;
  }

  function ensureButton() {
    let btn = document.getElementById(BTN_ID);
    if (!isConversationContext()) {
      if (btn) btn.style.display = 'none';
      return;
    }
    if (!btn) {
      if (!document.body) return;
      btn = makeButton();
      document.body.appendChild(btn);
    } else {
      btn.style.display = '';
    }
    alignToShare(btn);
  }

  // ---------- Debug helper ----------

  window.cceDebug = function () {
    console.group('[CCE] DOM diagnostic');
    console.log(`user "${SEL.user}":      ${document.querySelectorAll(SEL.user).length} matches`);
    console.log(`assistant "${SEL.assistant}": ${document.querySelectorAll(SEL.assistant).length} matches`);
    console.log(`path: ${location.pathname} (conversation context: ${isConversationContext()})`);
    console.log(`share button: ${findShareButton() ? 'found' : 'not found'}`);
    const u = document.querySelector(SEL.user);
    if (u) console.log('first user:', u);
    const a = document.querySelector(SEL.assistant);
    if (a) console.log('first assistant:', a);
    console.groupEnd();
    return 'See group above. Zero user/assistant counts on a real conversation page means Claude.ai changed its DOM.';
  };

  // ---------- Init ----------

  let observer = null;

  function init() {
    try {
      ensureButton();

      if (!observer) {
        // SPA navigation + streaming responses fire many mutations per second.
        // Throttle to one ensureButton() per animation frame to keep it cheap.
        let scheduled = false;
        observer = new MutationObserver(() => {
          if (scheduled) return;
          scheduled = true;
          requestAnimationFrame(() => {
            scheduled = false;
            ensureButton();
          });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('resize', ensureButton);
        // pageshow covers BFCache restore when the user hits browser back/forward.
        window.addEventListener('pageshow', ensureButton);
      }
    } catch (err) {
      console.error('[CCE] init error', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
