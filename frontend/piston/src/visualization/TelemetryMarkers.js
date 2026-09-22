import * as THREE from 'three';
import { subscribeTelemetry } from '../data/telemetryData.js';

/**
 * TelemetryMarkersManager — Standard Twin Static Left-Column & Center-Top Dashboard.
 * 
 * Layout:
 * - Left Column: RPM, FUEL FLOW, CHT, OIL PRESS, EGT, OIL TEMP (evenly spaced)
 * - Center Top: VIBRATION (centered horizontally above the engine)
 * 
 * Clean dotted cyan leader lines connect from card edges to 3D anchor points.
 */
export class TelemetryMarkersManager {
  /**
   * @param {THREE.Group} engineGroup 
   * @param {THREE.PerspectiveCamera} camera 
   * @param {TwinStateManager} [stateManager]
   */
  constructor(engineGroup, camera, stateManager = null) {
    this.engineGroup = engineGroup;
    this.camera = camera;
    this.stateManager = stateManager;

    this.svgOverlay = document.getElementById('telemetry-svg-overlay');
    this.labelsContainer = document.getElementById('telemetry-labels-container');

    // 7 cards in exact requested order
    this.leftColumnMarkers = [
      {
        id: 'rpm',
        label: 'RPM',
        unit: 'RPM',
        key: 'rpm',
        anchorOffset: new THREE.Vector3(-1.35, 0.15, -0.2),
        format: (val) => Math.round(Number(val ?? 1200)).toLocaleString('en-US')
      },
      {
        id: 'fuel',
        label: 'FUEL FLOW',
        unit: 'L/h',
        key: 'fuelFlow',
        anchorOffset: new THREE.Vector3(-0.95, 0.65, 0.3),
        format: (val) => Number(val ?? 18.4).toFixed(1)
      },
      {
        id: 'cht',
        label: 'CHT',
        unit: '°C',
        key: 'cht',
        anchorOffset: new THREE.Vector3(-0.65, 0.25, 0.7),
        format: (val) => Math.round(Number(val ?? 158)).toString()
      },
      {
        id: 'oil_press',
        label: 'OIL PRESS',
        unit: 'bar',
        key: 'oilPressure',
        anchorOffset: new THREE.Vector3(-0.35, -0.35, -0.4),
        format: (val) => Number(val ?? 4.2).toFixed(1)
      },
      {
        id: 'egt',
        label: 'EGT',
        unit: '°C',
        key: 'egt',
        anchorOffset: new THREE.Vector3(-0.15, -0.75, 0.5),
        format: (val) => Math.round(Number(val ?? 704)).toString()
      },
      {
        id: 'oil_temp',
        label: 'OIL TEMP',
        unit: '°C',
        key: 'oilTemperature',
        anchorOffset: new THREE.Vector3(0.45, -0.95, -0.1),
        format: (val) => Math.round(Number(val ?? 96)).toString()
      }
    ];

    this.topCenterMarker = {
      id: 'vib',
      label: 'VIBRATION',
      unit: 'g',
      key: 'vibration',
      anchorOffset: new THREE.Vector3(0.0, 0.85, 0.0),
      format: (val) => Number(val ?? 0.13).toFixed(2)
    };

    this.allMarkers = [...this.leftColumnMarkers, this.topCenterMarker];
    this.markerElements = [];
    this.initDOM();

    if (this.stateManager) {
      this.stateManager.subscribe((state) => this.onDigitalTwinStateUpdated(state));
    } else {
      subscribeTelemetry((data) => this.onTelemetryUpdated(data));
    }
  }

  initDOM() {
    if (this.labelsContainer) this.labelsContainer.innerHTML = '';
    if (this.svgOverlay) this.svgOverlay.innerHTML = '';
    this.markerElements = [];

    // Left column wrapper
    const leftCol = document.createElement('div');
    leftCol.className = 'telemetry-left-column';
    if (this.labelsContainer) this.labelsContainer.appendChild(leftCol);

    this.leftColumnMarkers.forEach((m) => {
      const card = this._createCardDOM(m);
      leftCol.appendChild(card.cardEl);
      this.markerElements.push(card);
    });

    // Center top wrapper
    const centerTop = document.createElement('div');
    centerTop.className = 'telemetry-top-center';
    if (this.labelsContainer) this.labelsContainer.appendChild(centerTop);

    const vibCard = this._createCardDOM(this.topCenterMarker);
    centerTop.appendChild(vibCard.cardEl);
    this.markerElements.push(vibCard);
  }

