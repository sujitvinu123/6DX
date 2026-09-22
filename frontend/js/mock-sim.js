/**
 * AERO-TWIN — Built-in Mock Data Simulator
 * Generates live telemetry at 1Hz matching the ML inference frame schema.
 * Automatically activates if WebSocket fails to connect within 3 seconds.
 * Produces all 27 channels + full health/anomaly/advisory structure.
 */
(function() {
  var simTick = 0;
  var simInterval = null;
  var simActive = false;

  var activeScenario = 'healthy';
  var scenarioTimer = 0;

  function setScenario(sc) {
    activeScenario = (sc || 'healthy').toLowerCase();
    scenarioTimer = 0;
    console.info('[MockSim] Scenario switched to: ' + activeScenario);
  }

  function startSimulation() {
    if (simActive) return;
    simActive = true;
    AeroState.becomeLeader();
    console.info('[MockSim] Starting built-in telemetry simulation (1 Hz, 27-channel ML schema)');

    AeroState.processHello({
      engine_id: 'E001',
      flight_id: 'SIM-' + activeScenario.toUpperCase() + '-001',
      schema_version: '1.0.0',
      limits: {},
      _simulated: true
    });

    var state = {
      alt_m: 4850.0,
      throttle: 72.0,
      rpm: 4247.0,
      load: 42.1,
      mapKpa: 49.1,
      cht: [97.2, 98.0, 100.2, 100.5],
      egt: [658.0, 658.5, 659.0, 660.0],
      coolant: 88.0,
      oil_t: 101.5,
      oil_p: 3.49,
      fuel_flow: 7.95,
      fuel_p: 3.05,
      vib_rms: 0.650,
      vib_1x: 0.320,
      vib_high: 0.225,
      vib_kurt: 2.980,
      v_batt: 14.20,
      i_alt: 11.50,
      inj_timing: 21.50
    };

    simInterval = setInterval(function() {
      simTick++;
      scenarioTimer++;
      var t = simTick;
      var n = function(s) { return (Math.random() - 0.5) * (s || 1); };

      // Gentle continuous atmospheric drift around ISR cruise patrol station
      var target_alt = 4850.0 + Math.sin(t * 0.02) * 15.0;
      var target_throttle = 72.0 + Math.sin(t * 0.03) * 0.5;

      state.alt_m += 0.08 * (target_alt - state.alt_m) + n(0.1);
      state.throttle += 0.12 * (target_throttle - state.throttle) + n(0.03);

      var h = Math.max(0, state.alt_m);
      var oat = -10.9 - 0.002 * (h - 4850.0) + n(0.03);
      var p_amb = 61.75 - 0.006 * (h - 4850.0) + n(0.02);

      var target_rpm = 4247.0 + (state.throttle - 72.0) * 25.0;
      var target_load = 42.1 + (state.throttle - 72.0) * 0.55;
      var target_map = 49.1 + (state.throttle - 72.0) * 0.35;
      var target_ff = 7.95 + (state.throttle - 72.0) * 0.12;
      var target_oil_p = 3.490;
      var target_oil_t = 101.5 + (state.throttle - 72.0) * 0.15;
      var target_coolant = 88.0 + (state.throttle - 72.0) * 0.10;
      var target_v_batt = 14.20;
      var target_i_alt = 11.55;

      // Scenario dynamic deviations
      var isMisfire = activeScenario.indexOf('misfire') !== -1;
      var isLubrication = activeScenario.indexOf('lubrication') !== -1;
      var isCooling = activeScenario.indexOf('cooling') !== -1;
      var isSensorDrift = activeScenario.indexOf('sensor_drift') !== -1;
      var isElectrical = activeScenario.indexOf('electrical') !== -1;
      var isIntake = activeScenario.indexOf('intake') !== -1;

      if (isLubrication) {
        var elapsed = scenarioTimer;
        target_oil_p = Math.max(0.95, 3.490 - Math.min(elapsed * 0.08, 2.45));
        target_oil_t = Math.min(142.0, 101.5 + elapsed * 0.95);
        state.vib_rms += 0.08 * (1.35 - state.vib_rms);
      } else if (isMisfire) {
        var elapsed = scenarioTimer;
        var target_egt_3 = Math.max(480.0, 659.0 - elapsed * 8.0);
        var target_cht_3 = Math.max(68.0, 100.2 - elapsed * 1.5);
        state.egt[2] += 0.20 * (target_egt_3 - state.egt[2]);
        state.cht[2] += 0.10 * (target_cht_3 - state.cht[2]);
        state.vib_rms += 0.15 * (1.38 - state.vib_rms);
        state.vib_1x += 0.15 * (0.78 - state.vib_1x);
        state.vib_kurt += 0.15 * (6.20 - state.vib_kurt);
      } else if (isCooling) {
        var elapsed = scenarioTimer;
        target_coolant = Math.min(118.0, 88.0 + elapsed * 0.85);
        for (var c = 0; c < 4; c++) {
          state.cht[c] += 0.08 * (Math.min(138.0, 98.0 + elapsed * 0.90) - state.cht[c]);
        }
      } else if (isSensorDrift) {
        target_oil_t = Math.min(148.0, 101.5 + scenarioTimer * 1.2);
      } else if (isElectrical) {
        target_i_alt = Math.max(0.0, 11.55 - scenarioTimer * 0.8);
        target_v_batt = Math.max(11.50, 14.20 - scenarioTimer * 0.1);
      } else if (isIntake) {
        target_map = Math.max(26.0, 49.1 - scenarioTimer * 0.8);
        target_rpm = Math.max(3400.0, 4247.0 - scenarioTimer * 30.0);
      }

      // First-order inertial lag state integration (No value jumping!)
      state.rpm += 0.25 * (target_rpm - state.rpm) + n(0.8);
      state.load += 0.20 * (target_load - state.load) + n(0.05);
      state.mapKpa += 0.20 * (target_map - state.mapKpa) + n(0.02);
      state.oil_p += 0.15 * (target_oil_p - state.oil_p) + n(0.002);
      state.oil_t += 0.05 * (target_oil_t - state.oil_t) + n(0.02);
      state.coolant += 0.06 * (target_coolant - state.coolant) + n(0.02);
      state.fuel_flow += 0.15 * (target_ff - state.fuel_flow) + n(0.01);
      state.v_batt += 0.15 * (target_v_batt - state.v_batt) + n(0.004);
      state.i_alt += 0.15 * (target_i_alt - state.i_alt) + n(0.03);

      if (!isMisfire) {
        var base_cht = [97.2, 98.0, 100.2, 100.5];
        var base_egt = [658.0, 658.5, 659.0, 660.0];
        for (var i = 0; i < 4; i++) {
          if (!isCooling) state.cht[i] += 0.05 * (base_cht[i] + (state.throttle - 72.0) * 0.15 - state.cht[i]) + n(0.04);
          state.egt[i] += 0.15 * (base_egt[i] + (state.throttle - 72.0) * 0.45 - state.egt[i]) + n(0.12);
        }
      }

      if (!isMisfire && !isLubrication) {
        state.vib_rms += 0.10 * (0.650 - state.vib_rms) + n(0.002);
        state.vib_1x += 0.10 * (0.320 - state.vib_1x) + n(0.002);
        state.vib_high += 0.10 * (0.225 - state.vib_high) + n(0.001);
        state.vib_kurt += 0.10 * (2.980 - state.vib_kurt) + n(0.01);
      }

      var measured = {
        altitude_m: +state.alt_m.toFixed(1),
        oat_c: +oat.toFixed(1),
        ambient_pressure_kpa: +p_amb.toFixed(2),
        throttle_pct: +state.throttle.toFixed(1),
        engine_load_pct: +state.load.toFixed(1),
        map_kpa: +state.mapKpa.toFixed(2),
        rpm: +state.rpm.toFixed(1),
        cht_1_c: +state.cht[0].toFixed(1),
        cht_2_c: +state.cht[1].toFixed(1),
        cht_3_c: +state.cht[2].toFixed(1),
        cht_4_c: +state.cht[3].toFixed(1),
        egt_1_c: +state.egt[0].toFixed(1),
        egt_2_c: +state.egt[1].toFixed(1),
        egt_3_c: +state.egt[2].toFixed(1),
        egt_4_c: +state.egt[3].toFixed(1),
        coolant_temp_c: +state.coolant.toFixed(1),
        oil_temp_c: +state.oil_t.toFixed(1),
        oil_pressure_bar: +state.oil_p.toFixed(3),
        fuel_flow_lph: +state.fuel_flow.toFixed(2),
        fuel_pressure_bar: +(state.fuel_p + n(0.002)).toFixed(3),
        vib_rms_g: +state.vib_rms.toFixed(3),
        vib_1x_g: +state.vib_1x.toFixed(3),
        vib_high_g: +state.vib_high.toFixed(3),
        vib_kurtosis: +state.vib_kurt.toFixed(3),
        battery_voltage_v: +state.v_batt.toFixed(2),
        alternator_current_a: +state.i_alt.toFixed(2),
        injection_timing_deg: +(state.inj_timing + n(0.002)).toFixed(2)
      };

      var predicted = {};
      var residuals = {};
      for (var k in measured) {
        if (k !== 'altitude_m' && k !== 'oat_c' && k !== 'ambient_pressure_kpa' && k !== 'throttle_pct') {
          predicted[k] = measured[k];
          residuals[k] = +n(0.05).toFixed(4);
        }
      }

      // Compute scenario health & fault
      var health = {
        combustion: +(96.2 + n(0.2)).toFixed(1),
        lubrication: +(95.8 + n(0.2)).toFixed(1),
        thermal: +(96.5 + n(0.2)).toFixed(1),
        mechanical: +(95.4 + n(0.2)).toFixed(1),
        electrical: +(98.0 + n(0.1)).toFixed(1)
      };
      var fault = null;
      var advisory = {
        severity: 'NORMAL',
        message: 'All propulsion systems operating nominally in ISR patrol station.',
        action_by_min: null
      };
      var sensor_health = { all_valid: true, suspect_channels: [] };
      var rul = null;
      var anomaly = { detected: false, score: 0.45, threshold: 2.219, confirmed_for_s: 0 };

      if (isMisfire) {
        var deg = Math.min(1.0, scenarioTimer / 10.0);
        health.combustion = +(96.2 - deg * 68.0).toFixed(1);
        health.mechanical = +(95.4 - deg * 60.0).toFixed(1);
        anomaly = { detected: true, score: 4.85, threshold: 2.219, confirmed_for_s: scenarioTimer };
        fault = { class: 'MISFIRE', confidence: 0.992, top_contributors: [{ channel: 'vib_kurtosis', contribution: 0.45, residual: 4.8 }, { channel: 'cht_3_c', contribution: 0.35, residual: 3.8 }] };
        advisory = { severity: 'CRITICAL', message: 'Cylinder misfire on Cylinder 3. Reduce power, expect vibration. Land at nearest suitable site.', action_by_min: 10 };
        rul = { p10: 12.0, p50: 18.0, p90: 25.0 };
      } else if (isLubrication) {
        var deg = Math.min(1.0, scenarioTimer / 12.0);
        health.lubrication = +(95.8 - deg * 78.0).toFixed(1);
        anomaly = { detected: true, score: 5.20, threshold: 2.219, confirmed_for_s: scenarioTimer };
        fault = { class: 'LUBRICATION_FAILURE', confidence: 0.985, top_contributors: [{ channel: 'oil_pressure_bar', contribution: 0.58, residual: 4.2 }] };
        advisory = { severity: state.oil_p < 2.0 ? 'CRITICAL' : 'WARNING', message: 'Oil pressure degrading. Reduce power and divert to nearest recovery site.', action_by_min: 15 };
        rul = { p10: 8.0, p50: 16.0, p90: 24.0 };
      } else if (isCooling) {
        var deg = Math.min(1.0, scenarioTimer / 10.0);
        health.thermal = +(96.5 - deg * 70.0).toFixed(1);
        anomaly = { detected: true, score: 3.90, threshold: 2.219, confirmed_for_s: scenarioTimer };
        fault = { class: 'COOLING_DEGRADATION', confidence: 0.978, top_contributors: [{ channel: 'coolant_temp_c', contribution: 0.52, residual: 3.6 }] };
        advisory = { severity: 'WARNING', message: 'Cooling performance degrading. Reduce power, descend if temperatures rise.', action_by_min: 20 };
        rul = { p10: 20.0, p50: 32.0, p90: 45.0 };
      } else if (isSensorDrift) {
        sensor_health = { all_valid: false, suspect_channels: ['oil_temp_c'] };
        fault = { class: 'SENSOR_DRIFT', confidence: 0.995, top_contributors: [{ channel: 'oil_temp_c', contribution: 0.95, residual: 4.1 }] };
        advisory = { severity: 'CAUTION', message: 'Sensor reading suspect (oil_temp_c). Engine parameters nominal. Disregard that indication.', action_by_min: null };
      } else if (isElectrical) {
        var deg = Math.min(1.0, scenarioTimer / 10.0);
        health.electrical = +(98.0 - deg * 65.0).toFixed(1);
        anomaly = { detected: true, score: 4.10, threshold: 2.219, confirmed_for_s: scenarioTimer };
        fault = { class: 'ELECTRICAL_FAULT', confidence: 0.990, top_contributors: [{ channel: 'alternator_current_a', contribution: 0.70, residual: 3.9 }] };
        advisory = { severity: 'CRITICAL', message: 'Charging system fault. Shed electrical load, expect battery-only endurance.', action_by_min: 25 };
        rul = { p10: 15.0, p50: 25.0, p90: 35.0 };
      } else if (isIntake) {
        var deg = Math.min(1.0, scenarioTimer / 10.0);
        health.combustion = +(96.2 - deg * 50.0).toFixed(1);
        health.mechanical = +(95.4 - deg * 45.0).toFixed(1);
        anomaly = { detected: true, score: 3.60, threshold: 2.219, confirmed_for_s: scenarioTimer };
        fault = { class: 'INTAKE_RESTRICTION', confidence: 0.980, top_contributors: [{ channel: 'map_kpa', contribution: 0.65, residual: 3.5 }] };
        advisory = { severity: 'WARNING', message: 'Induction restriction. Power available is reduced; plan a lower cruise.', action_by_min: 30 };
        rul = { p10: 25.0, p50: 40.0, p90: 55.0 };
      }

      health.overall_index = Math.min(health.combustion, health.lubrication, health.thermal, health.mechanical, health.electrical);

      AeroState.processTick({
        type: 'tick',
        schema_version: '1.0.0',
        meta: {
          ts: new Date().toISOString(),
          seq: simTick,
          engine_id: 'E001',
          flight_id: 'SIM-' + activeScenario.toUpperCase() + '-001',
          t_s: simTick
        },
        measured: measured,
        predicted: predicted,
        residuals: residuals,
        derived: {
          cht_max_c: +Math.max.apply(null, state.cht).toFixed(1),
          egt_spread_z: 0.35,
          cht_spread_z: 0.55,
          mean_abs_z: 0.08,
          n_hot_4: 0
        },
        health: health,
        anomaly: anomaly,
        fault: fault,
        rul: rul,
        advisory: advisory,
        sensor_health: sensor_health
      });
    }, 1000);
  }

  function stopSimulation() {
    if (simInterval) clearInterval(simInterval);
    simInterval = null;
    simActive = false;
    console.info('[MockSim] Stopped');
  }

  window.AeroMockSim = {
    start: startSimulation,
    stop: stopSimulation,
    setScenario: setScenario,
    isActive: function() { return simActive; }
  };

  // Auto-stop when real WebSocket takes over
  AeroState.subscribe(function(state) {
    if (simActive && state.connectionState === 'CONNECTED') {
      console.info('[MockSim] Real WS connected — stopping simulation');
      stopSimulation();
    }
  });

  setTimeout(function() {
    var state = AeroState.getState();
    if (!state.connected && !AeroState.wasRestored()) {
      console.info('[MockSim] No WebSocket connection — starting built-in simulation');
      if (window.AeroWS) AeroWS.disconnect();
      startSimulation();
    } else if (AeroState.wasRestored()) {
      console.info('[MockSim] State restored — waiting 5s for leader ticks...');
      var seqBefore = state.sequenceNumber;
      setTimeout(function() {
        var s = AeroState.getState();
        if (!simActive && s.sequenceNumber === seqBefore) {
          console.info('[MockSim] No ticks received after restoration — starting simulation as fallback');
          if (window.AeroWS) AeroWS.disconnect();
          startSimulation();
        }
      }, 5000);
    }
  }, 3000);
})();
