/**
 * AERO-TWIN — Telemetry Provider Abstraction Layer (Global)
 *
 * Provides a unified interface for telemetry data sources.
 * Current providers:
 *   - 'websocket'  : Real-time WS stream from serve.py (ML inference) or mock_stream_server.py
 *   - 'simulation' : Built-in JS mock simulation (mock-sim.js)
 *   - 'replay'     : Historical mission replay (replay.html manages this internally)
 *
 * Usage:
 *   AeroTelemetry.activate('websocket');   // Try WS, fallback to simulation
 *   AeroTelemetry.activate('simulation');  // Force local simulation
 *   AeroTelemetry.getActiveProvider();     // Returns current provider name
 *
 * All providers feed into AeroState via processTick/processHello/processEvent.
 * The downstream (dashboards, 3D engine, charts) subscribe to AeroState only.
 *
 * To add a new provider (e.g. CAN bus serial):
 *   1. Create js/providers/can-provider.js that calls AeroState.processHello/processTick
 *   2. Register it here via AeroTelemetry.register('canbus', startFn, stopFn)
 *   3. Switch with AeroTelemetry.activate('canbus')
 */
(function() {
  var activeProvider = null;
  var providers = {};

  function register(name, startFn, stopFn) {
    providers[name] = { start: startFn, stop: stopFn };
  }

  function activate(name) {
    if (activeProvider && providers[activeProvider]) {
      providers[activeProvider].stop();
    }
    activeProvider = name;
    if (providers[name]) {
      providers[name].start();
    }
    console.info('[TelemetryProvider] Active provider:', name);
  }

  // Register built-in providers
  register('websocket', function() {
    if (window.AeroWS) AeroWS.connect();
  }, function() {
    if (window.AeroWS) AeroWS.disconnect();
  });

  register('simulation', function() {
    if (window.AeroWS) AeroWS.disconnect();
    if (window.AeroMockSim) AeroMockSim.start();
  }, function() {
    if (window.AeroMockSim) AeroMockSim.stop();
  });

  register('replay', function() {
    AeroState.setConnectionState('REPLAY');
  }, function() {
    AeroState.setConnectionState('DISCONNECTED');
  });

  window.AeroTelemetry = {
    register: register,
    activate: activate,
    getActiveProvider: function() { return activeProvider; },
    getProviders: function() { return Object.keys(providers); }
  };
})();