  _createCardDOM(m) {
    const card = document.createElement('div');
    card.className = 'telemetry-card';
    card.id = `marker-card-${m.id}`;

    const indicator = document.createElement('div');
    indicator.className = 'status-indicator';

    const labelName = document.createElement('span');
    labelName.className = 'label-name';
    labelName.innerText = m.label;

    const labelVal = document.createElement('span');
    labelVal.className = 'label-value';
    labelVal.id = `marker-val-${m.id}`;
    labelVal.innerText = `${m.format(null)} ${m.unit}`.trim();

    card.appendChild(indicator);
    card.appendChild(labelName);
    card.appendChild(labelVal);

    // 3D Anchor Dot on Model
    const endpoint = document.createElement('div');
    endpoint.className = 'telemetry-endpoint';
    endpoint.id = `marker-endpoint-${m.id}`;
    if (this.labelsContainer) this.labelsContainer.appendChild(endpoint);

    // SVG Leader Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', '#38bdf8');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '3,3');
    line.setAttribute('opacity', '0.75');
    if (this.svgOverlay) this.svgOverlay.appendChild(line);

    return {
      config: m,
      cardEl: card,
      valEl: labelVal,
      endpointEl: endpoint,
      svgLineEl: line
    };
  }

  onDigitalTwinStateUpdated(state) {
    if (!state) return;
    this.markerElements.forEach(({ config, valEl }) => {
      let rawVal;
      switch (config.key) {
        case 'rpm': rawVal = state.engine?.rpm; break;
        case 'vibration': rawVal = state.vibration?.value; break;
        case 'oilTemperature': rawVal = state.oil?.temperature; break;
        case 'oilPressure': rawVal = state.oil?.pressure; break;
        case 'fuelFlow': rawVal = state.fuel?.flow; break;
        case 'cht': rawVal = state.cooling?.cht; break;
        case 'egt': rawVal = state.cooling?.egt; break;
      }
      if (rawVal !== undefined && rawVal !== null) {
        valEl.innerText = `${config.format(rawVal)} ${config.unit}`.trim();
      }
    });
  }

  onTelemetryUpdated(data) {
    this.markerElements.forEach(({ config, valEl }) => {
      const rawVal = data[config.key];
      if (rawVal !== undefined) {
        valEl.innerText = `${config.format(rawVal)} ${config.unit}`.trim();
      }
    });
  }

  /**
   * Updates leader line positions from static cards to physical 3D model anchors.
   */
  update() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.svgOverlay) {
      this.svgOverlay.setAttribute('width', width.toString());
      this.svgOverlay.setAttribute('height', height.toString());
    }

    this.markerElements.forEach(({ config, cardEl, endpointEl, svgLineEl }) => {
      const worldPos = config.anchorOffset.clone();
      this.engineGroup.localToWorld(worldPos);

      const proj = worldPos.project(this.camera);

      // If behind camera frustum, hide endpoint and line
      if (proj.z > 1.0) {
        endpointEl.style.opacity = '0';
        svgLineEl.setAttribute('opacity', '0');
        return;
      }

      const endX = (proj.x * 0.5 + 0.5) * width;
      const endY = (-proj.y * 0.5 + 0.5) * height;

      endpointEl.style.left = `${endX}px`;
      endpointEl.style.top = `${endY}px`;
      endpointEl.style.opacity = '1';

      const rect = cardEl.getBoundingClientRect();
      let startX = rect.right;
      let startY = rect.top + rect.height / 2;

      if (config.id === 'vib') {
        startX = rect.left + rect.width / 2;
        startY = rect.bottom;
      }

      svgLineEl.setAttribute('x1', startX.toString());
      svgLineEl.setAttribute('y1', startY.toString());
      svgLineEl.setAttribute('x2', endX.toString());
      svgLineEl.setAttribute('y2', endY.toString());
      svgLineEl.setAttribute('opacity', '0.75');
    });
  }

  setVisible(visible) {
    if (this.labelsContainer) {
      this.labelsContainer.style.display = visible ? 'block' : 'none';
    }
    if (this.svgOverlay) {
      this.svgOverlay.style.display = visible ? 'block' : 'none';
    }
  }
}
