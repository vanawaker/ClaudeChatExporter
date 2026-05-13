(() => {
  'use strict';

  // Claude.ai DOM contract (verified 2026-05-11):
  //   user      → <div data-testid="user-message" class="... !font-user-message ...">
  //   assistant → <div class="font-claude-response ..."> — note this class also
  //               appears on nested child wrappers of the same message, so we
  //               keep only top-level matches (no font-claude-response ancestor).
  // If either count drops to 0 on a real conversation page, the contract changed.
  // Run window.cceDebug() in the DevTools console for selector hit counts.

  const SEL = {
    user: '[data-testid="user-message"]',
    assistant: '[class*="font-claude-response"]',
  };

  const BTN_ID = 'cce-export-btn';
  const BOX_WIDTH = 60;

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
    out += '  CLAUDE 对话导出\n';
    out += '  ' + title + '\n';
    out += '  导出时间 · ' + stamp + '\n';
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
      alert('Claude Chat Exporter: 没找到对话。\n打开 DevTools Console 运行 cceDebug()，把输出贴到 issue：\nhttps://github.com/vanawaker/claude-chat-exporter/issues');
      return;
    }

    const messages = pairs
      .map(p => ({ role: p.role, text: extractText(p.el) }))
      .filter(m => m.text);

    if (!messages.length) {
      alert('Claude Chat Exporter: 找到节点但抽不出文本。');
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
    btn.textContent = '导出 .txt';
    btn.title = 'Export this Claude conversation to .txt';
    Object.assign(btn.style, {
      position: 'fixed',
      top: '12px',
      right: '220px',
      zIndex: '99999',
      padding: '6px 12px',
      background: '#c96442',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,.18)',
      transition: 'background .15s ease',
    });
    btn.addEventListener('mouseenter', () => btn.style.background = '#b15536');
    btn.addEventListener('mouseleave', () => btn.style.background = '#c96442');
    btn.addEventListener('click', doExport);
    return btn;
  }

  function ensureButton() {
    if (document.getElementById(BTN_ID)) return;
    if (document.body) document.body.appendChild(makeButton());
  }

  // ---------- Debug helper ----------

  window.cceDebug = function () {
    console.group('[CCE] DOM diagnostic');
    console.log(`user "${SEL.user}":      ${document.querySelectorAll(SEL.user).length} matches`);
    console.log(`assistant "${SEL.assistant}": ${document.querySelectorAll(SEL.assistant).length} matches`);
    const u = document.querySelector(SEL.user);
    if (u) console.log('first user:', u);
    const a = document.querySelector(SEL.assistant);
    if (a) console.log('first assistant:', a);
    console.groupEnd();
    return 'See group above. Zero counts on a real conversation page means Claude.ai changed its DOM.';
  };

  // ---------- Init ----------

  function init() {
    ensureButton();
    new MutationObserver(() => ensureButton())
      .observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
