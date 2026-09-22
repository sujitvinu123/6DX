/**
 * AERO-TWIN — WebSocket Client (Global)
 */
(function() {
  var ws = null;
  var reconnectAttempts = 0;
  var reconnectTimer = null;
  var intentionalClose = false;
  var WS_URL = 'ws://localhost:8765';

  function handleMessage(msg) {
    switch (msg.type) {
      case 'hello':
        console.info('[WS] Hello:', msg.engine_id);
        AeroState.processHello(msg);
        break;
      case 'tick':
        AeroState.processTick(msg);
        break;
      case 'event':
        console.info('[WS] Event:', msg.kind || msg.event_type);
        AeroState.processEvent(msg);
        break;
    }
  }

  function scheduleReconnect() {
    if (intentionalClose) return;
    var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    console.info('[WS] Reconnecting in ' + delay + 'ms');
    reconnectTimer = setTimeout(function() { reconnectAttempts++; window.AeroWS.connect(); }, delay);
  }

  function cleanup() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) { try { ws.onclose = null; ws.onerror = null; ws.onmessage = null; ws.close(); } catch(e){} ws = null; }
  }

  window.AeroWS = {
    connect: function() {
      intentionalClose = false;
      cleanup();
      try {
        ws = new WebSocket(WS_URL);
        AeroState.setConnectionState('RECONNECTING');

        ws.onopen = function() {
          console.info('[WS] Connected');
          reconnectAttempts = 0;
          AeroState.becomeLeader();
          AeroState.setConnectionState('CONNECTED');
        };

        ws.onmessage = function(event) {
          try { handleMessage(JSON.parse(event.data)); } catch(e) { console.warn('[WS] Parse error:', e); }
        };

        ws.onclose = function() {
          console.warn('[WS] Closed');
          if (!intentionalClose) {
            AeroState.setConnectionState('RECONNECTING');
            scheduleReconnect();
          } else {
            AeroState.setConnectionState('DISCONNECTED');
          }
        };

        ws.onerror = function() { console.warn('[WS] Error'); };
      } catch(e) {
        console.warn('[WS] Failed:', e);
        AeroState.setConnectionState('DISCONNECTED');
        scheduleReconnect();
      }
    },

    disconnect: function() { intentionalClose = true; cleanup(); AeroState.setConnectionState('DISCONNECTED'); },

    send: function(payload) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
        return true;
      }
      return false;
    },

    setScenario: function(scenarioName) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'set_scenario', scenario: scenarioName }));
        console.info('[WS] Requested scenario change:', scenarioName);
        return true;
      } else if (window.AeroMockSim) {
        window.AeroMockSim.setScenario(scenarioName);
        return true;
      }
      return false;
    }
  };
})();
