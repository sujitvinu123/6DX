import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildProceduralEngine } from './ProceduralEngineBuilder.js';

// ── Loading overlay DOM helpers ───────────────────────────────────────────────

function showLoadingOverlay() {
  let overlay = document.getElementById('engine-loading-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'engine-loading-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: rgba(6, 11, 23, 0.92);
    color: #38bdf8;
    font-family: 'Chakra Petch', 'Courier New', monospace;
    gap: 18px;
    pointer-events: none;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-size: 1.1rem; font-weight: 700; letter-spacing: 0.12em; color: #f8fafc;';
  title.textContent = 'AERO-TWIN  |  DIGITAL TWIN ENGINE';

  const label = document.createElement('div');
  label.id = 'engine-loading-label';
  label.style.cssText = 'font-size: 0.80rem; letter-spacing: 0.10em; color: #7dd3fc;';
  label.textContent = 'Loading Aero Engine Model…';

  const bar = document.createElement('div');
  bar.style.cssText = `
    width: 280px; height: 3px; background: #1e3a5f; border-radius: 2px; overflow: hidden;
  `;
  const fill = document.createElement('div');
  fill.style.cssText = `
    height: 100%; width: 0%; background: linear-gradient(90deg, #0284c7, #38bdf8);
    border-radius: 2px; transition: width 0.15s ease;
  `;
  bar.appendChild(fill);

  overlay.appendChild(title);
  overlay.appendChild(label);
  overlay.appendChild(bar);
  document.body.appendChild(overlay);

  overlay._fillEl = fill;

  return overlay;
}

function hideLoadingOverlay(overlay) {
  if (!overlay) return;
  if (overlay._fillEl) overlay._fillEl.style.width = '100%';
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.4s ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 420);
  }, 180);
}

function showErrorOverlay(message) {
  const overlay = document.getElementById('engine-loading-overlay');
  if (overlay) {
    overlay.style.background = 'rgba(24, 6, 6, 0.95)';
    overlay.innerHTML = `
      <div style="font-size:1rem;font-weight:700;letter-spacing:.12em;color:#f87171;">
        ENGINE MODEL FAILED TO LOAD
      </div>
      <div style="font-size:.78rem;color:#fca5a5;max-width:420px;text-align:center;line-height:1.6;margin-top:10px;">
        ${message}
      </div>
    `;
    overlay.style.pointerEvents = 'auto';
  }
}

/**
 * Loads the canonical 3D Aero Engine GLB asset with preserved original coordinate orientation.
 * Fan/propeller is kept removed as per requirement.
 */
export async function loadCanonicalEngineModel(options = {}) {
  const glbPath = '/models/engine.glb';
  const overlay = showLoadingOverlay();

  try {
    console.info(`[EngineLoader] Loading canonical 3D engine from ${glbPath}...`);

    const loader = new GLTFLoader();

    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        glbPath,
        (result) => resolve(result),
        (xhr) => {
          if (xhr.lengthComputable && overlay && overlay._fillEl) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            overlay._fillEl.style.width = `${Math.min(95, percentComplete)}%`;
          }
        },
        (error) => reject(error)
      );
    });

    const engineModel = gltf.scene;
    engineModel.name = 'AeroEngineModel';

    // 1. Compute Bounding Box & Normalize Scale & Center
    const box = new THREE.Box3().setFromObject(engineModel);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = maxDim > 0.001 ? 4.2 / maxDim : 1.0;

    // Center and scale inside root group preserving GLB's original standing orientation
    engineModel.position.set(-center.x * scaleFactor, -center.y * scaleFactor, -center.z * scaleFactor);
    engineModel.scale.setScalar(scaleFactor);

    // 2. Setup materials and shadows
    const engineMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a6578,
      metalness: 0.82,
      roughness: 0.32,
      envMapIntensity: 1.4,
      name: 'mat_aero_engine_pbr'
    });

    const xrayMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
      wireframe: false,
      name: 'mat_aero_engine_xray'
    });

    let meshCount = 0;
    const materialStore = new Map();

    engineModel.traverse((child) => {
      if (child.isMesh) {
        meshCount++;
        child.castShadow = true;
        child.receiveShadow = true;
        materialStore.set(child.uuid, child.material);
        if (child.geometry) {
          child.geometry.computeVertexNormals();
        }
      }
    });

    const isUnifiedMesh = meshCount <= 2;

    const engineGroup = new THREE.Group();
    engineGroup.name = 'AeroPistonEngine';
    engineGroup.add(engineModel);

    // 3. Physical sensor anchors (frontHubX along longitudinal shaft)
    const frontHubX = (-center.x - (size.x * 0.48)) * scaleFactor;
    const sensorAnchors = {
      rpm: new THREE.Vector3(frontHubX, 0.25, 0),
      oilPressure: new THREE.Vector3(-0.25 * scaleFactor, -0.35, -0.30 * scaleFactor),
      oilTemp: new THREE.Vector3(0.40 * scaleFactor, -0.25, -0.25 * scaleFactor),
      fuelFlow: new THREE.Vector3(-0.15 * scaleFactor, 0.45, 0.15 * scaleFactor),
      cht: new THREE.Vector3(0.35 * scaleFactor, 0.30, 0.55 * scaleFactor),
      egt: new THREE.Vector3(0.10 * scaleFactor, -0.45, 0.40 * scaleFactor),
      vibration: new THREE.Vector3(0.0, 0.10, 0.0)
    };

    // 4. Runtime RPM state
    let currentRPM = 1200;
    let targetRPM = 1200;
    let propAngle = 0;
    let isXRay = false;

    const setRPM = (rpm) => {
      targetRPM = Math.max(0, typeof rpm === 'number' ? rpm : 0);
    };

    const setXRayMode = (enable) => {
      isXRay = !!enable;
      engineModel.traverse((child) => {
        if (child.isMesh) {
          child.material = isXRay ? xrayMaterial : (materialStore.get(child.uuid) || engineMaterial);
        }
      });
    };

    const updateEngine = (deltaTime) => {
      currentRPM += (targetRPM - currentRPM) * Math.min(deltaTime * 8.0, 1.0);
    };

    hideLoadingOverlay(overlay);
    console.info(`[EngineLoader] GLB Engine loaded successfully. Mesh count: ${meshCount}`);

    return {
      engineGroup,
      engineModel,
      sensorAnchors,
      isGLB: true,
      isUnifiedMesh,
      hasSeparateComponents: !isUnifiedMesh,
      animator: {
        engineRPM: currentRPM,
        crankAngle: propAngle,
        setRPM,
        pistons: {}
      },
      setRPM,
      getRPM: () => Math.round(currentRPM),
      setXRayMode,
      startEngine: () => setRPM(1200),
      stopEngine: () => setRPM(0),
      updateEngine,
      explode: () => false,
      assemble: () => true,
      toggleExploded: () => false,
      isExploded: () => false
    };

  } catch (err) {
    console.warn('[EngineLoader] GLB load failed, falling back to procedural engine model:', err);
    try {
      const fallback = buildProceduralEngine();
      hideLoadingOverlay(overlay);
      return fallback;
    } catch (fallbackErr) {
      showErrorOverlay(`Failed to load engine model: ${err?.message || err}`);
      throw err;
    }
  }
}
