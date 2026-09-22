/**
 * AERO-TWIN — Central Engine State Store (Global)
 * Uses BroadcastChannel + sessionStorage for cross-page persistence.
 */
(function() {
  function createDefaultState() {
    return {
      connected: false,
      connectionState: 'DISCONNECTED',
      lastTickTime: null,
      sequenceNumber: null,
      engineId: null,
      flightId: null,
      schemaVersion: null,
      limits: {},
      measured: {
        rpm: null, cht_1_c: null, cht_2_c: null, cht_3_c: null, cht_4_c: null,
        egt_1_c: null, egt_2_c: null, egt_3_c: null, egt_4_c: null,
        oil_pressure_bar: null, oil_temp_c: null, coolant_temp_c: null,
        fuel_flow_lph: null, fuel_pressure_bar: null,
        vib_rms_g: null, vib_1x_g: null, vib_high_g: null, vib_kurtosis: null,
        battery_voltage_v: null, alternator_current_a: null,
        injection_timing_deg: null,
        altitude_m: null, oat_c: null, ambient_pressure_kpa: null,
        throttle_pct: null, engine_load_pct: null, map_kpa: null
      },
      predicted: {},
      residuals: {},
      derived: {},
      health: { overall_index: null, combustion: null, lubrication: null, thermal: null, mechanical: null, electrical: null },
      anomaly: { detected: false, score: null, threshold: null, confirmed_for_s: null },
      fault: null,
      rul: null,
      advisory: null,
      sensor_health: { all_valid: true, suspect_channels: [] },
      events: []
    };
  }

  var _state = createDefaultState();
  var _subscribers = [];
  var _historyBuffer = [];
  var MAX_HISTORY = 600;

  // ── Session Persistence via BroadcastChannel + sessionStorage ──────────
  var _channel = null;
  var _isLeader = false;
  try { _channel = new BroadcastChannel('aero-twin-state'); } catch(e) {}

  function _persistSnapshot() {
    try {
      var snapshot = {
        state: _state,
        history: _historyBuffer.slice(-120),
        ts: Date.now()
      };
      sessionStorage.setItem('aero_state', JSON.stringify(snapshot));
    } catch(e) {}
  }

  function _restoreFromStorage() {
    try {
      var raw = sessionStorage.getItem('aero_state');
      if (!raw) return false;
      var snap = JSON.parse(raw);
      if (Date.now() - snap.ts > 30000) return false;
      if (snap.state) {
        for (var k in snap.state) {
          if (k !== 'events') _state[k] = snap.state[k];
        }
        if (snap.state.events) _state.events = snap.state.events.slice(0, 50);
      }
      if (snap.history && snap.history.length) {
        _historyBuffer = snap.history;
      }
      return true;
    } catch(e) { return false; }
  }

  function _broadcastTick(msg) {
    if (_channel && _isLeader) {
      try { _channel.postMessage({ type: 'tick', payload: msg }); } catch(e) {}
    }
  }

  function _broadcastEvent(msg) {
    if (_channel && _isLeader) {
      try { _channel.postMessage({ type: 'event', payload: msg }); } catch(e) {}
    }
  }

  function _broadcastHello(msg) {
    if (_channel && _isLeader) {
      try { _channel.postMessage({ type: 'hello', payload: msg }); } catch(e) {}
    }
  }

  if (_channel) {
    _channel.onmessage = function(ev) {
      if (_isLeader) return;
      var d = ev.data;
      if (d.type === 'tick') { window.AeroState.processTick(d.payload); }
      else if (d.type === 'event') { window.AeroState.processEvent(d.payload); }
      else if (d.type === 'hello') { window.AeroState.processHello(d.payload); }
    };
  }

  var _restored = _restoreFromStorage();
  var _persistInterval = setInterval(_persistSnapshot, 2000);

  function _notify() {
    for (var i = 0; i < _subscribers.length; i++) {
      try { _subscribers[i](_state); } catch(e) { console.error('[EngineState] Subscriber error:', e); }
    }
  }

  window.AeroState = {
    getState: function() { return _state; },
    getHistory: function() { return _historyBuffer; },

    subscribe: function(cb) {
      _subscribers.push(cb);
      try { cb(_state); } catch(e) {}
      return function() { _subscribers = _subscribers.filter(function(c) { return c !== cb; }); };
    },

    processHello: function(msg) {
      _state.connected = true;
      if (!_state.connectionState || _state.connectionState === 'DISCONNECTED' || _state.connectionState === 'RECONNECTING') {
        _state.connectionState = msg._simulated ? 'SIMULATION' : 'CONNECTED';
      }
      _state.engineId = msg.engine_id || null;
      _state.flightId = msg.flight_id || null;
      _state.schemaVersion = msg.schema_version || null;
      _state.limits = msg.limits || {};
      _broadcastHello(msg);
      _notify();
    },

    processTick: function(msg) {
      var s = _state;
      s.lastTickTime = (msg.meta && msg.meta.ts) || new Date().toISOString();
      s.sequenceNumber = (msg.meta && msg.meta.seq != null) ? msg.meta.seq : s.sequenceNumber;
      s.connected = true;
      if (s.connectionState === 'DISCONNECTED' || s.connectionState === 'RECONNECTING') {
        s.connectionState = 'CONNECTED';
      }

      if (msg.measured) {
        for (var k in msg.measured) { s.measured[k] = msg.measured[k]; }
        // Aliases: ML canonical → legacy keys used by chart/dashboard code
        if (s.measured.vib_rms_g != null && s.measured.vibration_g == null) s.measured.vibration_g = s.measured.vib_rms_g;
        if (s.measured.vibration_g != null && s.measured.vib_rms_g == null) s.measured.vib_rms_g = s.measured.vibration_g;
        if (s.measured.battery_voltage_v != null) s.measured.battery_v = s.measured.battery_voltage_v;
        if (s.measured.alternator_current_a != null) s.measured.alternator_a = s.measured.alternator_current_a;
        if (s.measured.map_kpa != null) s.measured.map_inhg = s.measured.map_kpa;
        if (s.measured.oat_c != null) s.measured.ambient_temp_c = s.measured.oat_c;
      }
      if (msg.predicted) { for (var k in msg.predicted) { s.predicted[k] = msg.predicted[k]; } }
      if (msg.residuals) { for (var k in msg.residuals) { s.residuals[k] = msg.residuals[k]; } }
      if (msg.derived) { for (var k in msg.derived) { s.derived[k] = msg.derived[k]; } }
      if (msg.health) { for (var k in msg.health) { s.health[k] = msg.health[k]; } }
      if (msg.anomaly) { for (var k in msg.anomaly) { s.anomaly[k] = msg.anomaly[k]; } }
      if (msg.fault !== undefined) s.fault = msg.fault;
      if (msg.rul !== undefined) s.rul = msg.rul;
      if (msg.advisory !== undefined) s.advisory = msg.advisory;
      if (msg.sensor_health) {
        for (var k in msg.sensor_health) { s.sensor_health[k] = msg.sensor_health[k]; }
        // Normalize suspect_channels to include legacy aliases
        var aliases = {vib_rms_g:'vibration_g', battery_voltage_v:'battery_v', alternator_current_a:'alternator_a', map_kpa:'map_inhg', oat_c:'ambient_temp_c'};
        var rev = {vibration_g:'vib_rms_g', battery_v:'battery_voltage_v', alternator_a:'alternator_current_a', map_inhg:'map_kpa', ambient_temp_c:'oat_c'};
        var sc = s.sensor_health.suspect_channels || [];
        var expanded = sc.slice();
        for (var i = 0; i < sc.length; i++) {
          if (aliases[sc[i]] && expanded.indexOf(aliases[sc[i]]) === -1) expanded.push(aliases[sc[i]]);
          if (rev[sc[i]] && expanded.indexOf(rev[sc[i]]) === -1) expanded.push(rev[sc[i]]);
        }
        s.sensor_health.suspect_channels = expanded;
      }

      _historyBuffer.push({
        t: Date.now(),
        measured: JSON.parse(JSON.stringify(s.measured)),
        predicted: JSON.parse(JSON.stringify(s.predicted)),
        residuals: JSON.parse(JSON.stringify(s.residuals)),
        health: JSON.parse(JSON.stringify(s.health)),
        anomaly: JSON.parse(JSON.stringify(s.anomaly))
      });
      if (_historyBuffer.length > MAX_HISTORY) _historyBuffer.shift();

      _broadcastTick(msg);
      _notify();
    },

    processEvent: function(msg) {
      var ev = {
        timestamp: msg.wall_clock || msg.ts || new Date().toISOString(),
        type: msg.kind || msg.event_type || msg.type,
        severity: msg.severity || 'INFO',
        fault: msg.fault_class || msg.fault || null,
        message: msg.message || '',
        lead_time_s: msg.lead_time_min != null ? Math.round(msg.lead_time_min * 60) : (msg.lead_time_s || null)
      };
      _state.events = [ev].concat(_state.events).slice(0, 100);
      _broadcastEvent(msg);
      _notify();
    },

    setConnectionState: function(cs) {
      _state.connectionState = cs;
      if (cs === 'DISCONNECTED' || cs === 'RECONNECTING') _state.connected = false;
      _notify();
    },

    reset: function() {
      _state = createDefaultState();
      _historyBuffer = [];
      try { sessionStorage.removeItem('aero_state'); } catch(e) {}
      _notify();
    },

    becomeLeader: function() {
      _isLeader = true;
    },

    isLeader: function() { return _isLeader; },

    wasRestored: function() { return _restored; }
  };
})();
