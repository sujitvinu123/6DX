import * as THREE from 'three';
import {initScene } from './scene/setup.js';
import {setupLighting } from './scene/lighting.js';
import {loadCanonicalEngineModel } from './engine/EngineModelLoader.js';

import {CameraController } from './camera/CameraController.js';
import {EngineRaycaster } from './interaction/EngineRaycaster.js';
import {ComponentSelectionManager } from './interaction/ComponentSelection.js';
import {ComponentIsolationManager } from './interaction/ComponentIsolation.js';
import {ExplodedViewManager } from './visualization/ExplodedView.js';
import {XRayModeManager } from './visualization/XRayMode.js';
import {TelemetryMarkersManager } from './visualization/TelemetryMarkers.js';

import {ComponentPanelUI } from './ui/ComponentPanel.js';
import {ModeSwitcherUI } from './ui/ModeSwitcher.js';
import {updateTelemetry, registerTwinStateAdapter } from './data/telemetryData.js';

// Digital Twin Core Imports
import {twinStateManager } from './digital-twin/TwinStateManager.js';
import {TwinStateAdapter } from './digital-twin/TwinStateAdapter.js';
import {EngineStateController } from './digital-twin/engine/EngineStateController.js';
import {UAVAttitudeController } from './digital-twin/uav/UAVAttitudeController.js';

/**
 * Main Application Bootstrap for AERO-TWIN Interactive Digital Twin Interface
 */
async function main() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) {
    console.error('WebGL canvas element #webgl-canvas not found.');
    return;
  }

  // 1. Initialize Scene, Camera, Renderer, and OrbitControls
  const { scene, camera, renderer, controls } = initScene(canvas);

  // 2. Setup Light Technical Product Visualization Lighting
  setupLighting(scene);

  // 3. Instantiate Canonical 3D Aero-Piston Engine Model
  const engine = await loadCanonicalEngineModel();
  scene.add(engine.engineGroup);

  // Ground Grid Stand
  const gridHelper = new THREE.GridHelper(20, 40, 0x0284c7, 0xcbd5e1);
  gridHelper.position.y = -1.52;
  scene.add(gridHelper);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ opacity: 0.15 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.53;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // 4. Initialize Digital Twin Core Architecture & Controllers
  const twinAdapter = new TwinStateAdapter(twinStateManager);
  registerTwinStateAdapter(twinAdapter);

  const engineStateController = new EngineStateController(twinStateManager, engine);
  const uavAttitudeController = new UAVAttitudeController(twinStateManager, engine.engineGroup);
  // Engine-only twin: keep 3D model stationary regardless of UAV attitude data
  if (uavAttitudeController && engine.engineGroup) engine.engineGroup.rotation.set(0, 0, 0);

  // 5. Initialize Modular Digital Twin Systems
  const cameraController = new CameraController(camera, controls);
  const selectionManager = new ComponentSelectionManager(engine.engineGroup);
  const isolationManager = new ComponentIsolationManager();
  const explodedManager = new ExplodedViewManager(engine.engineGroup);
  const xrayManager = new XRayModeManager(engine.engineGroup, scene, camera);
  const telemetryMarkers = new TelemetryMarkersManager(engine.engineGroup, camera, twinStateManager);

  // Helper: Reset complete Digital Twin view to default state
  const resetAllViews = () => {
    cameraController.resetView();
    selectionManager.clearSelection();
    isolationManager.resetIsolationImmediately();
    explodedManager.collapse();
    xrayManager.disableXRayMode();
    componentPanelUI.closePanel();
    telemetryMarkers.setVisible(true);
    modeSwitcherUI.setStandardMode();
  };

  // 6. Initialize UI Components
  const componentPanelUI = new ComponentPanelUI(
    // On Isolate / Return clicked
    (groupToIsolate) => {
      if (groupToIsolate) {
        isolationManager.isolateComponent(groupToIsolate);
      } else {
        isolationManager.resetIsolation();
      }
    },
    // On Reset clicked
    () => resetAllViews(),
    twinStateManager
  );

  const modeSwitcherUI = new ModeSwitcherUI({
    onStandardMode: () => {
      xrayManager.disableXRayMode();
      explodedManager.collapse();
      telemetryMarkers.setVisible(true);
    },
    onXRayMode: () => {
      explodedManager.collapse();
      telemetryMarkers.setVisible(false);
      xrayManager.enableXRayMode();
    },
    onExplodedToggle: () => {
      xrayManager.disableXRayMode();
      explodedManager.toggleExplodedView();
      telemetryMarkers.setVisible(!explodedManager.isExploded);
    },
    onResetView: () => resetAllViews()
  });

  // 7. Initialize Raycasting Component Selection
  const engineRaycaster = new EngineRaycaster(
    camera,
    scene,
    canvas,
    (componentName, componentGroup) => {
      // Highlight selected component & dim rest
      selectionManager.selectComponent(componentName, componentGroup);

      // Open inspection panel
      componentPanelUI.openPanel(componentName, componentGroup);

      // Smooth camera transition toward component world position
      const worldPos = new THREE.Vector3();
      componentGroup.getWorldPosition(worldPos);
      cameraController.flyToComponent(worldPos, 2.4);
    }
  );

  // Expose global API for console, verification testing & external integration
  window.aeroEngine = engine;
  window.updateTelemetry = updateTelemetry;
  window.twinStateManager = twinStateManager;
  window.digitalTwinState = twinStateManager;
  window.digitalTwinAdapter = twinAdapter;

  // 8. ANIMATION RENDER LOOP
  let previousTime = performance.now();

  function animate(currentTime) {
    requestAnimationFrame(animate);

    const deltaTime = Math.min((currentTime - previousTime) / 1000, 0.1);
    previousTime = currentTime;

    // Ingest mechanical kinematics frame into TwinStateAdapter
    twinAdapter.ingestKinematics({
      engineRPM: engine.animator.engineRPM,
      crankAngle: engine.animator.crankAngle,
      pistonsDisplacement: {
        Piston_Left_1: engine.animator.pistons.Piston_Left_1?.pistonGroup.position.x,
        Piston_Left_2: engine.animator.pistons.Piston_Left_2?.pistonGroup.position.x,
        Piston_Right_1: engine.animator.pistons.Piston_Right_1?.pistonGroup.position.x,
        Piston_Right_2: engine.animator.pistons.Piston_Right_2?.pistonGroup.position.x
      }
    });

    // Update camera transitions
    cameraController.update(deltaTime);

    // Update isolation & exploded view displacement animations
    isolationManager.update(deltaTime);
    explodedManager.update(deltaTime);

    // Update 3D sensor markers and projected telemetry screen markers
    xrayManager.updatePositions();
    telemetryMarkers.update();

    // Update engine mechanical rotation & piston strokes driven by state
    engine.updateEngine(deltaTime);

    // Update camera OrbitControls
    controls.update();

    // Render Scene
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
window.addEventListener('DOMContentLoaded', main);