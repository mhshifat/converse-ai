import { NextRequest } from 'next/server';

const EMBED_SCRIPT = `
(function() {
  var script = document.currentScript;
  var apiKey = script && (script.getAttribute('data-api-key') || script.dataset.apiKey);
  if (!apiKey) return;
  var baseUrl = (script && (script.getAttribute('data-base-url') || script.dataset.baseUrl)) || (script.src ? script.src.replace(/\\/embed\\.js.*$/, '') : '');
  if (!baseUrl) baseUrl = window.location.origin;
  var containerId = script && (script.getAttribute('data-container-id') || script.dataset.containerId);
  var openPanelOnLoad = script && (script.getAttribute('data-open-panel') === 'true' || script.dataset.openPanel === 'true');
  var playgroundCustomerId = script && (script.getAttribute('data-customer-id') || script.dataset.customerId);

  var customerId = playgroundCustomerId || ('cv_' + (sessionStorage.getItem('converseai_cid') || (function() {
    var id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('converseai_cid', id);
    return id;
  })()));

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
  var mode = 'chat';
  var config = {
    primaryColor: '#2563eb',
    welcomeMessage: 'How can I help?',
    position: 'bottom-right',
    name: 'Chat',
    bubble: { size: 56, borderRadius: 50, backgroundColor: '#2563eb', iconColor: '#ffffff', shadow: '0 4px 12px rgba(0,0,0,0.15)' },
    popup: { width: 380, height: 420, borderRadius: 16, shadow: '0 8px 32px rgba(0,0,0,0.12)', backgroundColor: '#ffffff' },
    header: { backgroundColor: '#ffffff', textColor: '#111111', fontSize: 16, title: 'Chat', showCloseButton: true, logoSize: 28 },
    footer: { borderColor: '#eeeeee', inputPlaceholder: 'Type a message...', inputBackground: '#ffffff', inputTextColor: '#111111', inputBorderRadius: 8, sendButtonBackground: '#2563eb', sendButtonTextColor: '#ffffff', sendButtonBorderRadius: 8 },
    messages: { welcomeTextColor: '#666666', userBubbleBackground: '#2563eb', userBubbleTextColor: '#ffffff', agentBubbleBackground: '#f0f0f0', agentBubbleTextColor: '#111111', bubbleBorderRadius: 12, fontSize: 14 }
  };
  var messages = [];
  var root = null;
  var panel = null;
  var listEl = null;
  var handoffMode = false;
  var conversationEnded = false;
  var pollIntervalId = null;
  function startHandoffPolling() {
    if (pollIntervalId) return;
    pollIntervalId = setInterval(function() {
      if (!conversationId) return;
      trpcQuery('widget.getMessages', { conversationId: conversationId }).then(function(res) {
        var data = res && res.result && res.result.data && res.result.data.json;
        if (!data || !data.messages) return;
        handoffMode = data.handoffRequested || !!data.assignedHumanAgentId;
        if (data.messages.length !== messages.length) {
          messages = data.messages.map(function(m) { return { sender: m.senderType, content: m.content }; });
          if (listEl) {
            var first = listEl.firstChild;
            while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
            if (messages.length === 0 && first) listEl.appendChild(first);
            else messages.forEach(function(msg) { appendMsg(msg.sender, msg.content, true); });
          }
        }
      });
    }, 3500);
  }
  function stopHandoffPolling() { if (pollIntervalId) { clearInterval(pollIntervalId); pollIntervalId = null; } }

  function merge(obj, def) {
    if (!obj) return def;
    var out = {};
    for (var k in def) out[k] = obj[k] !== undefined ? obj[k] : def[k];
    return out;
  }

  function injectStyles() {
    if (document.getElementById('converseai-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'converseai-widget-styles';
    style.textContent = '#converseai-root .cai-msg-user{animation: cai-in-u .3s ease-out both}#converseai-root .cai-msg-agent{animation: cai-in-a .3s ease-out both}@keyframes cai-in-u{from{opacity:0;transform:translateX(8px) scale(.96)}to{opacity:1;transform:translateX(0) scale(1)}}@keyframes cai-in-a{from{opacity:0;transform:translateX(-8px) scale(.96)}to{opacity:1;transform:translateX(0) scale(1)}}@keyframes cai-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.2)}}';
    document.head.appendChild(style);
  }

  function render() {
    if (root) return;
    injectStyles();
    if (containerId) {
      var containerEl = document.getElementById(containerId);
      if (!containerEl) return;
      root = document.createElement('div');
      root.id = 'converseai-root';
      root.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      containerEl.appendChild(root);
      if (!openPanelOnLoad) {
        var pos = config.position || 'bottom-right';
        var b = config.bubble || {};
        var btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Open chat');
        var bubbleBottom = pos.indexOf('bottom') !== -1 ? '16px' : 'auto';
        var bubbleTop = pos.indexOf('top') !== -1 ? '16px' : 'auto';
        var bubbleRight = pos.indexOf('right') !== -1 ? '16px' : 'auto';
        var bubbleLeft = pos.indexOf('left') !== -1 ? '16px' : 'auto';
        btn.style.cssText = 'position:absolute;bottom:' + bubbleBottom + ';top:' + bubbleTop + ';right:' + bubbleRight + ';left:' + bubbleLeft + ';width:' + (b.size || 56) + 'px;height:' + (b.size || 56) + 'px;border-radius:' + (b.borderRadius || 50) + '%;background:' + (b.backgroundColor || config.primaryColor) + ';color:' + (b.iconColor || '#fff') + ';border:none;cursor:pointer;font-size:24px;box-shadow:' + (b.shadow || '0 4px 12px rgba(0,0,0,0.15)') + ';display:flex;align-items:center;justify-content:center;transition:transform .2s;';
        btn.onmouseenter = function() { btn.style.transform = 'scale(1.1)'; };
        btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };
        btn.textContent = '💬';
        btn.onclick = openPanel;
        root.appendChild(btn);
      }
    } else {
      root = document.createElement('div');
      root.id = 'converseai-root';
      var pos = config.position || 'bottom-right';
      var b = config.bubble || {};
      var style = 'position:fixed;z-index:999999;';
      if (pos.indexOf('bottom') !== -1) style += 'bottom:24px;'; else style += 'top:24px;';
      if (pos.indexOf('right') !== -1) style += 'right:24px;'; else style += 'left:24px;';
      root.style.cssText = style;
      var btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Open chat');
      btn.style.cssText = 'width:' + (b.size || 56) + 'px;height:' + (b.size || 56) + 'px;border-radius:' + (b.borderRadius || 50) + '%;background:' + (b.backgroundColor || config.primaryColor) + ';color:' + (b.iconColor || '#fff') + ';border:none;cursor:pointer;font-size:24px;box-shadow:' + (b.shadow || '0 4px 12px rgba(0,0,0,0.15)') + ';display:flex;align-items:center;justify-content:center;transition:transform .2s;';
      btn.onmouseenter = function() { btn.style.transform = 'scale(1.1)'; };
      btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };
      btn.textContent = '💬';
      btn.onclick = openPanel;
      root.appendChild(btn);
      document.body.appendChild(root);
    }
  }

  function openPanel() {
    if (panel) { panel.style.display = 'flex'; return; }
    var p = config.popup || {};
    var h = config.header || {};
    var f = config.footer || {};
    panel = document.createElement('div');
    if (containerId && openPanelOnLoad) {
      panel.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:' + (p.backgroundColor || '#fff') + ';border-radius:' + (p.borderRadius || 16) + 'px;box-shadow:' + (p.shadow || '0 8px 32px rgba(0,0,0,0.12)') + ';display:flex;flex-direction:column;overflow:hidden;';
    } else {
      panel.style.cssText = 'position:absolute;bottom:' + (config.bubble && config.bubble.size ? config.bubble.size + 12 : 68) + 'px;right:0;width:' + (p.width || 380) + 'px;max-width:calc(100vw - 48px);height:' + (p.height || 420) + 'px;background:' + (p.backgroundColor || '#fff') + ';border-radius:' + (p.borderRadius || 16) + 'px;box-shadow:' + (p.shadow || '0 8px 32px rgba(0,0,0,0.12)') + ';display:flex;flex-direction:column;overflow:hidden;';
      if (config.position && config.position.indexOf('bottom') === -1) {
        panel.style.bottom = 'auto';
        panel.style.top = (config.bubble && config.bubble.size ? config.bubble.size + 12 : 68) + 'px';
      }
      if (config.position === 'bottom-left' || config.position === 'top-left') {
        panel.style.right = 'auto';
        panel.style.left = '0';
      }
    }
    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid ' + (f.borderColor || '#eee') + ';color:' + (h.textColor || '#111') + ';background:' + (h.backgroundColor || '#fff') + ';display:flex;align-items:center;justify-content:space-between;gap:12px;';
    var headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;min-width:0;';
    var logoSize = h.logoSize || 28;
    if (h.logoUrl) {
      var logoImg = document.createElement('img');
      logoImg.src = h.logoUrl;
      logoImg.alt = '';
      logoImg.style.cssText = 'width:' + logoSize + 'px;height:' + logoSize + 'px;object-fit:contain;flex-shrink:0;border-radius:4px;';
      headerLeft.appendChild(logoImg);
    }
    var titleBlock = document.createElement('div');
    titleBlock.style.cssText = 'min-width:0;';
    var titleSpan = document.createElement('span');
    titleSpan.textContent = h.title || config.name || 'Chat';
    titleSpan.style.cssText = 'display:block;font-weight:600;font-size:' + (h.fontSize || 16) + 'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    titleBlock.appendChild(titleSpan);
    if (h.subtitle) {
      var subSpan = document.createElement('span');
      subSpan.textContent = h.subtitle;
      subSpan.style.cssText = 'display:block;font-size:11px;opacity:0.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      titleBlock.appendChild(subSpan);
    }
    headerLeft.appendChild(titleBlock);
    header.appendChild(headerLeft);
    if (h.statusText) {
      var statusPill = document.createElement('div');
      statusPill.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.06);font-size:11px;font-weight:500;color:#666;flex-shrink:0;';
      var statusDot = document.createElement('span');
      statusDot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:' + (h.statusDotColor || '#22c55e') + ';animation:cai-pulse 2s ease-in-out infinite;';
      statusPill.appendChild(statusDot);
      statusPill.appendChild(document.createTextNode(h.statusText));
      header.appendChild(statusPill);
    }
    if (h.showCloseButton !== false && !(containerId && openPanelOnLoad)) {
      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:none;border:none;font-size:20px;cursor:pointer;color:#666;line-height:1;border-radius:50%;transition:background .15s, color .15s;';
      closeBtn.onmouseenter = function() { closeBtn.style.background = 'rgba(0,0,0,.06)'; closeBtn.style.color = '#111'; };
      closeBtn.onmouseleave = function() { closeBtn.style.background = 'none'; closeBtn.style.color = '#666'; };
      closeBtn.onclick = function() {
        panel.style.display = 'none';
        stopHandoffPolling();
        if (conversationId) {
          trpcMutate('widget.endConversation', { conversationId: conversationId }).catch(function(){});
        }
        conversationId = null;
        conversationEnded = false;
        messages = [];
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        if (listEl) {
          var m = config.messages || {};
          listEl.innerHTML = '<div style="display:flex;align-items:flex-start;gap:8px;color:' + (m.welcomeTextColor || '#666') + ';font-size:' + (m.fontSize || 14) + 'px;"><span style="margin-top:2px;flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.06);border-radius:50%;font-size:12px">✦</span><span style="line-height:1.4">' + (config.welcomeMessage || 'How can I help?') + '</span></div>';
        }
      };
      header.appendChild(closeBtn);
    }
    panel.appendChild(header);
    listEl = document.createElement('div');
    listEl.style.cssText = 'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:' + (p.backgroundColor || '#fff') + ';';
    panel.appendChild(listEl);
    var footerWrap = document.createElement('div');
    footerWrap.style.cssText = 'padding:12px;border-top:1px solid ' + (f.borderColor || '#eee') + ';background:' + (f.backgroundColor || '#fff') + ';';
    var voiceEnabled = config.voiceEnabled === true;
    if (voiceEnabled) {
      var toggleWrap = document.createElement('div');
      toggleWrap.style.cssText = 'display:flex;border-radius:8px;padding:2px;background:rgba(0,0,0,.06);margin-bottom:8px;';
      var chatTab = document.createElement('button');
      chatTab.textContent = '💬 Chat';
      chatTab.style.cssText = 'flex:1;padding:6px 10px;border:none;border-radius:6px;font-size:12px;cursor:pointer;background:' + (mode === 'chat' ? (f.sendButtonBackground || config.primaryColor) : 'transparent') + ';color:' + (mode === 'chat' ? (f.sendButtonTextColor || '#fff') : '#666') + ';font-weight:500;transition:background .2s, color .2s;';
      var voiceTab = document.createElement('button');
      voiceTab.textContent = '🎤 Voice';
      voiceTab.style.cssText = 'flex:1;padding:6px 10px;border:none;border-radius:6px;font-size:12px;cursor:pointer;background:' + (mode === 'voice' ? (f.sendButtonBackground || config.primaryColor) : 'transparent') + ';color:' + (mode === 'voice' ? (f.sendButtonTextColor || '#fff') : '#666') + ';font-weight:500;transition:background .2s, color .2s;';
      chatTab.onclick = function() { mode = 'chat'; chatTab.style.background = f.sendButtonBackground || config.primaryColor; chatTab.style.color = f.sendButtonTextColor || '#fff'; voiceTab.style.background = 'transparent'; voiceTab.style.color = '#666'; inputRow.style.display = 'flex'; voiceRow.style.display = 'none'; };
      voiceTab.onclick = function() { mode = 'voice'; voiceTab.style.background = f.sendButtonBackground || config.primaryColor; voiceTab.style.color = f.sendButtonTextColor || '#fff'; chatTab.style.background = 'transparent'; chatTab.style.color = '#666'; inputRow.style.display = 'none'; voiceRow.style.display = 'flex'; };
      toggleWrap.appendChild(chatTab);
      toggleWrap.appendChild(voiceTab);
      footerWrap.appendChild(toggleWrap);
    }
    var inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
    var inputWrap = document.createElement('div');
    inputWrap.style.cssText = 'flex:1;display:flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid #e5e5e5;border-radius:' + (Math.min((f.inputBorderRadius || 8) * 2, 24)) + 'px;background:' + (f.inputBackground || '#fff') + ';transition:box-shadow .2s;';
    inputWrap.onfocusin = function() { inputWrap.style.boxShadow = '0 0 0 2px ' + (f.sendButtonBackground || config.primaryColor) + '40'; };
    inputWrap.onfocusout = function() { inputWrap.style.boxShadow = 'none'; };
    var inputIcon = document.createElement('span');
    inputIcon.textContent = '✎';
    inputIcon.style.cssText = 'font-size:14px;color:#999;';
    var input = document.createElement('input');
    input.placeholder = f.inputPlaceholder || 'Type a message...';
    input.style.cssText = 'flex:1;min-width:0;padding:0;border:none;outline:none;font-size:14px;background:transparent;color:' + (f.inputTextColor || '#111') + ';';
    var sendBtn = document.createElement('button');
    sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    sendBtn.setAttribute('aria-label', 'Send');
    sendBtn.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;padding:0;background:' + (f.sendButtonBackground || config.primaryColor) + ';color:' + (f.sendButtonTextColor || '#fff') + ';border:none;border-radius:50%;cursor:pointer;box-shadow:0 2px 8px ' + (f.sendButtonBackground || config.primaryColor) + '40;transition:transform .15s, opacity .15s;';
    sendBtn.onmouseenter = function() { sendBtn.style.opacity = '0.9'; sendBtn.style.transform = 'scale(1.05)'; };
    sendBtn.onmouseleave = function() { sendBtn.style.opacity = '1'; sendBtn.style.transform = 'scale(1)'; };
    sendBtn.onmousedown = function() { sendBtn.style.transform = 'scale(0.95)'; };
    sendBtn.onmouseup = function() { sendBtn.style.transform = 'scale(1.05)'; };
    function showConversationEnded() {
      conversationEnded = true;
      conversationId = null;
      stopHandoffPolling();
      if (listEl) {
        var endedRow = document.createElement('div');
        endedRow.style.cssText = 'padding:12px 16px;border-radius:8px;background:rgba(0,0,0,.06);font-size:13px;color:#555;text-align:center;';
        endedRow.textContent = 'This conversation has ended. Close and open the chat again to start a new conversation.';
        listEl.appendChild(endedRow);
        listEl.scrollTop = listEl.scrollHeight;
      }
      if (input) input.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
    }
    function send() {
      if (conversationEnded) return;
      var text = (input.value || '').trim();
      if (!text) return;
      input.value = '';
      appendMsg('customer', text);
      if (conversationId) {
        trpcMutate('widget.sendMessage', { conversationId: conversationId, content: text }).then(function(res) {
          var result = res && res.result && res.result.data && res.result.data.json;
          if (result && result.response) appendMsg('agent', result.response);
          if (result && result.handoffRequested) {
            handoffMode = true;
            startHandoffPolling();
          }
          if (result && result.conversationEnded) showConversationEnded();
        });
      } else {
        trpcMutate('widget.sendFirstMessage', { apiKey: apiKey, customerId: customerId, channel: 'text', content: text }).then(function(res) {
          var result = res && res.result && res.result.data && res.result.data.json;
          if (result && result.conversationId) conversationId = result.conversationId;
          if (result && result.response) appendMsg('agent', result.response);
          if (result && result.handoffRequested) {
            handoffMode = true;
            startHandoffPolling();
          }
          if (result && result.conversationEnded) showConversationEnded();
        });
      }
    }
    input.onkeydown = function(e) { if (e.key === 'Enter') send(); };
    sendBtn.onclick = send;
    inputWrap.appendChild(inputIcon);
    inputWrap.appendChild(input);
    inputRow.appendChild(inputWrap);
    inputRow.appendChild(sendBtn);
    footerWrap.appendChild(inputRow);
    var voiceRow = document.createElement('div');
    voiceRow.style.cssText = 'display:none;align-items:center;justify-content:center;gap:10px;padding:12px;background:rgba(0,0,0,.04);border-radius:' + (f.inputBorderRadius || 8) + 'px;';
    var voiceBtn = document.createElement('button');
    voiceBtn.textContent = '🎤';
    voiceBtn.style.cssText = 'width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:24px;background:' + (f.sendButtonBackground || config.primaryColor) + ';color:' + (f.sendButtonTextColor || '#fff') + ';border:none;border-radius:50%;cursor:pointer;box-shadow:0 2px 12px ' + (f.sendButtonBackground || config.primaryColor) + '50;';
    var voiceLabel = document.createElement('span');
    voiceLabel.textContent = 'Tap to start voice';
    voiceLabel.style.cssText = 'font-size:12px;color:#666;font-weight:500;';
    voiceRow.appendChild(voiceBtn);
    voiceRow.appendChild(voiceLabel);
    footerWrap.appendChild(voiceRow);
    panel.appendChild(footerWrap);
    root.appendChild(panel);
    var m = config.messages || {};
    if (messages.length === 0) {
      listEl.innerHTML = '<div style="display:flex;align-items:flex-start;gap:8px;color:' + (m.welcomeTextColor || '#666') + ';font-size:' + (m.fontSize || 14) + 'px;"><span style="margin-top:2px;flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.06);border-radius:50%;font-size:12px">✦</span><span style="line-height:1.4">' + (config.welcomeMessage || 'How can I help?') + '</span></div>';
    } else {
      messages.forEach(function(msg) { appendMsg(msg.sender, msg.content, true); });
    }
    if (conversationId) {
      trpcQuery('widget.getMessages', { conversationId: conversationId }).then(function(res) {
        var data = res && res.result && res.result.data && res.result.data.json;
        if (data && (data.handoffRequested || data.assignedHumanAgentId)) { handoffMode = true; startHandoffPolling(); }
      });
    }
  }

  function appendMsg(sender, content, noPush) {
    if (!noPush) messages.push({ sender: sender, content: content });
    if (listEl && listEl.querySelector && listEl.childNodes.length === 1 && listEl.querySelector('div') && !listEl.querySelector('div').dataset.msg) listEl.innerHTML = '';
    if (!listEl) return;
    var m = config.messages || {};
    var isUser = sender === 'customer';
    if (sender === 'human_agent') sender = 'agent';
    var row = document.createElement('div');
    row.className = isUser ? 'cai-msg-user' : 'cai-msg-agent';
    row.style.cssText = 'display:flex;align-items:flex-end;gap:8px;' + (isUser ? 'flex-direction:row-reverse;align-self:flex-end;' : 'align-self:flex-start;');
    var bubble = document.createElement('div');
    bubble.style.cssText = 'max-width:85%;padding:10px 14px;border-radius:' + (m.bubbleBorderRadius || 12) + 'px;font-size:' + (m.fontSize || 14) + 'px;background:' + (isUser ? (m.userBubbleBackground || config.primaryColor) : (m.agentBubbleBackground || '#f0f0f0')) + ';color:' + (isUser ? (m.userBubbleTextColor || '#fff') : (m.agentBubbleTextColor || '#111')) + ';box-shadow:0 1px 3px rgba(0,0,0,.08);';
    bubble.textContent = content;
    var avatar = document.createElement('div');
    avatar.style.cssText = 'width:28px;height:28px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:' + (isUser ? (m.userBubbleBackground || config.primaryColor) : (m.agentBubbleBackground || '#f0f0f0')) + ';color:' + (isUser ? (m.userBubbleTextColor || '#fff') : (m.agentBubbleTextColor || '#111')) + ';';
    avatar.textContent = isUser ? 'U' : 'A';
    row.appendChild(bubble);
    row.appendChild(avatar);
    row.dataset.msg = '1';
    listEl.appendChild(row);
    listEl.scrollTop = listEl.scrollHeight;
  }

  trpcQuery('widget.getConfig', { apiKey: apiKey }).then(function(res) {
    var data = res && res.result && res.result.data && res.result.data.json;
    if (data) {
      if (data.name) config.name = data.name;
      if (data.config) {
        var c = data.config;
        if (c.primaryColor) config.primaryColor = c.primaryColor;
        if (c.welcomeMessage) config.welcomeMessage = c.welcomeMessage;
        if (c.position) config.position = c.position;
        if (c.voiceEnabled !== undefined) config.voiceEnabled = c.voiceEnabled;
        if (c.bubble) config.bubble = merge(c.bubble, config.bubble);
        if (c.popup) config.popup = merge(c.popup, config.popup);
        if (c.header) config.header = merge(c.header, config.header);
        if (c.footer) config.footer = merge(c.footer, config.footer);
        if (c.messages) config.messages = merge(c.messages, config.messages);
      }
    }
    render();
    if (openPanelOnLoad) openPanel();
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
