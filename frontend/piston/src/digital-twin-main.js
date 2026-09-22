import * as THREE from 'three';
import { initScene } from './scene/setup.js';
import { setupLighting } from './scene/lighting.js';
import { loadCanonicalEngineModel } from './engine/EngineModelLoader.js';

import { CameraController } from './camera/CameraController.js';
import { EngineRaycaster } from './interaction/EngineRaycaster.js';
import { ComponentSelectionManager } from './interaction/ComponentSelection.js';
import { ComponentIsolationManager } from './interaction/ComponentIsolation.js';
import { ExplodedViewManager } from './visualization/ExplodedView.js';
import { XRayModeManager } from './visualization/XRayMode.js';
import { TelemetryMarkersManager } from './visualization/TelemetryMarkers.js';

import { ComponentPanelUI } from './ui/ComponentPanel.js';
import { ModeSwitcherUI } from './ui/ModeSwitcher.js';
import { telemetry, registerTwinStateAdapter, updateTelemetry } from './data/telemetryData.js';

// Digital Twin Core
import { twinStateManager } from './digital-twin/TwinStateManager.js';
import { TwinStateAdapter } from './digital-twin/TwinStateAdapter.js';
import { EngineStateController } from './digital-twin/engine/EngineStateController.js';
import { UAVAttitudeController } from './digital-twin/uav/UAVAttitudeController.js';
import { EKFProcessor } from './digital-twin/EKFProcessor.js';

// Digital Twin Visualization Extensions
import { ThermalVisualizer } from './digital-twin/visualization/ThermalVisualizer.js';
import { VibrationAnimator } from './digital-twin/visualization/VibrationAnimator.js';
import { TelemetryOverlayManager } from './digital-twin/sensors/TelemetryOverlayManager.js';

/**
 * AERO-TWIN — Dedicated Digital Twin Entry Point
 *
 * This module is the EXCLUSIVE entry for /digital-twin/index.html.
 * It REUSES the canonical Three.js engine model, scene, and all controllers.
 * It does NOT contain a simulator — it is a CONSUMER of simulator telemetry.
 *
 * Data flow:
 *   Simulator tab → BroadcastChannel("aero-twin-telemetry")
 *     → TwinStateAdapter.ingestTelemetry()
 *       → EKFProcessor.update() → diagnostics (Residuals, EKF state, Health Indices)
 *         → TwinStateManager (single source of truth)
 *           → UAVAttitudeController  (roll/pitch/yaw → engineGroup.rotation)
 *           → EngineStateController  (rpm → animator.setRPM)
 *           → ThermalVisualizer      (cht/egt → cylinder emissive colour)
 *           → VibrationAnimator      (vibration → micro-shake)
 *           → TelemetryMarkers       (floating 3D labels)
 *           → LiveTwinHUD            (telemetry & diagnostics deck)
 */

// ──────────────────────────────────────────────────────────────────────────────
// Live Mission Elapsed Clock
// ──────────────────────────────────────────────────────────────────────────────
const missionStartTime = Date.now() - (1 * 3600 + 26 * 60 + 35) * 1000; // Baseline 01:26:35

