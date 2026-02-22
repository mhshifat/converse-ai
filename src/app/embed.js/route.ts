import { NextRequest } from 'next/server';

const EMBED_SCRIPT = `
(function() {
  var script = document.currentScript;
  var apiKey = script && (script.getAttribute('data-api-key') || script.dataset.apiKey);
  if (!apiKey) return;
  var baseUrl = (script && (script.getAttribute('data-base-url') || script.dataset.baseUrl)) || (script.src ? script.src.replace(/\\/embed\\.js.*$/, '') : '');
  if (!baseUrl) baseUrl = window.location.origin;

  var customerId = 'cv_' + (sessionStorage.getItem('converseai_cid') || (function() {
    var id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('converseai_cid', id);
    return id;
  })());

  function trpcQuery(path, input) {
    var q = encodeURIComponent(JSON.stringify({ json: input }));
    return fetch(baseUrl + '/api/trpc/' + path + '?input=' + q, { method: 'GET', credentials: 'omit' }).then(function(r) { return r.json(); });
  }
  function trpcMutate(path, input) {
    return fetch(baseUrl + '/api/trpc/' + path, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: input })
    }).then(function(r) { return r.json(); });
  }

  var conversationId = null;
  var config = { primaryColor: '#2563eb', welcomeMessage: 'How can I help?', position: 'bottom-right' };
  var messages = [];
  var root = null;
  var panel = null;
  var listEl = null;

  function render() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'converseai-root';
    var pos = config.position || 'bottom-right';
    var style = 'position:fixed;z-index:999999;';
    if (pos.indexOf('bottom') !== -1) style += 'bottom:24px;'; else style += 'top:24px;';
    if (pos.indexOf('right') !== -1) style += 'right:24px;'; else style += 'left:24px;';
    root.style.cssText = style;
    var btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Open chat');
    btn.style.cssText = 'width:56px;height:56px;border-radius:50%;background:' + config.primaryColor + ';color:#fff;border:none;cursor:pointer;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    btn.textContent = '💬';
    btn.onclick = openPanel;
    root.appendChild(btn);
    document.body.appendChild(root);
  }

  function openPanel() {
    if (panel) { panel.style.display = 'block'; return; }
    panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;bottom:70px;right:0;width:380px;max-width:calc(100vw - 48px);height:420px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.12);display:flex;flex-direction:column;overflow:hidden;';
    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid #eee;font-weight:600;color:#111;display:flex;align-items:center;justify-content:space-between;';
    var titleSpan = document.createElement('span');
    titleSpan.textContent = config.name || 'Chat';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = 'background:none;border:none;font-size:24px;cursor:pointer;color:#666;line-height:1;';
    closeBtn.onclick = function() {
      panel.style.display = 'none';
      if (conversationId) {
        trpcMutate('widget.endConversation', { conversationId: conversationId }).catch(function(){});
      }
    };
    header.appendChild(titleSpan);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    listEl = document.createElement('div');
    listEl.style.cssText = 'flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;';
    panel.appendChild(listEl);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;padding:12px;border-top:1px solid #eee;';
    var input = document.createElement('input');
    input.placeholder = 'Type a message...';
    input.style.cssText = 'flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;';
    var sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.style.cssText = 'padding:10px 16px;background:' + config.primaryColor + ';color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;';
    function send() {
      var text = (input.value || '').trim();
      if (!text || !conversationId) return;
      input.value = '';
      appendMsg('customer', text);
      trpcMutate('widget.sendMessage', { conversationId: conversationId, content: text }).then(function(res) {
        var result = res && res.result && res.result.data && res.result.data.json;
        if (result && result.response) appendMsg('agent', result.response);
      });
    }
    input.onkeydown = function(e) { if (e.key === 'Enter') send(); };
    sendBtn.onclick = send;
    row.appendChild(input);
    row.appendChild(sendBtn);
    panel.appendChild(row);
    root.appendChild(panel);
    if (messages.length === 0) {
      listEl.innerHTML = '<div style="color:#666;font-size:14px;">' + (config.welcomeMessage || 'How can I help?') + '</div>';
    } else {
      messages.forEach(function(m) { appendMsg(m.sender, m.content, true); });
    }
    if (!conversationId) {
      trpcMutate('widget.startConversation', { apiKey: apiKey, customerId: customerId, channel: 'text' }).then(function(res) {
        var data = res && res.result && res.result.data && res.result.data.json;
        if (data && data.id) { conversationId = data.id; }
      });
    }
  }

  function appendMsg(sender, content, noPush) {
    if (!noPush) messages.push({ sender: sender, content: content });
    if (listEl && listEl.querySelector && listEl.childNodes.length === 1 && listEl.querySelector('div') && !listEl.querySelector('div').dataset.msg) listEl.innerHTML = '';
    if (!listEl) return;
    var div = document.createElement('div');
    div.style.cssText = 'align-self:' + (sender === 'customer' ? 'flex-end' : 'flex-start') + ';max-width:85%;padding:8px 12px;border-radius:12px;font-size:14px;background:' + (sender === 'customer' ? config.primaryColor : '#f0f0f0') + ';color:' + (sender === 'customer' ? '#fff' : '#111') + ';';
    div.textContent = content;
    div.dataset.msg = '1';
    listEl.appendChild(div);
    listEl.scrollTop = listEl.scrollHeight;
  }

  trpcQuery('widget.getConfig', { apiKey: apiKey }).then(function(res) {
    var data = res && res.result && res.result.data && res.result.data.json;
    if (data) {
      if (data.config) {
        if (data.config.primaryColor) config.primaryColor = data.config.primaryColor;
        if (data.config.welcomeMessage) config.welcomeMessage = data.config.welcomeMessage;
        if (data.config.position) config.position = data.config.position;
      }
      if (data.name) config.name = data.name;
    }
    render();
  }).catch(function() { render(); });
})();
`.replace(/\n\s+/g, '\n').trim();

export async function GET(request: NextRequest) {
  return new Response(EMBED_SCRIPT, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
