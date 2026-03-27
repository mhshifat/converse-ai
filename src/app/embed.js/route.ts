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

  var voiceSignalingWsUrl = __CAI_VOICE_WS__;

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
  /** Unwrap tRPC v11 + superjson body (single result or batch array). */
  function trpcUnwrap(res) {
    if (res == null) return { error: 'Network error', data: null };
    var body = Array.isArray(res) && res.length ? res[0] : res;
    if (body && body.error) {
      var e = body.error;
      var msg = 'Something went wrong';
      if (e && typeof e === 'object') {
        if (e.json && e.json.message) msg = String(e.json.message);
        else if (e.message) msg = String(e.message);
      }
      return { error: msg, data: null };
    }
    if (!body || !body.result || !body.result.data) return { error: null, data: null };
    var d = body.result.data;
    var data = d && typeof d === 'object' && Object.prototype.hasOwnProperty.call(d, 'json') ? d.json : d;
    return { error: null, data: data };
  }
  var voiceCurrentAudio = null;
  var voicePlayingAgentAudio = false;
  function stopVoiceAgentOutput() {
    if (voiceCurrentAudio) {
      try {
        voiceCurrentAudio.pause();
        voiceCurrentAudio.src = '';
      } catch (e) {}
      voiceCurrentAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    voicePlayingAgentAudio = false;
  }
  function browserTtsFallback(text) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      voicePlayingAgentAudio = true;
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1;
      u.onend = function() { voicePlayingAgentAudio = false; if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel(); };
      u.onerror = function() { voicePlayingAgentAudio = false; if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel(); };
      window.speechSynthesis.speak(u);
    }
  }
  function playAgentSpeech(text) {
    trpcMutate('widget.synthesizeSpeech', { apiKey: apiKey, text: text }).then(function(res) {
      var u = trpcUnwrap(res);
      var data = u.data;
      if (!data || !data.audioBase64) { browserTtsFallback(text); if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel(); return; }
      try {
        var binary = atob(data.audioBase64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        var blob = new Blob([bytes], { type: 'audio/wav' });
        var url = URL.createObjectURL(blob);
        var audio = new Audio(url);
        voiceCurrentAudio = audio;
        voicePlayingAgentAudio = true;
        if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
        audio.onended = function() {
          URL.revokeObjectURL(url);
          voiceCurrentAudio = null;
          voicePlayingAgentAudio = false;
          if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
        };
        audio.onerror = function() {
          URL.revokeObjectURL(url);
          voiceCurrentAudio = null;
          voicePlayingAgentAudio = false;
          browserTtsFallback(text);
          if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
        };
        audio.play().catch(function() {
          voiceCurrentAudio = null;
          voicePlayingAgentAudio = false;
          browserTtsFallback(text);
          if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
        });
      } catch (e) {
        voicePlayingAgentAudio = false;
        browserTtsFallback(text);
        if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
      }
    }).catch(function() {
      voicePlayingAgentAudio = false;
      browserTtsFallback(text);
      if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
    });
  }

  function caiMixDownToMono(audioBuffer) {
    var len = audioBuffer.length;
    var out = new Float32Array(len);
    var n = audioBuffer.numberOfChannels;
    for (var i = 0; i < n; i++) {
      var ch = audioBuffer.getChannelData(i);
      for (var j = 0; j < len; j++) out[j] += ch[j];
    }
    for (var k = 0; k < len; k++) out[k] /= n;
    return out;
  }
  function caiEncodeWav(samples, sampleRate, numChannels) {
    var numSamples = samples.length * numChannels;
    var dataSize = numSamples * 2;
    var buffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(buffer);
    var pos = 0;
    function setUint32(o, v) { view.setUint32(o, v, true); }
    function str(s) {
      for (var i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
      pos += s.length;
    }
    str('RIFF');
    setUint32(pos, 36 + dataSize);
    pos += 4;
    str('WAVE');
    str('fmt ');
    setUint32(pos, 16);
    pos += 4;
    view.setUint16(pos, 1, true);
    pos += 2;
    view.setUint16(pos, numChannels, true);
    pos += 2;
    setUint32(pos, sampleRate);
    pos += 4;
    setUint32(pos, sampleRate * numChannels * 2);
    pos += 4;
    view.setUint16(pos, numChannels * 2, true);
    pos += 2;
    view.setUint16(pos, 16, true);
    pos += 2;
    str('data');
    setUint32(pos, dataSize);
    pos += 4;
    for (var si = 0; si < samples.length; si++) {
      var v = Math.max(-1, Math.min(1, samples[si]));
      view.setInt16(pos, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      pos += 2;
    }
    return buffer;
  }
  function caiBlobToBase64(blob) {
    return new Promise(function(resolve, reject) {
      var r = new FileReader();
      r.onloadend = function() {
        var s = String(r.result || '');
        var i = s.indexOf(',');
        resolve(i >= 0 ? s.slice(i + 1) : '');
      };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }
  function caiRecordingToWav(blob) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { reject(new Error('no ctx')); return; }
        var ctx = new AC();
        ctx.decodeAudioData(reader.result.slice(0), function(buffer) {
          ctx.close();
          var sampleRate = buffer.sampleRate;
          var channelData = buffer.numberOfChannels > 1 ? caiMixDownToMono(buffer) : buffer.getChannelData(0);
          var wavBuf = caiEncodeWav(channelData, sampleRate, 1);
          resolve(new Blob([wavBuf], { type: 'audio/wav' }));
        }, reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  var refreshVoiceFooterLabel = function() {};

  var conversationId = null;
  var mode = 'chat';
  var config = {
    primaryColor: '#2563eb',
    welcomeMessage: 'How can I help?',
    position: 'bottom-right',
    widgetInsetTopPx: 0,
    widgetInsetRightPx: 0,
    widgetInsetBottomPx: 0,
    widgetInsetLeftPx: 0,
    voiceEnabled: false,
    showPoweredBy: true,
    attachmentsEnabled: false,
    embedHiddenPaths: [],
    defaultRatingType: 'thumbs',
    proactiveWelcomeEnabled: false,
    proactiveWelcomeDelaySeconds: 0,
    proactiveWelcomeStatus: '',
    proactiveWelcomeCtaLabel: 'Chat with us',
    proactiveWelcomeAvatarUrl: undefined,
    name: 'Chat',
    bubble: { size: 56, borderRadius: 50, backgroundColor: '#2563eb', iconColor: '#ffffff', shadow: '0 4px 12px rgba(0,0,0,0.15)' },
    popup: { width: 380, height: 420, borderRadius: 16, shadow: '0 8px 32px rgba(0,0,0,0.12)', backgroundColor: '#ffffff' },
    header: { backgroundColor: '#ffffff', textColor: '#111111', fontSize: 16, title: 'Chat', showCloseButton: true, logoSize: 28 },
    footer: { backgroundColor: '#ffffff', borderColor: '#eeeeee', inputPlaceholder: 'Type a message...', inputBackground: '#ffffff', inputTextColor: '#111111', inputBorderRadius: 8, sendButtonBackground: '#2563eb', sendButtonTextColor: '#ffffff', sendButtonBorderRadius: 8 },
    messages: { welcomeTextColor: '#666666', userBubbleBackground: '#2563eb', userBubbleTextColor: '#ffffff', agentBubbleBackground: '#f0f0f0', agentBubbleTextColor: '#111111', bubbleBorderRadius: 12, fontSize: 14 }
  };
  var messages = [];
  var root = null;
  var panel = null;
  var listEl = null;
  var handoffMode = false;
  var assignedHumanAgentId = null;
  var handoffStatusEl = null;
  var conversationEnded = false;
  var endedFlowEl = null;
  var endedConversationId = null;
  var ratingSubmitted = false;
  var pollIntervalId = null;
  var voiceStream = null;
  var voiceRecorder = null;
  var voiceChunks = [];
  var voiceMimeType = 'audio/webm';
  var voiceAudioCtx = null;
  var voiceAnalyser = null;
  var voiceSilenceIntervalId = null;
  var voiceIsRecording = false;
  var voiceHasSpeech = false;
  var voiceSilenceStart = null;
  var voiceDiscardChunks = false;
  var voiceRestartRecorder = function() {};
  var voiceTranscribePending = false;
  var voiceSendPending = false;
  var voiceLabelEl = null;
  var voiceBtnEl = null;
  var voiceHandoffWs = null;
  var voiceHandoffPc = null;
  var voiceHandoffAudioEl = null;
  var voiceHandoffLocalStream = null;
  var voiceHandoffMicFromVoiceRecorder = false;
  function stopVoiceHandoffLocalMicIfOwned() {
    if (voiceHandoffLocalStream && !voiceHandoffMicFromVoiceRecorder) {
      try {
        voiceHandoffLocalStream.getTracks().forEach(function (t) {
          t.stop();
        });
      } catch (eMic) {}
    }
    voiceHandoffLocalStream = null;
    voiceHandoffMicFromVoiceRecorder = false;
  }
  var liveVoiceConnected = false;
  function removeEndedFlow() {
    if (endedFlowEl && endedFlowEl.parentNode) endedFlowEl.parentNode.removeChild(endedFlowEl);
    endedFlowEl = null;
  }
  function updateHandoffStatus() {
    if (!handoffStatusEl) return;
    if (!handoffMode) { handoffStatusEl.style.display = 'none'; handoffStatusEl.textContent = ''; return; }
    handoffStatusEl.style.display = 'block';
    handoffStatusEl.textContent = assignedHumanAgentId ? 'Connected to support agent' : 'Looking for an agent... Please hold.';
  }
  function startHandoffPolling() {
    if (pollIntervalId) return;
    pollIntervalId = setInterval(function() {
      if (!conversationId) return;
      trpcQuery('widget.getMessages', { conversationId: conversationId }).then(function(res) {
        var u = trpcUnwrap(res);
        var data = u.data;
        if (!data || !data.messages) return;
        handoffMode = data.handoffRequested || !!data.assignedHumanAgentId;
        assignedHumanAgentId = data.assignedHumanAgentId || null;
        updateHandoffStatus();
        if (data.messages.length !== messages.length) {
          messages = data.messages.map(function(m) { return { sender: m.senderType, content: m.content }; });
          if (listEl) {
            var first = listEl.firstChild;
            while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
            if (messages.length === 0 && first) listEl.appendChild(first);
            else messages.forEach(function(msg) { appendMsg(msg.sender, msg.content, true); });
          }
        }
        if (!conversationEnded) startHandoffWebRtcIfNeeded();
      });
    }, 3500);
  }
  function stopHandoffPolling() { if (pollIntervalId) { clearInterval(pollIntervalId); pollIntervalId = null; } }

  function tearDownHandoffWebRtc() {
    liveVoiceConnected = false;
    if (voiceHandoffWs) {
      try {
        voiceHandoffWs.onclose = null;
        voiceHandoffWs.onerror = null;
        voiceHandoffWs.onmessage = null;
        voiceHandoffWs.close();
      } catch (e) {}
      voiceHandoffWs = null;
    }
    if (voiceHandoffPc) {
      try { voiceHandoffPc.close(); } catch (e2) {}
      voiceHandoffPc = null;
    }
    stopVoiceHandoffLocalMicIfOwned();
    if (voiceHandoffAudioEl) {
      try {
        voiceHandoffAudioEl.pause();
        if (voiceHandoffAudioEl.srcObject) {
          var ts = voiceHandoffAudioEl.srcObject.getTracks();
          for (var ti = 0; ti < ts.length; ti++) ts[ti].stop();
        }
        voiceHandoffAudioEl.srcObject = null;
        voiceHandoffAudioEl.remove();
      } catch (e3) {}
      voiceHandoffAudioEl = null;
    }
    if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
  }

  function startHandoffWebRtcIfNeeded() {
    if (!voiceSignalingWsUrl || voiceSignalingWsUrl === '') {
      tearDownHandoffWebRtc();
      return;
    }
    if (!conversationId || !handoffMode || mode !== 'voice' || conversationEnded) {
      tearDownHandoffWebRtc();
      return;
    }
    if (typeof WebSocket === 'undefined' || typeof RTCPeerConnection === 'undefined') return;
    if (
      voiceHandoffWs &&
      voiceHandoffWs._caiConvoId === conversationId &&
      (voiceHandoffWs.readyState === 0 || voiceHandoffWs.readyState === 1)
    ) {
      return;
    }
    tearDownHandoffWebRtc();
    var base = voiceSignalingWsUrl;
    var url = base.indexOf('ws://') === 0 || base.indexOf('wss://') === 0 ? base : 'wss://' + base;
    var ws;
    try {
      ws = new WebSocket(url);
    } catch (e4) {
      return;
    }
    voiceHandoffWs = ws;
    ws._caiConvoId = conversationId;
    ws.onopen = function () {
      try {
        ws.send(JSON.stringify({ type: 'join', conversationId: conversationId, role: 'customer' }));
      } catch (e5) {}
    };
    ws.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'joined' || data.type === 'error') return;
        if (data.type === 'offer' && data.sdp) {
          var pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          voiceHandoffPc = pc;
          var audio = document.createElement('audio');
          audio.setAttribute('playsinline', 'true');
          audio.autoplay = true;
          audio.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
          (panel || document.body).appendChild(audio);
          voiceHandoffAudioEl = audio;
          pc.ontrack = function (e) {
            if (e.streams && e.streams[0]) {
              audio.srcObject = e.streams[0];
              liveVoiceConnected = true;
              if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
            }
          };
          pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
            .then(function () {
              var useRecorder =
                voiceIsRecording &&
                voiceStream &&
                voiceStream.getAudioTracks().some(function (t) {
                  return t.readyState === 'live';
                });
              if (useRecorder) {
                voiceHandoffMicFromVoiceRecorder = true;
                voiceHandoffLocalStream = null;
                voiceStream.getAudioTracks().forEach(function (track) {
                  if (track.readyState === 'live') pc.addTrack(track, voiceStream);
                });
                return;
              }
              voiceHandoffMicFromVoiceRecorder = false;
              return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                voiceHandoffLocalStream = stream;
                stream.getAudioTracks().forEach(function (track) {
                  pc.addTrack(track, stream);
                });
              });
            })
            .then(function () {
              return pc.createAnswer();
            })
            .then(function (answer) {
              return pc.setLocalDescription(answer);
            })
            .then(function () {
              ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
              pc.onicecandidate = function (iceEv) {
                if (iceEv.candidate) {
                  try {
                    ws.send(JSON.stringify({ type: 'ice-candidate', candidate: iceEv.candidate }));
                  } catch (e6) {}
                }
              };
            })
            .catch(function () {
              stopVoiceHandoffLocalMicIfOwned();
              try {
                pc.close();
              } catch (eFail) {}
              if (voiceHandoffPc === pc) voiceHandoffPc = null;
              if (voiceHandoffAudioEl) {
                try {
                  voiceHandoffAudioEl.pause();
                  voiceHandoffAudioEl.srcObject = null;
                  voiceHandoffAudioEl.remove();
                } catch (eAe) {}
                voiceHandoffAudioEl = null;
              }
            });
          return;
        }
        if (data.type === 'ice-candidate' && data.candidate) {
          var p = voiceHandoffPc;
          if (p) p.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(function () {});
        }
      } catch (err) {}
    };
    ws.onclose = function () {
      liveVoiceConnected = false;
      if (voiceHandoffPc) {
        try { voiceHandoffPc.close(); } catch (e7) {}
        voiceHandoffPc = null;
      }
      stopVoiceHandoffLocalMicIfOwned();
      if (voiceHandoffAudioEl) {
        try {
          voiceHandoffAudioEl.pause();
          voiceHandoffAudioEl.srcObject = null;
          voiceHandoffAudioEl.remove();
        } catch (e8) {}
        voiceHandoffAudioEl = null;
      }
      if (voiceHandoffWs === ws) voiceHandoffWs = null;
      if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
    };
    ws.onerror = function () {
      liveVoiceConnected = false;
      try { ws.close(); } catch (e9) {}
    };
  }

  /** Shallow merge patch into base; includes keys that exist only on patch (merge() did not — it dropped e.g. header.subtitle, logoUrl). */
  function assignSection(base, patch) {
    if (!patch || typeof patch !== 'object') return base;
    var out = {};
    for (var k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k) && patch[k] !== undefined) out[k] = patch[k];
    }
    return out;
  }

  function caiClampOffsetPx(v) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) n = 0;
    if (n < -80) n = -80;
    if (n > 400) n = 400;
    return n;
  }
  function caiWidgetInset(key) {
    return caiClampOffsetPx(config[key]);
  }

  function caiNormalizeEmbedHiddenPathsFromServer(arr) {
    var out = [];
    if (!arr || !arr.length) return out;
    var maxN = 100;
    var maxLen = 512;
    for (var i = 0; i < arr.length && out.length < maxN; i++) {
      var hs = arr[i];
      if (typeof hs !== 'string') continue;
      var ht = hs.trim();
      if (!ht) continue;
      var hp = ht.replace(/\\s+/g, '');
      if (!hp) continue;
      if (hp.charAt(0) !== '/') hp = '/' + hp.replace(/^\\/+/,'');
      hp = hp.replace(/\\/+$/, '') || '/';
      if (hp.length > maxLen) hp = hp.slice(0, maxLen);
      out.push(hp);
    }
    return out;
  }

  function caiShouldHideEmbedForPath() {
    var list = config.embedHiddenPaths;
    if (!list || !list.length) return false;
    var path = '/';
    try {
      path = window.location && window.location.pathname ? window.location.pathname : '/';
    } catch (ePath) {}
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p || typeof p !== 'string') continue;
      if (path === p) return true;
      if (p !== '/' && path.indexOf(p + '/') === 0) return true;
    }
    return false;
  }

  /** Inline SVGs aligned with dashboard ChatbotPreview (Lucide v0.574 paths, ISC). */
  function caiSvg(innerPaths, sizePx) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(sizePx));
    svg.setAttribute('height', String(sizePx));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = innerPaths;
    return svg;
  }
  var CAI = {
    msg: '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>',
    pen: '<path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    spark: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2" fill="currentColor" stroke="none"/>',
    mic: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
    user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    clip: '<path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"/>',
    thumbUp: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8.99a2 2 0 0 1-1.94 1.45H10a2 2 0 0 1-2-2v-7"/>',
    thumbDown: '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8.99A2 2 0 0 1 6.15 2H14a2 2 0 0 1 2 2v7"/>'
  };
  /** Converse mark (same geometry as shared/converse-logo.tsx); white on dark square like ChatbotPreview. */
  function appendConverseMarkLogo(logoBox, iconPx) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(iconPx));
    svg.setAttribute('height', String(iconPx));
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.innerHTML =
      '<rect x="4" y="6" width="12" height="8" rx="4" ry="4" fill="currentColor" fill-opacity="0.95"/><path d="M7 14.5 L5 18 L9 16 Z" fill="currentColor" fill-opacity="0.95"/><circle cx="16" cy="12" r="2.25" fill="currentColor" fill-opacity="0.9"/><rect x="18" y="14" width="10" height="6" rx="3" ry="3" fill="currentColor" fill-opacity="0.85"/><path d="M22 14.5 L20 11 L24 13 Z" fill="currentColor" fill-opacity="0.85"/>';
    logoBox.appendChild(svg);
  }
  function caiEscapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }
  function caiWelcomeRowHtml(m, welcomeRaw) {
    var text = welcomeRaw == null || welcomeRaw === '' ? 'How can I help?' : String(welcomeRaw);
    var sparkSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">' + CAI.spark + '</svg>';
    return '<div style="display:flex;align-items:flex-start;gap:8px;color:' + (m.welcomeTextColor || '#666') + ';font-size:' + (m.fontSize || 14) + 'px;"><span style="margin-top:2px;flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.06);border-radius:50%;color:' + (m.welcomeTextColor || '#666') + '">' + sparkSvg + '</span><span style="line-height:1.4">' + caiEscapeHtml(text) + '</span></div>';
  }

  function injectStyles() {
    if (document.getElementById('converseai-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'converseai-widget-styles';
    style.textContent = '#converseai-root .cai-msg-user{animation: cai-in-u .3s ease-out both}#converseai-root .cai-msg-agent{animation: cai-in-a .3s ease-out both}@keyframes cai-in-u{from{opacity:0;transform:translateX(8px) scale(.96)}to{opacity:1;transform:translateX(0) scale(1)}}@keyframes cai-in-a{from{opacity:0;transform:translateX(-8px) scale(.96)}to{opacity:1;transform:translateX(0) scale(1)}}@keyframes cai-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.2)}}@keyframes cai-welcome-in{from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}';
    document.head.appendChild(style);
  }

  var welcomeCardEl = null;
  function showProactiveWelcome() {
    if (sessionStorage.getItem('converseai_welcome_shown') === '1') return;
    if (!root || welcomeCardEl || panel) return;
    var p = config.popup || {};
    var m = config.messages || {};
    var f = config.footer || {};
    var b = config.bubble || {};
    var bubbleSize = b.size || 56;
    var primary = config.primaryColor || '#2563eb';
    var pos = config.position || 'bottom-right';
    var offset = bubbleSize + 10;
    var textColor = m.welcomeTextColor || '#333';
    var textColorMuted = 'rgba(0,0,0,0.55)';
    welcomeCardEl = document.createElement('div');
    welcomeCardEl.setAttribute('aria-live', 'polite');
    welcomeCardEl.setAttribute('role', 'status');
    var cardStyle = 'width:320px;max-width:calc(100vw - 48px);background:' + (p.backgroundColor || '#fff') + ';border-radius:' + (Math.min((p.borderRadius || 16), 28)) + 'px;box-shadow:0 24px 48px -12px rgba(0,0,0,0.18),0 12px 24px -8px rgba(0,0,0,0.1),0 0 0 1px rgba(0,0,0,0.04);border-top:3px solid ' + primary + ';animation:cai-welcome-in .4s cubic-bezier(0.34,1.56,0.64,1) both;position:absolute;z-index:2;overflow:hidden;';
    if (pos === 'bottom-right') cardStyle += 'bottom:' + offset + 'px;right:0;';
    else if (pos === 'bottom-left') cardStyle += 'bottom:' + offset + 'px;left:0;';
    else if (pos === 'top-right') cardStyle += 'top:' + offset + 'px;right:0;';
    else cardStyle += 'top:' + offset + 'px;left:0;';
    welcomeCardEl.style.cssText = cardStyle;
    var topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;align-items:flex-start;gap:14px;padding:18px 18px 0 18px;';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.appendChild(caiSvg(CAI.x, 16));
    closeBtn.style.cssText = 'flex-shrink:0;width:28px;height:28px;padding:0;border:none;background:transparent;color:' + textColor + ';opacity:0.5;line-height:1;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:opacity .2s, background .2s;';
    closeBtn.onmouseenter = function() { closeBtn.style.opacity = '1'; closeBtn.style.background = 'rgba(0,0,0,.06)'; };
    closeBtn.onmouseleave = function() { closeBtn.style.opacity = '0.5'; closeBtn.style.background = 'transparent'; };
    closeBtn.onclick = function() {
      try { sessionStorage.setItem('converseai_welcome_shown', '1'); } catch (e) {}
      if (welcomeCardEl && welcomeCardEl.parentNode) welcomeCardEl.parentNode.removeChild(welcomeCardEl);
      welcomeCardEl = null;
    };
    topRow.appendChild(closeBtn);
    var textBlock = document.createElement('div');
    textBlock.style.cssText = 'flex:1;min-width:0;padding-top:2px;';
    var headline = document.createElement('div');
    headline.style.cssText = 'color:' + textColor + ';font-size:' + (m.fontSize ? m.fontSize + 2 : 17) + 'px;font-weight:700;line-height:1.3;margin-bottom:6px;letter-spacing:-0.01em;';
    headline.textContent = config.welcomeMessage || 'Do you have any question?';
    textBlock.appendChild(headline);
    if (config.proactiveWelcomeStatus) {
      var statusLine = document.createElement('div');
      statusLine.style.cssText = 'color:' + textColorMuted + ';font-size:' + (m.fontSize || 14) + 'px;line-height:1.4;';
      statusLine.textContent = config.proactiveWelcomeStatus;
      textBlock.appendChild(statusLine);
    }
    topRow.appendChild(textBlock);
    if (config.proactiveWelcomeAvatarUrl) {
      var avatar = document.createElement('img');
      avatar.src = config.proactiveWelcomeAvatarUrl;
      avatar.alt = '';
      avatar.style.cssText = 'width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;';
      topRow.appendChild(avatar);
    }
    welcomeCardEl.appendChild(topRow);
    var divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:' + (f.borderColor || 'rgba(0,0,0,0.06)') + ';margin:16px 18px 0 18px;';
    welcomeCardEl.appendChild(divider);
    var ctaWrap = document.createElement('div');
    ctaWrap.style.cssText = 'padding:16px 18px 18px;text-align:center;';
    var ctaBtn = document.createElement('button');
    ctaBtn.type = 'button';
    ctaBtn.textContent = config.proactiveWelcomeCtaLabel || 'Chat with us';
    ctaBtn.style.cssText = 'width:100%;padding:12px 20px;border:none;border-radius:12px;background:' + primary + ';color:#fff;font-size:' + (m.fontSize || 14) + 'px;font-weight:600;cursor:pointer;letter-spacing:0.02em;box-shadow:0 4px 14px ' + primary + '40;transition:transform .2s, box-shadow .2s, opacity .2s;';
    ctaBtn.onmouseenter = function() { ctaBtn.style.transform = 'translateY(-1px)'; ctaBtn.style.boxShadow = '0 6px 20px ' + primary + '50'; };
    ctaBtn.onmouseleave = function() { ctaBtn.style.transform = 'translateY(0)'; ctaBtn.style.boxShadow = '0 4px 14px ' + primary + '40'; };
    ctaBtn.onclick = function() {
      try { sessionStorage.setItem('converseai_welcome_shown', '1'); } catch (e) {}
      if (welcomeCardEl && welcomeCardEl.parentNode) welcomeCardEl.parentNode.removeChild(welcomeCardEl);
      welcomeCardEl = null;
      openPanel();
    };
    ctaWrap.appendChild(ctaBtn);
    welcomeCardEl.appendChild(ctaWrap);
    root.appendChild(welcomeCardEl);
  }
  function hideProactiveWelcome() {
    if (welcomeCardEl && welcomeCardEl.parentNode) welcomeCardEl.parentNode.removeChild(welcomeCardEl);
    welcomeCardEl = null;
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
        var bpad = 16;
        var btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Open chat');
        var bubbleBottom = pos.indexOf('bottom') !== -1 ? bpad + caiWidgetInset('widgetInsetBottomPx') + 'px' : 'auto';
        var bubbleTop = pos.indexOf('top') !== -1 ? bpad + caiWidgetInset('widgetInsetTopPx') + 'px' : 'auto';
        var bubbleRight = pos.indexOf('right') !== -1 ? bpad + caiWidgetInset('widgetInsetRightPx') + 'px' : 'auto';
        var bubbleLeft = pos.indexOf('left') !== -1 ? bpad + caiWidgetInset('widgetInsetLeftPx') + 'px' : 'auto';
        btn.style.cssText = 'position:absolute;bottom:' + bubbleBottom + ';top:' + bubbleTop + ';right:' + bubbleRight + ';left:' + bubbleLeft + ';width:' + (b.size || 56) + 'px;height:' + (b.size || 56) + 'px;border-radius:' + (b.borderRadius || 50) + '%;background:' + (b.backgroundColor || config.primaryColor) + ';color:' + (b.iconColor || '#fff') + ';border:none;cursor:pointer;box-shadow:' + (b.shadow || '0 4px 12px rgba(0,0,0,0.15)') + ';display:flex;align-items:center;justify-content:center;transition:transform .2s;';
        btn.onmouseenter = function() { btn.style.transform = 'scale(1.1)'; };
        btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };
        btn.appendChild(caiSvg(CAI.msg, Math.round((b.size || 56) * 0.43)));
        btn.onclick = openPanel;
        root.appendChild(btn);
      }
    } else {
      root = document.createElement('div');
      root.id = 'converseai-root';
      var pos = config.position || 'bottom-right';
      var b = config.bubble || {};
      var rpad = 24;
      var style = 'position:fixed;z-index:999999;';
      if (pos.indexOf('bottom') !== -1) style += 'bottom:' + (rpad + caiWidgetInset('widgetInsetBottomPx')) + 'px;';
      else style += 'top:' + (rpad + caiWidgetInset('widgetInsetTopPx')) + 'px;';
      if (pos.indexOf('right') !== -1) style += 'right:' + (rpad + caiWidgetInset('widgetInsetRightPx')) + 'px;';
      else style += 'left:' + (rpad + caiWidgetInset('widgetInsetLeftPx')) + 'px;';
      root.style.cssText = style;
      var btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Open chat');
      btn.style.cssText = 'width:' + (b.size || 56) + 'px;height:' + (b.size || 56) + 'px;border-radius:' + (b.borderRadius || 50) + '%;background:' + (b.backgroundColor || config.primaryColor) + ';color:' + (b.iconColor || '#fff') + ';border:none;cursor:pointer;box-shadow:' + (b.shadow || '0 4px 12px rgba(0,0,0,0.15)') + ';display:flex;align-items:center;justify-content:center;transition:transform .2s;';
      btn.onmouseenter = function() { btn.style.transform = 'scale(1.1)'; };
      btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };
      btn.appendChild(caiSvg(CAI.msg, Math.round((b.size || 56) * 0.43)));
      btn.onclick = openPanel;
      root.appendChild(btn);
      document.body.appendChild(root);
    }
  }

  function openPanel() {
    hideProactiveWelcome();
    if (panel) {
      panel.style.display = 'flex';
      if (!conversationEnded) startHandoffWebRtcIfNeeded();
      return;
    }
    var p = config.popup || {};
    var h = config.header || {};
    var f = config.footer || {};
    var mcfg = config.messages || {};
    var footerBorder = f.borderColor || '#eeeeee';
    var tabTrackBg = footerBorder.length === 7 && footerBorder.charAt(0) === '#' ? footerBorder + '40' : 'rgba(0,0,0,0.06)';
    var voiceAreaBg = footerBorder.length === 7 && footerBorder.charAt(0) === '#' ? footerBorder + '30' : 'rgba(0,0,0,0.04)';
    var iconMuted = mcfg.welcomeTextColor || '#666666';
    var voiceEnabled = config.voiceEnabled === true;

    function endVoiceEmbedSession() {
      stopVoiceAgentOutput();
      tearDownHandoffWebRtc();
      if (voiceSilenceIntervalId) {
        clearInterval(voiceSilenceIntervalId);
        voiceSilenceIntervalId = null;
      }
      if (voiceRecorder && voiceRecorder.state !== 'inactive') {
        try { voiceRecorder.stop(); } catch (e) {}
      }
      voiceRecorder = null;
      if (voiceStream) {
        voiceStream.getTracks().forEach(function (t) { t.stop(); });
        voiceStream = null;
      }
      if (voiceAudioCtx) {
        try { voiceAudioCtx.close(); } catch (e) {}
        voiceAudioCtx = null;
      }
      voiceAnalyser = null;
      voiceChunks = [];
      voiceIsRecording = false;
      voiceHasSpeech = false;
      voiceSilenceStart = null;
      voiceDiscardChunks = false;
      if (voiceBtnEl) {
        voiceBtnEl.style.background = f.sendButtonBackground || config.primaryColor;
        voiceBtnEl.style.boxShadow = '0 2px 12px ' + (f.sendButtonBackground || config.primaryColor) + '50';
        voiceBtnEl.setAttribute('aria-label', 'Start voice call');
      }
      if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
    }

    function applyWidgetSendResult(result, sendMessageCid) {
      if (!result) {
        appendMsg('agent', 'Something went wrong. Please try again.');
        return;
      }
      var reply = result.response;
      var hasReply = typeof reply === 'string' ? reply.trim().length > 0 : !!reply;
      if (hasReply) {
        var replyText = typeof reply === 'string' ? reply.trim() : reply;
        appendMsg('agent', replyText);
        if (voiceEnabled && mode === 'voice') playAgentSpeech(replyText);
      } else if (result.handoffRequested) {
        appendMsg(
          'agent',
          'Thanks — we are connecting you with a team member. Someone will reply here shortly.'
        );
      } else {
        appendMsg(
          'agent',
          'Thanks for your message. A team member will reply here shortly.'
        );
      }
      if (result.handoffRequested) {
        handoffMode = true;
        updateHandoffStatus();
        startHandoffPolling();
      }
      if (!result.conversationEnded) startHandoffWebRtcIfNeeded();
      if (result.conversationEnded) {
        endedConversationId = sendMessageCid != null ? sendMessageCid : result.conversationId;
        conversationId = null;
        conversationEnded = true;
        ratingSubmitted = false;
        endVoiceEmbedSession();
        showConversationEnded();
      }
    }

    function sendCustomerText(text, attachmentUrl, channel) {
      var ch = channel === 'call' ? 'call' : 'text';
      if (voiceEnabled && mode === 'voice') {
        voiceSendPending = true;
        if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
      }
      if (conversationId) {
        var cidSend = conversationId;
        trpcMutate('widget.sendMessage', { conversationId: conversationId, content: text, attachmentUrl: attachmentUrl || undefined }).then(function (res) {
          voiceSendPending = false;
          if (voiceEnabled && mode === 'voice' && typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
          var u = trpcUnwrap(res);
          if (u.error) {
            appendMsg('agent', u.error);
            return;
          }
          if (u.data == null) {
            appendMsg('agent', 'Could not load a reply. Please try again.');
            return;
          }
          applyWidgetSendResult(u.data, cidSend);
        }).catch(function () {
          voiceSendPending = false;
          if (voiceEnabled && mode === 'voice' && typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
          appendMsg('agent', 'Could not reach the chat service. Check your connection and try again.');
        });
      } else {
        trpcMutate('widget.sendFirstMessage', {
          apiKey: apiKey,
          customerId: customerId,
          channel: ch,
          content: text,
          attachmentUrl: attachmentUrl || undefined,
        }).then(function (res) {
          voiceSendPending = false;
          if (voiceEnabled && mode === 'voice' && typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
          var u = trpcUnwrap(res);
          if (u.error) {
            appendMsg('agent', u.error);
            return;
          }
          var result = u.data;
          if (result && result.unavailable) {
            appendMsg('agent', result.message || 'We are unable to take your message at the moment. Please try again later.');
            return;
          }
          if (result && result.conversationId) {
            conversationId = result.conversationId;
            conversationEnded = false;
            endedConversationId = null;
            ratingSubmitted = false;
            removeEndedFlow();
          }
          if (result == null) {
            appendMsg('agent', 'Could not start the conversation. Please try again.');
            return;
          }
          applyWidgetSendResult(result, null);
        }).catch(function () {
          voiceSendPending = false;
          if (voiceEnabled && mode === 'voice' && typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
          appendMsg('agent', 'Could not reach the chat service. Check your connection and try again.');
        });
      }
    }

    function processVoiceRecordedBlob(blob) {
      if (!apiKey || conversationEnded) return;
      if (!voiceIsRecording) return;
      if (!blob || blob.size <= 0) return;
      if (handoffMode && liveVoiceConnected) return;
      voiceTranscribePending = true;
      if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
      caiRecordingToWav(blob)
        .then(function (wavBlob) {
          return caiBlobToBase64(wavBlob).then(function (b64) {
            return { b64: b64, ct: 'audio/wav' };
          });
        })
        .catch(function () {
          return caiBlobToBase64(blob).then(function (b64) {
            return { b64: b64, ct: blob.type || 'audio/webm' };
          });
        })
        .then(function (payload) {
          return trpcMutate('widget.transcribeVoice', {
            apiKey: apiKey,
            audioBase64: payload.b64,
            contentType: payload.ct,
          });
        })
        .then(function (res) {
          voiceTranscribePending = false;
          if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
          var u = trpcUnwrap(res);
          var data = u.data;
          var text = (data && data.text ? String(data.text) : '').trim() || '(no speech detected)';
          appendMsg('customer', text);
          sendCustomerText(text, undefined, 'call');
        })
        .catch(function () {
          voiceTranscribePending = false;
          if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
        });
    }

    panel = document.createElement('div');
    if (containerId && openPanelOnLoad) {
      panel.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:' + (p.backgroundColor || '#fff') + ';border-radius:' + (p.borderRadius || 16) + 'px;box-shadow:' + (p.shadow || '0 8px 32px rgba(0,0,0,0.12)') + ';display:flex;flex-direction:column;overflow:hidden;';
    } else {
      var ppos = config.position || 'bottom-right';
      var pbsz = config.bubble && config.bubble.size ? config.bubble.size + 12 : 68;
      var pyBottom = pbsz + caiWidgetInset('widgetInsetBottomPx');
      var pyTop = pbsz + caiWidgetInset('widgetInsetTopPx');
      var pxRight = caiWidgetInset('widgetInsetRightPx');
      var pxLeft = caiWidgetInset('widgetInsetLeftPx');
      var pbottom = ppos.indexOf('bottom') !== -1 ? pyBottom + 'px' : 'auto';
      var ptop = ppos.indexOf('top') !== -1 ? pyTop + 'px' : 'auto';
      var pright = ppos.indexOf('right') !== -1 ? pxRight + 'px' : 'auto';
      var pleft = ppos.indexOf('left') !== -1 ? pxLeft + 'px' : 'auto';
      panel.style.cssText =
        'position:absolute;bottom:' +
        pbottom +
        ';top:' +
        ptop +
        ';right:' +
        pright +
        ';left:' +
        pleft +
        ';width:' +
        (p.width || 380) +
        'px;max-width:calc(100vw - 48px);height:' +
        (p.height || 420) +
        'px;background:' +
        (p.backgroundColor || '#fff') +
        ';border-radius:' +
        (p.borderRadius || 16) +
        'px;box-shadow:' +
        (p.shadow || '0 8px 32px rgba(0,0,0,0.12)') +
        ';display:flex;flex-direction:column;overflow:hidden;';
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
    } else {
      var logoBox = document.createElement('span');
      logoBox.style.cssText =
        'flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;width:' +
        logoSize +
        'px;height:' +
        logoSize +
        'px;background:#111111;color:#ffffff;';
      appendConverseMarkLogo(logoBox, Math.round(logoSize * 0.6));
      headerLeft.appendChild(logoBox);
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
      closeBtn.innerHTML = '';
      closeBtn.appendChild(caiSvg(CAI.x, 18));
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:#666;line-height:1;border-radius:50%;transition:background .15s, color .15s;';
      closeBtn.onmouseenter = function() { closeBtn.style.background = 'rgba(0,0,0,.06)'; closeBtn.style.color = '#111'; };
      closeBtn.onmouseleave = function() { closeBtn.style.background = 'none'; closeBtn.style.color = '#666'; };
      closeBtn.onclick = function() {
        endVoiceEmbedSession();
        panel.style.display = 'none';
        stopHandoffPolling();
        if (conversationId) {
          trpcMutate('widget.endConversation', { conversationId: conversationId }).catch(function(){});
        }
        conversationId = null;
        conversationEnded = false;
        endedConversationId = null;
        ratingSubmitted = false;
        removeEndedFlow();
        messages = [];
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        if (listEl) {
          var m = config.messages || {};
          listEl.innerHTML = caiWelcomeRowHtml(m, config.welcomeMessage || 'How can I help?');
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
    if (voiceEnabled) {
      var toggleWrap = document.createElement('div');
      toggleWrap.style.cssText = 'display:flex;border-radius:8px;padding:2px;background:' + tabTrackBg + ';margin-bottom:8px;';
      var chatTab = document.createElement('button');
      chatTab.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:4px;padding:6px 10px;border:none;border-radius:6px;font-size:12px;cursor:pointer;background:' + (mode === 'chat' ? (f.sendButtonBackground || config.primaryColor) : 'transparent') + ';color:' + (mode === 'chat' ? (f.sendButtonTextColor || '#fff') : iconMuted) + ';font-weight:500;transition:background .2s, color .2s;';
      chatTab.appendChild(caiSvg(CAI.msg, 14));
      chatTab.appendChild(document.createTextNode('Chat'));
      var voiceTab = document.createElement('button');
      voiceTab.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:4px;padding:6px 10px;border:none;border-radius:6px;font-size:12px;cursor:pointer;background:' + (mode === 'voice' ? (f.sendButtonBackground || config.primaryColor) : 'transparent') + ';color:' + (mode === 'voice' ? (f.sendButtonTextColor || '#fff') : iconMuted) + ';font-weight:500;transition:background .2s, color .2s;';
      voiceTab.appendChild(caiSvg(CAI.mic, 14));
      voiceTab.appendChild(document.createTextNode('Voice'));
      chatTab.onclick = function() {
        endVoiceEmbedSession();
        mode = 'chat';
        chatTab.style.background = f.sendButtonBackground || config.primaryColor;
        chatTab.style.color = f.sendButtonTextColor || '#fff';
        voiceTab.style.background = 'transparent';
        voiceTab.style.color = iconMuted;
        inputRow.style.display = 'flex';
        voiceRow.style.display = 'none';
      };
      voiceTab.onclick = function() {
        mode = 'voice';
        voiceTab.style.background = f.sendButtonBackground || config.primaryColor;
        voiceTab.style.color = f.sendButtonTextColor || '#fff';
        chatTab.style.background = 'transparent';
        chatTab.style.color = iconMuted;
        inputRow.style.display = 'none';
        voiceRow.style.display = 'flex';
        if (typeof refreshVoiceFooterLabel === 'function') refreshVoiceFooterLabel();
        startHandoffWebRtcIfNeeded();
      };
      toggleWrap.appendChild(chatTab);
      toggleWrap.appendChild(voiceTab);
      footerWrap.appendChild(toggleWrap);
    }
    var inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
    var inputWrap = document.createElement('div');
    inputWrap.style.cssText = 'flex:1;display:flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid ' + footerBorder + ';border-radius:' + (Math.min((f.inputBorderRadius || 8) * 2, 24)) + 'px;background:' + (f.inputBackground || '#fff') + ';transition:box-shadow .2s;';
    inputWrap.onfocusin = function() { inputWrap.style.boxShadow = '0 0 0 2px ' + (f.sendButtonBackground || config.primaryColor) + '40'; };
    inputWrap.onfocusout = function() { inputWrap.style.boxShadow = 'none'; };
    var inputIcon = document.createElement('span');
    inputIcon.style.cssText = 'display:flex;align-items:center;justify-content:center;color:' + iconMuted + ';flex-shrink:0;';
    inputIcon.appendChild(caiSvg(CAI.pen, 16));
    var input = document.createElement('input');
    input.placeholder = f.inputPlaceholder || 'Type a message...';
    input.style.cssText = 'flex:1;min-width:0;padding:0;border:none;outline:none;font-size:14px;background:transparent;color:' + (f.inputTextColor || '#111') + ';';
    var sendBtn = document.createElement('button');
    sendBtn.innerHTML = '';
    sendBtn.appendChild(caiSvg(CAI.send, 18));
    sendBtn.setAttribute('aria-label', 'Send');
    sendBtn.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;padding:0;background:' + (f.sendButtonBackground || config.primaryColor) + ';color:' + (f.sendButtonTextColor || '#fff') + ';border:none;border-radius:50%;cursor:pointer;box-shadow:0 2px 8px ' + (f.sendButtonBackground || config.primaryColor) + '40;transition:transform .15s, opacity .15s;';
    sendBtn.onmouseenter = function() { sendBtn.style.opacity = '0.9'; sendBtn.style.transform = 'scale(1.05)'; };
    sendBtn.onmouseleave = function() { sendBtn.style.opacity = '1'; sendBtn.style.transform = 'scale(1)'; };
    sendBtn.onmousedown = function() { sendBtn.style.transform = 'scale(0.95)'; };
    sendBtn.onmouseup = function() { sendBtn.style.transform = 'scale(1.05)'; };
    function send(attachmentUrl) {
      var text = (input.value || '').trim() || (attachmentUrl ? '(attachment)' : '');
      if (!text) return;
      input.value = '';
      appendMsg('customer', text);
      sendCustomerText(text, attachmentUrl, 'text');
    }
    input.onkeydown = function(e) { if (e.key === 'Enter') send(); };
    sendBtn.onclick = function() { send(); };
    if (config.attachmentsEnabled) {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*,.pdf,.txt';
      fileInput.style.display = 'none';
      fileInput.onchange = function() {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        fileInput.value = '';
        var fd = new FormData();
        fd.append('apiKey', apiKey);
        fd.append('file', file);
        fetch(baseUrl + '/api/widget/upload', { method: 'POST', body: fd }).then(function(r) { return r.json(); }).then(function(data) {
          if (data && data.url) send(data.url);
        });
      };
      var attachBtn = document.createElement('button');
      attachBtn.type = 'button';
      attachBtn.setAttribute('aria-label', 'Attach file');
      attachBtn.style.cssText = 'flex-shrink:0;padding:4px;border:none;background:none;cursor:pointer;color:' + iconMuted + ';opacity:0.7;font-size:14px;';
      attachBtn.innerHTML = '';
      attachBtn.appendChild(caiSvg(CAI.clip, 18));
      attachBtn.onclick = function() { fileInput.click(); };
      inputWrap.insertBefore(attachBtn, inputWrap.firstChild);
      inputRow.appendChild(fileInput);
    }
    inputWrap.appendChild(inputIcon);
    inputWrap.appendChild(input);
    inputRow.appendChild(inputWrap);
    inputRow.appendChild(sendBtn);
    footerWrap.appendChild(inputRow);
    var voiceRow = document.createElement('div');
    voiceRow.style.cssText = 'display:none;align-items:center;justify-content:center;gap:10px;padding:12px;background:' + voiceAreaBg + ';border-radius:' + (f.inputBorderRadius || 8) + 'px;';
    var voiceBtn = document.createElement('button');
    voiceBtn.style.cssText = 'width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:' + (f.sendButtonBackground || config.primaryColor) + ';color:' + (f.sendButtonTextColor || '#fff') + ';border:none;border-radius:50%;cursor:pointer;box-shadow:0 2px 12px ' + (f.sendButtonBackground || config.primaryColor) + '50;';
    voiceBtn.appendChild(caiSvg(CAI.mic, 24));
    var voiceLabel = document.createElement('span');
    voiceLabel.textContent = 'Tap to start voice';
    voiceLabel.style.cssText = 'font-size:12px;color:' + iconMuted + ';font-weight:500;';
    voiceRow.appendChild(voiceBtn);
    voiceRow.appendChild(voiceLabel);
    voiceLabelEl = voiceLabel;
    voiceBtnEl = voiceBtn;
    voiceBtn.setAttribute('aria-label', 'Start voice call');
    refreshVoiceFooterLabel = function () {
      if (!voiceLabelEl || !voiceEnabled) return;
      voiceLabelEl.style.cssText =
        'font-size:12px;color:' + iconMuted + ';font-weight:500;max-width:180px;text-align:center;line-height:1.35;';
      if (!voiceIsRecording) {
        if (conversationEnded) {
          voiceLabelEl.textContent = 'Conversation ended — switch to Chat to type a new message';
        } else if (handoffMode && voiceSignalingWsUrl && liveVoiceConnected) {
          voiceLabelEl.textContent = 'Live voice connected — tap mic to speak with your agent';
        } else if (handoffMode && voiceSignalingWsUrl) {
          voiceLabelEl.textContent = 'Connecting live voice… (waiting for agent)';
        } else {
          voiceLabelEl.textContent = 'Start call — tap the mic, speak, pause for a reply';
        }
      } else if (liveVoiceConnected && handoffMode) {
        voiceLabelEl.textContent = 'Live voice — speak to your agent';
      } else if (voicePlayingAgentAudio) {
        voiceLabelEl.textContent = 'Agent speaking…';
      } else if (voiceTranscribePending || voiceSendPending) {
        voiceLabelEl.textContent = 'Sending…';
      } else {
        voiceLabelEl.textContent = 'Listening… speak, then pause to get a reply';
      }
    };
    function startVoiceEmbedSession() {
      if (voiceIsRecording || conversationEnded) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
        if (voiceLabelEl) voiceLabelEl.textContent = 'Voice not supported in this browser';
        return;
      }
      var VOICE_SILENCE_MS = 800;
      var VOICE_CHECK_MS = 150;
      var VOICE_VOLUME_THRESHOLD = 0.01;
      var VOICE_SLICE_MS = 300;
      var silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAA==';
      var unlock = new Audio(silentWav);
      unlock.volume = 0;
      unlock.play().catch(function () {});
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        voiceStream = stream;
        voiceChunks = [];
        voiceHasSpeech = false;
        voiceSilenceStart = null;
        voiceMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        function onDataAvailable(e) {
          if (voiceDiscardChunks) return;
          if (e.data && e.data.size > 0) voiceChunks.push(e.data);
        }
        function doRestartRecorder() {
          var s = voiceStream;
          var oldRec = voiceRecorder;
          if (!s) return;
          voiceDiscardChunks = true;
          if (oldRec && oldRec.state !== 'inactive') {
            try { oldRec.stop(); } catch (e2) {}
          }
          voiceChunks = [];
          voiceHasSpeech = false;
          voiceSilenceStart = null;
          var fresh = new MediaRecorder(s);
          fresh.ondataavailable = onDataAvailable;
          fresh.start(VOICE_SLICE_MS);
          voiceRecorder = fresh;
          setTimeout(function () { voiceDiscardChunks = false; }, 0);
        }
        voiceRestartRecorder = doRestartRecorder;
        var recorder = new MediaRecorder(stream);
        recorder.ondataavailable = onDataAvailable;
        recorder.start(VOICE_SLICE_MS);
        voiceRecorder = recorder;
        var AC = window.AudioContext || window.webkitAudioContext;
        var ctx = new AC();
        voiceAudioCtx = ctx;
        var srcNode = ctx.createMediaStreamSource(stream);
        var analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        srcNode.connect(analyser);
        voiceAnalyser = analyser;
        var dataArray = new Uint8Array(analyser.frequencyBinCount);
        voiceSilenceIntervalId = setInterval(function () {
          var rec = voiceRecorder;
          var anal = voiceAnalyser;
          if (!rec || rec.state !== 'recording' || !anal) return;
          anal.getByteTimeDomainData(dataArray);
          var sum = 0;
          for (var vi = 0; vi < dataArray.length; vi++) {
            var n = (dataArray[vi] - 128) / 128;
            sum += n * n;
          }
          var rms = Math.sqrt(sum / dataArray.length);
          if (rms > VOICE_VOLUME_THRESHOLD && voicePlayingAgentAudio) {
            stopVoiceAgentOutput();
            voiceHasSpeech = true;
            voiceSilenceStart = null;
            doRestartRecorder();
            refreshVoiceFooterLabel();
            return;
          }
          if (voicePlayingAgentAudio) return;
          if (rms > VOICE_VOLUME_THRESHOLD) {
            voiceHasSpeech = true;
            voiceSilenceStart = null;
            return;
          }
          if (!voiceHasSpeech || voiceChunks.length === 0) return;
          var now = Date.now();
          if (voiceSilenceStart === null) {
            voiceSilenceStart = now;
            return;
          }
          if (now - voiceSilenceStart < VOICE_SILENCE_MS) return;
          var chunks = voiceChunks.slice();
          voiceChunks = [];
          voiceHasSpeech = false;
          voiceSilenceStart = null;
          var vblob = new Blob(chunks, { type: voiceMimeType });
          if (vblob.size > 0) processVoiceRecordedBlob(vblob);
          doRestartRecorder();
        }, VOICE_CHECK_MS);
        voiceIsRecording = true;
        if (voiceBtnEl) {
          voiceBtnEl.style.background = '#dc2626';
          voiceBtnEl.style.boxShadow = '0 2px 12px #dc262650';
          voiceBtnEl.setAttribute('aria-label', 'End call');
        }
        refreshVoiceFooterLabel();
      }).catch(function () {
        if (voiceLabelEl) voiceLabelEl.textContent = 'Microphone access denied';
      });
    }
    if (voiceEnabled) {
      voiceBtn.onclick = function () {
        if (conversationEnded) return;
        if (voiceIsRecording) endVoiceEmbedSession();
        else startVoiceEmbedSession();
      };
    }
    footerWrap.appendChild(voiceRow);
    handoffStatusEl = document.createElement('div');
    handoffStatusEl.style.cssText = 'margin-top:8px;text-align:center;font-size:12px;color:#666;display:none;';
    footerWrap.appendChild(handoffStatusEl);
    updateHandoffStatus();
    if (config.showPoweredBy !== false) {
      var poweredBy = document.createElement('div');
      poweredBy.style.cssText = 'margin-top:8px;text-align:center;';
      var poweredByLink = document.createElement('a');
      poweredByLink.href = 'https://converseai.com';
      poweredByLink.target = '_blank';
      poweredByLink.rel = 'noopener noreferrer';
      poweredByLink.textContent = 'Powered by ConverseAI';
      poweredByLink.style.cssText = 'font-size:10px;color:#999;text-decoration:none;';
      poweredByLink.onmouseenter = function() { poweredByLink.style.textDecoration = 'underline'; poweredByLink.style.color = '#666'; };
      poweredByLink.onmouseleave = function() { poweredByLink.style.textDecoration = 'none'; poweredByLink.style.color = '#999'; };
      poweredBy.appendChild(poweredByLink);
      footerWrap.appendChild(poweredBy);
    }
    panel.appendChild(footerWrap);
    root.appendChild(panel);
    var m = config.messages || {};
    if (messages.length === 0) {
      listEl.innerHTML = caiWelcomeRowHtml(m, config.welcomeMessage || 'How can I help?');
    } else {
      messages.forEach(function(msg) { appendMsg(msg.sender, msg.content, true); });
    }
    if (conversationId) {
      trpcQuery('widget.getMessages', { conversationId: conversationId }).then(function(res) {
        var u = trpcUnwrap(res);
        var data = u.data;
        if (data && (data.handoffRequested || data.assignedHumanAgentId)) {
          handoffMode = true;
          assignedHumanAgentId = data.assignedHumanAgentId || null;
          updateHandoffStatus();
          startHandoffPolling();
        }
        if (!conversationEnded) startHandoffWebRtcIfNeeded();
      });
    }
  }

  function showConversationEnded() {
    if (!listEl || !endedConversationId) return;
    removeEndedFlow();
    ratingSubmitted = false;
    var m = config.messages || {};
    var wrap = document.createElement('div');
    wrap.setAttribute('data-cai-ended-flow', '1');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
    var ratingBox = document.createElement('div');
    ratingBox.setAttribute('data-cai-rating-box', '1');
    ratingBox.style.cssText =
      'display:flex;flex-direction:column;gap:8px;border-radius:12px;border:1px solid rgba(0,0,0,0.1);background:rgba(0,0,0,0.04);padding:12px;color:' +
      (m.welcomeTextColor || '#666') +
      ';';
    var title = document.createElement('p');
    title.style.cssText = 'margin:0;font-size:14px;font-weight:600;';
    title.textContent =
      config.defaultRatingType === 'nps'
        ? 'How likely are you to recommend us? (0 = not at all, 10 = extremely)'
        : 'How was your experience?';
    ratingBox.appendChild(title);
    var ratingPending = false;
    var thanksEl = document.createElement('p');
    thanksEl.setAttribute('data-cai-thanks', '1');
    thanksEl.style.cssText =
      'margin:0;font-size:12px;text-align:center;color:' + (m.welcomeTextColor || '#888') + ';display:none;';
    thanksEl.textContent = 'Thanks for your feedback.';
    function handleRatingOk(res) {
      ratingPending = false;
      var u = trpcUnwrap(res);
      if (u.error) return;
      var result = u.data;
      if (!result || result.success !== true) return;
      ratingSubmitted = true;
      ratingBox.style.display = 'none';
      thanksEl.style.display = 'block';
      listEl.scrollTop = listEl.scrollHeight;
    }
    if (config.defaultRatingType === 'nps') {
      var npsRow = document.createElement('div');
      npsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
      for (var si = 0; si <= 10; si++) {
        (function (score) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = String(score);
          b.setAttribute('aria-label', 'Score ' + score);
          b.style.cssText =
            'min-width:36px;height:36px;padding:0 8px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;background:#fff;font-size:13px;font-weight:500;cursor:pointer;color:#111;';
          b.onmouseenter = function () {
            b.style.background = 'rgba(0,0,0,0.06)';
          };
          b.onmouseleave = function () {
            b.style.background = '#fff';
          };
          b.onclick = function () {
            if (ratingSubmitted || ratingPending || !endedConversationId) return;
            ratingPending = true;
            trpcMutate('widget.submitRating', {
              conversationId: endedConversationId,
              ratingType: 'nps',
              ratingValue: score,
            })
              .then(handleRatingOk)
              .catch(function () {
                ratingPending = false;
              });
          };
          npsRow.appendChild(b);
        })(si);
      }
      ratingBox.appendChild(npsRow);
    } else {
      var thumbsRow = document.createElement('div');
      thumbsRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
      function thumbBtn(val, label, colorHex) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', label);
        b.style.cssText =
          'display:flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;border:none;border-radius:50%;background:transparent;cursor:pointer;';
        var ic = caiSvg(val > 0 ? CAI.thumbUp : CAI.thumbDown, 20);
        ic.style.color = colorHex;
        b.appendChild(ic);
        b.onmouseenter = function () {
          b.style.background = 'rgba(0,0,0,0.06)';
        };
        b.onmouseleave = function () {
          b.style.background = 'transparent';
        };
        b.onclick = function () {
          if (ratingSubmitted || ratingPending || !endedConversationId) return;
          ratingPending = true;
          trpcMutate('widget.submitRating', {
            conversationId: endedConversationId,
            ratingType: 'thumbs',
            ratingValue: val,
          })
            .then(handleRatingOk)
            .catch(function () {
              ratingPending = false;
            });
        };
        return b;
      }
      thumbsRow.appendChild(thumbBtn(1, 'Good', '#059669'));
      thumbsRow.appendChild(thumbBtn(-1, 'Bad', '#ef4444'));
      ratingBox.appendChild(thumbsRow);
    }
    wrap.appendChild(ratingBox);
    wrap.appendChild(thanksEl);
    var hint = document.createElement('div');
    hint.style.cssText =
      'padding:10px 14px;border-radius:8px;background:rgba(0,0,0,0.06);font-size:12px;color:' +
      (m.welcomeTextColor || '#666') +
      ';text-align:center;';
    hint.textContent =
      'This conversation has ended. Send a new message below to start a new conversation.';
    wrap.appendChild(hint);
    listEl.appendChild(wrap);
    endedFlowEl = wrap;
    listEl.scrollTop = listEl.scrollHeight;
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
    row.style.cssText =
      'display:flex;align-items:flex-end;gap:8px;' +
      (isUser ? 'flex-direction:row;justify-content:flex-end;align-self:flex-end;' : 'flex-direction:row;align-self:flex-start;');
    var bubble = document.createElement('div');
    bubble.style.cssText = 'max-width:85%;padding:10px 14px;border-radius:' + (m.bubbleBorderRadius || 12) + 'px;font-size:' + (m.fontSize || 14) + 'px;background:' + (isUser ? (m.userBubbleBackground || config.primaryColor) : (m.agentBubbleBackground || '#f0f0f0')) + ';color:' + (isUser ? (m.userBubbleTextColor || '#fff') : (m.agentBubbleTextColor || '#111')) + ';box-shadow:0 1px 3px rgba(0,0,0,.08);';
    bubble.textContent = content;
    var avatar = document.createElement('div');
    avatar.style.cssText = 'width:28px;height:28px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;background:' + (isUser ? (m.userBubbleBackground || config.primaryColor) : (m.agentBubbleBackground || '#f0f0f0')) + ';color:' + (isUser ? (m.userBubbleTextColor || '#fff') : (m.agentBubbleTextColor || '#111')) + ';border:2px solid ' + (isUser ? (m.userBubbleBackground || config.primaryColor) : (m.agentBubbleBackground || '#f0f0f0')) + ';box-sizing:border-box;';
    avatar.appendChild(caiSvg(isUser ? CAI.user : CAI.bot, 14));
    if (isUser) {
      row.appendChild(bubble);
      row.appendChild(avatar);
    } else {
      row.appendChild(avatar);
      row.appendChild(bubble);
    }
    row.dataset.msg = '1';
    if (endedFlowEl && endedFlowEl.parentNode === listEl) listEl.insertBefore(row, endedFlowEl);
    else listEl.appendChild(row);
    listEl.scrollTop = listEl.scrollHeight;
  }

  trpcQuery('widget.getConfig', { apiKey: apiKey }).then(function(res) {
    var u = trpcUnwrap(res);
    var data = u.data;
    if (data) {
      if (data.name) config.name = data.name;
      if (data.config) {
        var c = data.config;
        if (c.primaryColor != null && String(c.primaryColor).length > 0) config.primaryColor = c.primaryColor;
        if (c.welcomeMessage !== undefined && c.welcomeMessage !== null) config.welcomeMessage = c.welcomeMessage;
        if (c.position) config.position = c.position;
        (function applyWidgetInsetsFromPayload() {
          var insetKeys = ['widgetInsetTopPx', 'widgetInsetRightPx', 'widgetInsetBottomPx', 'widgetInsetLeftPx'];
          var hasInset = insetKeys.some(function (k) {
            return c[k] != null && c[k] !== '';
          });
          if (hasInset) {
            insetKeys.forEach(function (k) {
              config[k] = c[k] != null && c[k] !== '' ? caiClampOffsetPx(c[k]) : 0;
            });
            return;
          }
          if (
            (c.positionOffsetXPx == null || c.positionOffsetXPx === '') &&
            (c.positionOffsetYPx == null || c.positionOffsetYPx === '')
          ) {
            return;
          }
          var pos = c.position || config.position || 'bottom-right';
          var lx = caiClampOffsetPx(c.positionOffsetXPx);
          var ly = caiClampOffsetPx(c.positionOffsetYPx);
          config.widgetInsetTopPx = pos === 'top-right' || pos === 'top-left' ? ly : 0;
          config.widgetInsetBottomPx = pos === 'bottom-right' || pos === 'bottom-left' ? ly : 0;
          config.widgetInsetRightPx = pos === 'bottom-right' || pos === 'top-right' ? lx : 0;
          config.widgetInsetLeftPx = pos === 'bottom-left' || pos === 'top-left' ? lx : 0;
        })();
        if (c.voiceEnabled !== undefined) config.voiceEnabled = c.voiceEnabled;
        if (c.showPoweredBy !== undefined) config.showPoweredBy = c.showPoweredBy;
        if (c.attachmentsEnabled !== undefined) config.attachmentsEnabled = c.attachmentsEnabled;
        if (c.defaultRatingType === 'nps' || c.defaultRatingType === 'thumbs') config.defaultRatingType = c.defaultRatingType;
        if (c.bubble) config.bubble = assignSection(config.bubble, c.bubble);
        if (c.popup) config.popup = assignSection(config.popup, c.popup);
        if (c.header) config.header = assignSection(config.header, c.header);
        if (c.footer) config.footer = assignSection(config.footer, c.footer);
        if (c.messages) config.messages = assignSection(config.messages, c.messages);
        if (c.proactiveDelaySeconds != null) config.proactiveDelaySeconds = c.proactiveDelaySeconds;
        if (c.proactiveOnExitIntent != null) config.proactiveOnExitIntent = c.proactiveOnExitIntent;
        if (c.proactiveWelcomeEnabled != null) config.proactiveWelcomeEnabled = c.proactiveWelcomeEnabled;
        if (c.proactiveWelcomeDelaySeconds != null) config.proactiveWelcomeDelaySeconds = c.proactiveWelcomeDelaySeconds;
        if (c.proactiveWelcomeStatus != null) config.proactiveWelcomeStatus = c.proactiveWelcomeStatus;
        if (c.proactiveWelcomeCtaLabel != null) config.proactiveWelcomeCtaLabel = c.proactiveWelcomeCtaLabel;
        if (c.proactiveWelcomeAvatarUrl != null) config.proactiveWelcomeAvatarUrl = c.proactiveWelcomeAvatarUrl;
        if (Array.isArray(c.embedHiddenPaths)) {
          config.embedHiddenPaths = caiNormalizeEmbedHiddenPathsFromServer(c.embedHiddenPaths);
        }
      }
    }
    if (caiShouldHideEmbedForPath()) {
      return;
    }
    (function reportEmbedLoad() {
      try {
        var loc = typeof window !== 'undefined' && window.location ? window.location.href : '';
        if (!loc || (loc.indexOf('http:') !== 0 && loc.indexOf('https:') !== 0)) return;
        if (loc.length > 2048) loc = loc.slice(0, 2048);
        trpcMutate('widget.reportEmbedBeacon', { apiKey: apiKey, pageUrl: loc }).catch(function () {});
      } catch (e) {}
    })();
    render();
    if (openPanelOnLoad) openPanel();
    if (config.proactiveWelcomeEnabled && !openPanelOnLoad) {
      var delayMs = (config.proactiveWelcomeDelaySeconds || 0) * 1000;
      setTimeout(function() { if (root && !panel) showProactiveWelcome(); }, delayMs);
    }
    if (config.proactiveDelaySeconds > 0) {
      setTimeout(function() { if (root && !panel) openPanel(); }, config.proactiveDelaySeconds * 1000);
    }
    if (config.proactiveOnExitIntent) {
      var exitIntentFired = false;
      document.addEventListener('mouseout', function exitIntent(e) {
        if (exitIntentFired) return;
        if (!e.relatedTarget && e.clientY <= 0) { exitIntentFired = true; document.removeEventListener('mouseout', exitIntent); if (root && !panel) openPanel(); }
      });
    }
  }).catch(function() { render(); });
})();
`.replace(/\n\s+/g, '\n').trim();

const VOICE_SIGNALING_WS_JSON = JSON.stringify(
  process.env.NEXT_PUBLIC_VOICE_SIGNALING_WS_URL ?? ''
);

export async function GET(_request: NextRequest) {
  const body = EMBED_SCRIPT.replace(/__CAI_VOICE_WS__/g, VOICE_SIGNALING_WS_JSON);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Short TTL so widget logic fixes roll out; browsers may still reuse while fresh.
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=86400',
    },
  });
}