function getMissionTimeFormatted() {
  const elapsedSec = Math.floor((Date.now() - missionStartTime) / 1000);
  const h = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
  const s = String(elapsedSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// HUD DOM injection — Live Twin status deck at bottom of screen matching reference
// ──────────────────────────────────────────────────────────────────────────────
function injectLiveTwinHUD() {
  const hud = document.createElement('div');
  hud.id = 'dt-hud';
  hud.innerHTML = `
    <div class="dt-hud-inner">
      <!-- Sync Status Indicator -->
      <div class="dt-hud-section dt-hud-sync">
        <span class="dt-hud-label">SYNC</span>
        <span class="dt-sync-dot" id="dt-sync-dot"></span>
        <span class="dt-sync-text" id="dt-sync-text">WAITING FOR SIMULATOR…</span>
      </div>

      <!-- 1. ENGINE HEALTH (Matching Reference Image) -->
      <div class="dt-hud-card">
        <div class="dt-card-title">ENGINE HEALTH</div>
        <div class="dt-card-main-val text-green" id="dt-hud-health">92%</div>
        <div class="dt-card-sub-tag text-green" id="dt-hud-health-tag">HEALTHY</div>
      </div>

      <!-- 2. ANOMALY SCORE (Matching Reference Image) -->
      <div class="dt-hud-card">
        <div class="dt-card-title">ANOMALY SCORE</div>
        <div class="dt-card-main-val text-cyan" id="dt-hud-anomaly">0.12</div>
        <div class="dt-card-sub-tag text-green" id="dt-hud-anomaly-tag">LOW</div>
      </div>

      <!-- 3. RUL (Remaining Useful Life - Matching Reference Image) -->
      <div class="dt-hud-card">
        <div class="dt-card-title">RUL</div>
        <div class="dt-card-main-val text-slate" id="dt-hud-rul">86.4 hrs</div>
        <div class="dt-card-sub-tag text-green" id="dt-hud-rul-tag">STABLE</div>
      </div>

      <!-- 4. MISSION TIME (Matching Reference Image) -->
      <div class="dt-hud-card">
        <div class="dt-card-title">MISSION TIME</div>
        <div class="dt-card-main-val text-white" id="dt-hud-mission-time">01:26:35</div>
        <div class="dt-card-sub-tag text-cyan">ACTIVE FLIGHT</div>
      </div>

      <!-- 5. FLIGHT ATTITUDE (Roll / Pitch / Yaw) -->
      <div class="dt-hud-section dt-hud-attitude">
        <span class="dt-hud-label">ATTITUDE</span>
        <span class="dt-att-item"><span class="dt-att-axis">ROLL</span><span id="dt-roll">0.0°</span></span>
        <span class="dt-att-item"><span class="dt-att-axis">PITCH</span><span id="dt-pitch">0.0°</span></span>
        <span class="dt-att-item"><span class="dt-att-axis">YAW</span><span id="dt-yaw">0.0°</span></span>
      </div>

      <!-- 6. EKF RESIDUALS / INNOVATION -->
      <div class="dt-hud-section dt-hud-residuals">
        <span class="dt-hud-label">EKF RESIDUALS</span>
        <div class="dt-residual-grid" id="dt-residual-grid">
          <span class="dt-res-item"><span class="dt-res-key">RPM</span><span id="dt-res-rpm">—</span></span>
          <span class="dt-res-item"><span class="dt-res-key">CHT</span><span id="dt-res-cht">—</span></span>
          <span class="dt-res-item"><span class="dt-res-key">EGT</span><span id="dt-res-egt">—</span></span>
          <span class="dt-res-item"><span class="dt-res-key">OIL P</span><span id="dt-res-oil">—</span></span>
          <span class="dt-res-item"><span class="dt-res-key">FUEL</span><span id="dt-res-fuel">—</span></span>
          <span class="dt-res-item"><span class="dt-res-key">VIB</span><span id="dt-res-vib">—</span></span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(hud);
}

// ──────────────────────────────────────────────────────────────────────────────
// HUD update — called on every TwinStateManager update
// ──────────────────────────────────────────────────────────────────────────────
function updateHUD(state, ekfResult, isLive) {
  const $ = (id) => document.getElementById(id);

  // Sync indicator
  const dot  = $('dt-sync-dot');
  const text = $('dt-sync-text');
  if (dot && text) {
    dot.className  = isLive ? 'dt-sync-dot live' : 'dt-sync-dot offline';
    text.innerText = isLive ? 'LIVE — BROADCASTCHANNEL ACTIVE' : 'OFFLINE — NO SIMULATOR DETECTED';
  }

  // Attitude
  const fmt = (v, d = 1) => v !== null && v !== undefined ? `${Number(v).toFixed(d)}°` : '0.0°';
  const el = (id, val) => { const e = $(id); if (e) e.innerText = val; };

  el('dt-roll',  fmt(state.uav?.roll));
  el('dt-pitch', fmt(state.uav?.pitch));
  el('dt-yaw',   fmt(state.uav?.yaw));

  // RPM & Radial Gauge Update
  const rpm = state.engine?.rpm ?? 4820;
  el('dt-gauge-rpm', Math.round(rpm).toLocaleString('en-US'));

  // Radial Gauge Arc calculation (0 to 6000 RPM maps to 0 to 251.2 circumference)
  const gaugeArc = $('dt-gauge-arc');
  if (gaugeArc) {
    const maxRPM = 6000;
    const progress = Math.min(1.0, Math.max(0, rpm / maxRPM));
    const circumference = 2 * Math.PI * 40; // 251.32
    const strokeDash = progress * circumference;
    gaugeArc.style.strokeDasharray = `${strokeDash} ${circumference}`;
  }

  // Health calculation
  const health = ekfResult?.overallHealth ?? state.diagnostics?.healthIndices?.overall ?? 92;
  const hEl = $('dt-hud-health');
  const hTag = $('dt-hud-health-tag');
  if (hEl && hTag) {
    hEl.innerText = `${health}%`;
    if (health >= 85) {
      hEl.className = 'dt-card-main-val text-green';
      hTag.innerText = 'HEALTHY';
      hTag.className = 'dt-card-sub-tag text-green';
    } else if (health >= 60) {
      hEl.className = 'dt-card-main-val text-amber';
      hTag.innerText = 'DEGRADED';
      hTag.className = 'dt-card-sub-tag text-amber';
    } else {
      hEl.className = 'dt-card-main-val text-red';
      hTag.innerText = 'CRITICAL FAULT';
      hTag.className = 'dt-card-sub-tag text-red';
    }
  }

  // Anomaly Score (proportional to residual norm)
  const anomalyScore = Math.max(0.04, Math.min(0.99, Number((1 - health / 100) * 1.5).toFixed(2)));
  const aEl = $('dt-hud-anomaly');
  const aTag = $('dt-hud-anomaly-tag');
  if (aEl && aTag) {
    aEl.innerText = anomalyScore;
    if (anomalyScore < 0.25) {
      aTag.innerText = 'LOW';
      aTag.className = 'dt-card-sub-tag text-green';
    } else if (anomalyScore < 0.60) {
      aTag.innerText = 'MODERATE';
      aTag.className = 'dt-card-sub-tag text-amber';
    } else {
      aTag.innerText = 'HIGH ANOMALY';
      aTag.className = 'dt-card-sub-tag text-red';
    }
  }

  // Remaining Useful Life (RUL)
  const rulHours = Math.max(4.2, (health * 0.94).toFixed(1));
  const rEl = $('dt-hud-rul');
  const rTag = $('dt-hud-rul-tag');
  if (rEl && rTag) {
    rEl.innerText = `${rulHours} hrs`;
    if (health >= 75) {
      rTag.innerText = 'STABLE';
      rTag.className = 'dt-card-sub-tag text-green';
    } else {
      rTag.innerText = 'DEGRADING';
      rTag.className = 'dt-card-sub-tag text-amber';
    }
  }

  // Mission Elapsed Time
  el('dt-hud-mission-time', getMissionTimeFormatted());

  // EKF Residuals
  if (ekfResult?.residuals) {
    const r = ekfResult.residuals;
    const fmtR = (v, dec = 1) => v !== null && v !== undefined ? (v > 0 ? '+' : '') + Number(v).toFixed(dec) : '0.0';
    el('dt-res-rpm',  fmtR(r.rpm,  0));
    el('dt-res-cht',  fmtR(r.cht,  1));
    el('dt-res-egt',  fmtR(r.egt,  1));
    el('dt-res-oil',  fmtR(r.oilPressure, 2));
    el('dt-res-fuel', fmtR(r.fuelFlow, 2));
    el('dt-res-vib',  fmtR(r.vibration, 3));

    // Colour residuals by magnitude
    const colourRes = (id, raw, threshold) => {
      const e = $(id);
      if (!e || raw === null || raw === undefined) return;
      const abs = Math.abs(raw);
      e.style.color = abs < threshold ? '#16a34a' : abs < threshold * 2.5 ? '#d97706' : '#dc2626';
    };
    colourRes('dt-res-rpm',  r.rpm,         300);
    colourRes('dt-res-cht',  r.cht,         15);
    colourRes('dt-res-egt',  r.egt,         50);
    colourRes('dt-res-oil',  r.oilPressure, 0.3);
    colourRes('dt-res-fuel', r.fuelFlow,    1.5);
    colourRes('dt-res-vib',  r.vibration,   0.05);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main bootstrap
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) {
    console.error('[DT] WebGL canvas #webgl-canvas not found.');
    return;
  }

  // 1. Inject Live Twin HUD overlay
  injectLiveTwinHUD();

  // 2. Scene, Camera, Renderer (Dark Aerospace Backdrop matching reference)
  const { scene, camera, renderer, controls } = initScene(canvas);
  
  // Set dark background & fog matching the reference screenshot
  scene.background = new THREE.Color(0x060b17);
  scene.fog = new THREE.FogExp2(0x060b17, 0.012);

  // Setup studio lighting for high metallic reflections
  setupLighting(scene);

  // 3. Instantiate Canonical 3D Aero-Piston Engine Model
  const engine = await loadCanonicalEngineModel();
  scene.add(engine.engineGroup);

  // Subtle dark ground grid
  const gridHelper = new THREE.GridHelper(20, 40, 0x0284c7, 0x1e293b);
  gridHelper.position.y = -1.52;
  scene.add(gridHelper);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ opacity: 0.25 })
  );
  shadowPlane.rotation.x   = -Math.PI / 2;
  shadowPlane.position.y   = -1.53;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // 4. Digital Twin core — state adapter and EKF
  const twinAdapter = new TwinStateAdapter(twinStateManager);
  const ekfProcessor = new EKFProcessor();
  registerTwinStateAdapter(twinAdapter);

  let _ekfResult = ekfProcessor.update({
    rpm: telemetry.rpm,
    cht: telemetry.cht,
    egt: telemetry.egt,
    oilPressure: telemetry.oilPressure,
    fuelFlow: telemetry.fuelFlow,
    vibration: telemetry.vibration,
  });
  twinAdapter.updateDiagnostics({
    predicted: _ekfResult.predicted,
    residuals: _ekfResult.residuals,
    ekf: _ekfResult.ekfState,
    healthIndices: _ekfResult.healthIndices,
  });
  let _lastEkfResult = _ekfResult;

  // 5. Controllers — subscribe to TwinStateManager, drive 3D model
  const engineStateController = new EngineStateController(twinStateManager, engine); // RPM + start/stop
  // NOTE: UAVAttitudeController instantiated but engine group rotation disabled — this is an engine digital twin only.
  const uavAttitudeController = new UAVAttitudeController(twinStateManager, engine.engineGroup);
  // Override: keep engine stationary (zero out any UAV attitude rotation)
  if (uavAttitudeController && engine.engineGroup) engine.engineGroup.rotation.set(0, 0, 0);

  // 6. Digital Twin visualization extensions
  const thermalVisualizer = new ThermalVisualizer(engine.engineGroup, twinStateManager);
  const vibrationAnimator = new VibrationAnimator(engine.engineGroup, twinStateManager);

  // 7. UI & Interaction Setup
  const cameraController  = new CameraController(camera, controls);
  const selectionManager  = new ComponentSelectionManager(engine.engineGroup);
  const isolationManager  = new ComponentIsolationManager();
  const explodedManager   = new ExplodedViewManager(engine.engineGroup);
  const xrayManager       = new XRayModeManager(engine.engineGroup, scene, camera);
  const telemetryOverlay  = new TelemetryOverlayManager(camera, engine.sensorAnchors, twinStateManager);

  // Set camera to professional 3/4 isometric perspective matching reference image
  camera.position.set(4.8, 2.4, 4.2);
  controls.target.set(0, -0.2, 0);
  controls.update();

  // Toast notification for exploded view capability
  const showToast = (msg) => {
    let toast = document.getElementById('dt-toast-msg');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'dt-toast-msg';
      toast.className = 'dt-toast-msg';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.animation = 'none';
    void toast.offsetWidth; // trigger reflow
    toast.style.animation = 'fadeInOut 3.2s forwards';
  };

  const resetAllViews = () => {
    cameraController.resetView();
    selectionManager.clearSelection();
    isolationManager.resetIsolationImmediately();
    explodedManager.collapse();
    xrayManager.disableXRayMode();
    componentPanelUI.closePanel();
    telemetryOverlay.setVisible(true);
    modeSwitcherUI.setStandardMode();
    if (btnVcExplode) btnVcExplode.classList.remove('active');
  };

  const componentPanelUI = new ComponentPanelUI(
    (groupToIsolate) => {
      if (groupToIsolate) isolationManager.isolateComponent(groupToIsolate);
      else                 isolationManager.resetIsolation();
    },
    () => resetAllViews(),
    twinStateManager
  );

  const handleExplodedToggle = () => {
    xrayManager.disableXRayMode();
    explodedManager.toggleExplodedView();
    telemetryOverlay.setVisible(!explodedManager.isExploded);
    if (btnVcExplode) btnVcExplode.classList.toggle('active', explodedManager.isExploded);
  };

  const modeSwitcherUI = new ModeSwitcherUI({
    onStandardMode: () => {
      xrayManager.disableXRayMode();
      explodedManager.collapse();
      telemetryOverlay.setVisible(true);
      if (btnVcExplode) btnVcExplode.classList.remove('active');
    },
    onXRayMode: () => {
      explodedManager.collapse();
      telemetryOverlay.setVisible(false);
      xrayManager.enableXRayMode();
      if (btnVcExplode) btnVcExplode.classList.remove('active');
    },
    onExplodedToggle: handleExplodedToggle,
    onResetView: () => resetAllViews(),
  });

  // Wire View Controls Widget buttons (Bottom-Left)
  const btnVcRotate  = document.getElementById('dt-vc-rotate');
  const btnVcZoom    = document.getElementById('dt-vc-zoom');
  const btnVcPan     = document.getElementById('dt-vc-pan');
  const btnVcExplode = document.getElementById('dt-vc-explode');
  const btnVcReset   = document.getElementById('dt-vc-reset');

  if (btnVcRotate)  btnVcRotate.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; btnVcRotate.classList.toggle('active', controls.autoRotate); });
  if (btnVcZoom)    btnVcZoom.addEventListener('click', () => cameraController.zoomIn(1.3));
  if (btnVcPan)     btnVcPan.addEventListener('click', () => { controls.screenSpacePanning = true; });
  if (btnVcExplode) btnVcExplode.addEventListener('click', handleExplodedToggle);
  if (btnVcReset)   btnVcReset.addEventListener('click', () => resetAllViews());

  const engineRaycaster = new EngineRaycaster(
    camera, scene, canvas,
    (componentName, componentGroup) => {
      selectionManager.selectComponent(componentName, componentGroup);
      componentPanelUI.openPanel(componentName, componentGroup);
      const worldPos = new THREE.Vector3();
      componentGroup.getWorldPosition(worldPos);
      cameraController.flyToComponent(worldPos, 2.4);
    }
  );

  // 8. BroadcastChannel — receive live telemetry from simulator tab
  let _isLive = false;

  if (typeof BroadcastChannel !== 'undefined') {
    const bc = new BroadcastChannel('aero-twin-telemetry');

    bc.onmessage = (event) => {
      if (event.data?.type !== 'TELEMETRY_UPDATE') return;
      const payload = event.data.payload;

      // Ingest into DigitalTwinState
      twinAdapter.ingestTelemetry(payload);

      // Run EKF update with measured values
      _ekfResult = ekfProcessor.update({
        rpm:         payload.rpm,
        cht:         payload.cht,
        egt:         payload.egt,
        oilPressure: payload.oilPressure,
        fuelFlow:    payload.fuelFlow,
        vibration:   payload.vibration,
      });

      // Push EKF diagnostics back into DigitalTwinState
      twinAdapter.updateDiagnostics({
        predicted:    _ekfResult.predicted,
        residuals:    _ekfResult.residuals,
        ekf:          _ekfResult.ekfState,
        healthIndices: _ekfResult.healthIndices,
      });

      _isLive = true;
      _lastEkfResult = _ekfResult;
    };

    bc.onmessageerror = () => {
      console.warn('[DT] BroadcastChannel message error');
    };

    console.info('[DT] BroadcastChannel("aero-twin-telemetry") listener open.');
    console.info('[DT] To send telemetry from the simulator tab, call:');
    console.info('       window.updateTelemetry({ roll: 45, pitch: 10, rpm: 5500, cht: 230 })');
  } else {
    console.warn('[DT] BroadcastChannel not supported in this browser.');
  }

  // Subscribe to state changes to keep HUD up to date
  twinStateManager.subscribe((state) => {
    updateHUD(state, _lastEkfResult, _isLive);
  });

  // Expose global console API for testing
  window.twinStateManager   = twinStateManager;
  window.twinAdapter        = twinAdapter;
  window.ekfProcessor       = ekfProcessor;
  window.aeroEngine         = engine;
  window.updateTelemetry    = updateTelemetry;

  // 9. Render loop
  let previousTime = performance.now();

  function animate(currentTime) {
    requestAnimationFrame(animate);
    const deltaTime = Math.min((currentTime - previousTime) / 1000, 0.1);
    previousTime = currentTime;

    // Ingest kinematics from the live engine animator (crankshaft, propeller, piston positions)
    twinAdapter.ingestKinematics({
      engineRPM:  engine.animator.engineRPM,
      crankAngle: engine.animator.crankAngle,
      pistonsDisplacement: {
        Piston_Left_1:  engine.animator.pistons.Piston_Left_1?.pistonGroup.position.x,
        Piston_Left_2:  engine.animator.pistons.Piston_Left_2?.pistonGroup.position.x,
        Piston_Right_1: engine.animator.pistons.Piston_Right_1?.pistonGroup.position.x,
        Piston_Right_2: engine.animator.pistons.Piston_Right_2?.pistonGroup.position.x,
      }
    });

    // Update sub-systems
    cameraController.update(deltaTime);
    isolationManager.update(deltaTime);
    explodedManager.update(deltaTime);
    xrayManager.updatePositions();
    telemetryOverlay.update();                // 3D sensor leader lines & cards projection
    vibrationAnimator.update(deltaTime);      // vibration micro-shake
    engine.updateEngine(deltaTime);           // mathematically exact propeller rotation
    controls.update();

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

window.addEventListener('DOMContentLoaded', main);
