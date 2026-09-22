import * as THREE from 'three';

/**
 * XRayModeManager — 3D Transparent Engine Inspection with Full Component Markings.
 * 
 * In X-Ray mode:
 * - Engine body meshes become transparent cyan/blue (depthWrite: false).
 * - Internal/sub-assemblies highlighted clearly with emissive cyan.
 * - Shows exactly the 23 component markings and green pinpoint markers matching reference.
 * - Standard Twin telemetry cards are hidden.
 * - Smooth manual rotation tracks every marker and leader line in 3D space.
 */
export class XRayModeManager {
  /**
   * @param {THREE.Group} engineGroup 
   * @param {THREE.Scene} scene 
   * @param {THREE.PerspectiveCamera} camera 
   */
  constructor(engineGroup, scene, camera) {
    this.engineGroup = engineGroup;
    this.scene = scene;
    this.camera = camera;

    this.isXRayActive = false;
    this.originalMaterials = new Map();

    // High-visibility semi-transparent X-ray shader materials
    this.xrayMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.2,
      roughness: 0.2,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      name: 'xray_body_mat'
    });

    this.xrayHighlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.5,
      metalness: 0.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
      depthWrite: true,
      name: 'xray_internal_mat'
    });

    // 23 Component definitions matching the reference image
    this.components = [
      // ── Top Left Quadrant ──
      {
        id: 'cr_valve',
        name: 'Common Rail Pressure Control Valve',
        anchorOffset: new THREE.Vector3(-0.6, 1.15, 0.2),
        screenSide: 'left',
        vertOffset: -220
      },
      {
        id: 'wastegate',
        name: 'Wastegate Controller',
        anchorOffset: new THREE.Vector3(-0.95, 1.05, 0.3),
        screenSide: 'left',
        vertOffset: -180
      },
      {
        id: 'coolant_thermo',
        name: 'Coolant Thermostat',
        anchorOffset: new THREE.Vector3(-0.4, 0.95, 0.4),
        screenSide: 'left',
        vertOffset: -140
      },
      {
        id: 'intake_manifold',
        name: 'Intake Manifold',
        anchorOffset: new THREE.Vector3(-0.35, 0.75, 0.5),
        screenSide: 'left',
        vertOffset: -100
      },
      {
        id: 'turbocharger',
        name: 'Turbocharger',
        anchorOffset: new THREE.Vector3(-1.1, 0.75, 0.4),
        screenSide: 'left',
        vertOffset: -60
      },

      // ── Mid & Lower Left Quadrant ──
      {
        id: 'fuel_temp_sensor',
        name: 'Fuel Temperature Sensor',
        anchorOffset: new THREE.Vector3(-1.15, 0.45, 0.2),
        screenSide: 'left',
        vertOffset: -20
      },
      {
        id: 'fuel_press_sensor',
        name: 'Fuel Pressure Sensor',
        anchorOffset: new THREE.Vector3(-1.2, 0.15, 0.3),
        screenSide: 'left',
        vertOffset: 20
      },
      {
        id: 'fuel_metering',
        name: 'Fuel Metering Unit',
        anchorOffset: new THREE.Vector3(-1.15, -0.15, 0.35),
        screenSide: 'left',
        vertOffset: 60
      },
      {
        id: 'hp_pump',
        name: 'High Pressure Pump',
        anchorOffset: new THREE.Vector3(-1.05, -0.45, 0.25),
        screenSide: 'left',
        vertOffset: 100
      },
      {
        id: 'prop_shaft',
        name: 'Propeller Shaft',
        anchorOffset: new THREE.Vector3(-1.4, 0.05, -0.3),
        screenSide: 'left',
        vertOffset: 140
      },
      {
        id: 'crank_sensor_1',
        name: 'Crankshaft Sensor #1',
        anchorOffset: new THREE.Vector3(-0.65, -0.75, -0.2),
        screenSide: 'left',
        vertOffset: 180
      },
      {
        id: 'gearbox',
        name: 'Gearbox',
        anchorOffset: new THREE.Vector3(-0.9, -0.2, -0.3),
        screenSide: 'left',
        vertOffset: 220
      },

      // ── Center & Bottom ──
      {
        id: 'rh_bearing_flange',
        name: 'Forward Right Hand Engine Bearing Flange',
        anchorOffset: new THREE.Vector3(-0.75, 0.1, -0.5),
        screenSide: 'bottom',
        horizOffset: -180
      },
      {
        id: 'gearbox_drain',
        name: 'Gearbox Oil Drain Plug',
        anchorOffset: new THREE.Vector3(-0.45, -0.85, -0.4),
        screenSide: 'bottom',
        horizOffset: -60
      },
      {
        id: 'oil_sump',
        name: 'Oil Sump',
        anchorOffset: new THREE.Vector3(0.1, -1.05, -0.1),
        screenSide: 'bottom',
        horizOffset: 60
      },
      {
        id: 'lh_bearing_flange',
        name: 'Forward Left Hand Engine Bearing Flange',
        anchorOffset: new THREE.Vector3(-0.65, -0.35, -0.4),
        screenSide: 'bottom',
        horizOffset: 180
      },

      // ── Mid & Lower Right Quadrant ──
      {
        id: 'crank_sensor_2',
        name: 'Crankshaft Sensor #2',
        anchorOffset: new THREE.Vector3(0.45, -0.75, -0.2),
        screenSide: 'right',
        vertOffset: 160
      },
      {
        id: 'alternator',
        name: 'Alternator',
        anchorOffset: new THREE.Vector3(0.85, -0.25, 0.2),
        screenSide: 'right',
        vertOffset: 110
      },
      {
        id: 'oil_filler_cap',
        name: 'Engine Oil Filler Cap',
        anchorOffset: new THREE.Vector3(0.75, 0.55, 0.3),
        screenSide: 'right',
        vertOffset: 60
      },
      {
        id: 'v_ribbed_belt',
        name: 'V-Ribbed Belt',
        anchorOffset: new THREE.Vector3(0.95, 0.15, 0.2),
        screenSide: 'right',
        vertOffset: 10
      },

      // ── Top Right Quadrant ──
      {
        id: 'relief_valve',
        name: 'Gearbox Overpressure Relief Valve',
        anchorOffset: new THREE.Vector3(0.65, 0.45, -0.2),
        screenSide: 'right',
        vertOffset: -60
      },
      {
        id: 'gearbox_fill_plug',
        name: 'Gearbox Oil Fill Plug',
        anchorOffset: new THREE.Vector3(0.45, 0.75, -0.2),
        screenSide: 'right',
        vertOffset: -120
      },
      {
        id: 'oil_filter_housing',
        name: 'Engine Oil Filter Housing',
        anchorOffset: new THREE.Vector3(0.7, 0.95, 0.4),
        screenSide: 'right',
        vertOffset: -180
      }
    ];

    this.elements = [];
    this.container = null;
    this.svg = null;

    this.initDOM();
    this.saveOriginalMaterials();
  }

  saveOriginalMaterials() {
    this.engineGroup.traverse((child) => {
      if (child.isMesh && child.material && !this.originalMaterials.has(child.uuid)) {
        this.originalMaterials.set(child.uuid, child.material);
      }
    });
  }

  initDOM() {
    // Container for X-Ray labels
    let container = document.getElementById('xray-labels-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'xray-labels-container';
      container.className = 'xray-labels-container';
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    this.container = container;

    // Dedicated SVG layer for X-Ray dotted leader lines
    let svg = document.getElementById('xray-svg-overlay');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'xray-svg-overlay';
      svg.setAttribute('class', 'xray-svg-overlay');
      svg.style.display = 'none';
      document.body.appendChild(svg);
    }
    this.svg = svg;

    this.container.innerHTML = '';
    this.svg.innerHTML = '';
    this.elements = [];

    this.components.forEach((comp) => {
      // 1. Label Card
      const label = document.createElement('div');
      label.className = `xray-component-label xray-label-${comp.screenSide}`;
      label.id = `xray-lbl-${comp.id}`;
      label.innerText = comp.name;

      label.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSensorDialog(comp.name);
      });

      this.container.appendChild(label);

      // 2. Green Pinpoint Dot on Engine
      const pin = document.createElement('div');
      pin.className = 'xray-pinpoint-dot';
      pin.id = `xray-pin-${comp.id}`;
      this.container.appendChild(pin);

      // 3. SVG Dotted Leader Line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'xray-leader-line');
      line.setAttribute('stroke', '#38bdf8');
      line.setAttribute('stroke-width', '1.25');
      line.setAttribute('stroke-dasharray', '2.5,2.5');
      line.setAttribute('opacity', '0.85');
      this.svg.appendChild(line);

      this.elements.push({
        config: comp,
        labelEl: label,
        pinEl: pin,
        lineEl: line
      });
    });
  }

  toggleXRayMode() {
    if (this.isXRayActive) {
      this.disableXRayMode();
    } else {
      this.enableXRayMode();
    }
  }

  enableXRayMode() {
    if (this.isXRayActive) return;
    this.isXRayActive = true;

    this.saveOriginalMaterials();

    // Apply semi-transparent X-Ray material across engine
    this.engineGroup.traverse((child) => {
      if (!child.isMesh) return;

      const isInternal =
        child.name.includes('Piston') ||
        child.name.includes('Crankshaft') ||
        child.name.includes('Shaft') ||
        child.name.includes('ConRod') ||
        child.name.includes('Sensor') ||
        child.name.includes('Pump') ||
        child.name.includes('Turbine');

      child.material = isInternal ? this.xrayHighlightMaterial : this.xrayMaterial;
    });

    if (this.container) this.container.style.display = 'block';
    if (this.svg) this.svg.style.display = 'block';

    const badge = document.getElementById('xray-mode-badge');
    if (badge) badge.classList.add('active');
  }

  disableXRayMode() {
    this.isXRayActive = false;

    // Restore pristine solid original materials
    this.engineGroup.traverse((child) => {
      if (!child.isMesh) return;
      const originalMat = this.originalMaterials.get(child.uuid);
      if (originalMat) {
        child.material = originalMat;
      }
    });

    if (this.container) this.container.style.display = 'none';
    if (this.svg) this.svg.style.display = 'none';

    const badge = document.getElementById('xray-mode-badge');
    if (badge) badge.classList.remove('active');

    const dialog = document.getElementById('sensor-dialog');
    if (dialog) dialog.classList.remove('active');
  }

  openSensorDialog(componentName) {
    const dialog = document.getElementById('sensor-dialog');
    const nameEl = document.getElementById('sensor-dialog-name');
    const valEl = document.getElementById('sensor-dialog-value');

    if (dialog && nameEl && valEl) {
      nameEl.innerText = componentName;
      valEl.innerText = 'STATUS: NORMAL (NOMINAL)';
      dialog.classList.add('active');
    }
  }

  /**
   * Updates 3D projections of green pinpoint markers and connects clean leader lines.
   */
  updatePositions() {
    if (!this.isXRayActive) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.svg) {
      this.svg.setAttribute('width', width.toString());
      this.svg.setAttribute('height', height.toString());
    }

    const centerY = height * 0.48;
    const centerX = width * 0.50;

    this.elements.forEach(({ config, labelEl, pinEl, lineEl }) => {
      const worldPos = config.anchorOffset.clone();
      this.engineGroup.localToWorld(worldPos);

      const proj = worldPos.project(this.camera);

      // If behind camera frustum
      if (proj.z > 1.0) {
        labelEl.style.opacity = '0';
        pinEl.style.opacity = '0';
        lineEl.setAttribute('opacity', '0');
        return;
      }

      const pinX = (proj.x * 0.5 + 0.5) * width;
      const pinY = (-proj.y * 0.5 + 0.5) * height;

      // Position pinpoint dot directly on 3D component anchor
      pinEl.style.left = `${pinX}px`;
      pinEl.style.top = `${pinY}px`;
      pinEl.style.opacity = '1';

      // Position label card cleanly around the viewport border
      let cardX = 0;
      let cardY = 0;
      let lineStartX = 0;
      let lineStartY = 0;

      if (config.screenSide === 'left') {
        cardX = Math.max(18, width * 0.04);
        cardY = centerY + config.vertOffset;
        lineStartX = cardX + (labelEl.offsetWidth || 140);
        lineStartY = cardY + (labelEl.offsetHeight || 22) / 2;
      } else if (config.screenSide === 'right') {
        cardX = Math.min(width - (labelEl.offsetWidth || 140) - 18, width * 0.82);
        cardY = centerY + config.vertOffset;
        lineStartX = cardX;
        lineStartY = cardY + (labelEl.offsetHeight || 22) / 2;
      } else {
        // Bottom
        cardX = centerX + config.horizOffset - (labelEl.offsetWidth || 140) / 2;
        cardY = height * 0.84;
        lineStartX = cardX + (labelEl.offsetWidth || 140) / 2;
        lineStartY = cardY;
      }

      labelEl.style.left = `${cardX}px`;
      labelEl.style.top = `${cardY}px`;
      labelEl.style.opacity = '1';

      // Draw leader line from card boundary to pinpoint dot
      lineEl.setAttribute('x1', lineStartX.toString());
      lineEl.setAttribute('y1', lineStartY.toString());
      lineEl.setAttribute('x2', pinX.toString());
      lineEl.setAttribute('y2', pinY.toString());
      lineEl.setAttribute('opacity', '0.85');
    });
  }
}
