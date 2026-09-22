import * as THREE from 'three';

/**
 * TelemetryOverlayManager — High-Precision Static Screen Telemetry Markings.
 * 
 * Layout:
 * - Left Column: RPM, FUEL FLOW, CHT, OIL PRESS, EGT, OIL TEMP
 * - Center Top: VIBRATION
 */
export class TelemetryOverlayManager {
  /**
   * @param {THREE.Camera} camera
   * @param {Object} sensorAnchors - Map of 3D Vector3 positions on engine
   * @param {TwinStateManager} stateManager
   */
  constructor(camera, sensorAnchors, stateManager) {
    this.camera = camera;
    this.sensorAnchors = sensorAnchors || {};
    this.stateManager = stateManager;

    this.container = document.getElementById('telemetry-overlay-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'telemetry-overlay-container';
      this.container.className = 'telemetry-overlay-container';
      document.body.appendChild(this.container);
    }

    // SVG canvas for crisp dotted leader lines
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'telemetry-svg-layer');
    this.container.appendChild(this.svg);

    // Left Column items
    this.leftColumnSensors = [
      {
        id: 'sensor-rpm',
        key: 'rpm',
        title: 'RPM',
        unit: 'RPM',
        format: (s) => (s.engine?.rpm ?? 1200).toLocaleString(),
        anchor: this.sensorAnchors.rpm || new THREE.Vector3(-1.35, 0.15, -0.2)
      },
      {
        id: 'sensor-fuel-flow',
        key: 'fuelFlow',
        title: 'FUEL FLOW',
        unit: 'L/h',
        format: (s) => (s.fuel?.flow ?? 18.4).toFixed(1),
        anchor: this.sensorAnchors.fuelFlow || new THREE.Vector3(-0.95, 0.65, 0.3)
      },
      {
        id: 'sensor-cht',
        key: 'cht',
        title: 'CHT',
        unit: '°C',
        format: (s) => Math.round(s.cooling?.cht ?? 158).toString(),
        anchor: this.sensorAnchors.cht || new THREE.Vector3(-0.65, 0.25, 0.7)
      },
      {
        id: 'sensor-oil-pres',
        key: 'oilPressure',
        title: 'OIL PRESS',
        unit: 'bar',
        format: (s) => (s.oil?.pressure ?? 4.2).toFixed(1),
        anchor: this.sensorAnchors.oilPressure || new THREE.Vector3(-0.35, -0.35, -0.4)
      },
      {
        id: 'sensor-egt',
        key: 'egt',
        title: 'EGT',
        unit: '°C',
        format: (s) => Math.round(s.cooling?.egt ?? 704).toString(),
        anchor: this.sensorAnchors.egt || new THREE.Vector3(-0.15, -0.75, 0.5)
      },
      {
        id: 'sensor-oil-temp',
        key: 'oilTemp',
        title: 'OIL TEMP',
        unit: '°C',
        format: (s) => Math.round(s.oil?.temperature ?? 96).toString(),
        anchor: this.sensorAnchors.oilTemp || new THREE.Vector3(0.45, -0.95, -0.1)
      }
    ];

    // Center Top item
    this.topCenterSensor = {
      id: 'sensor-vib',
      key: 'vibration',
      title: 'VIBRATION',
      unit: 'g',
      format: (s) => (s.vibration?.value ?? 0.13).toFixed(2),
      anchor: this.sensorAnchors.vibration || new THREE.Vector3(0.0, 0.85, 0.0)
    };

    this.allSensors = [...this.leftColumnSensors, this.topCenterSensor];
    this.cardElements = new Map();
    this.lineElements = new Map();

    this._createCardsAndLines();

    if (this.stateManager) {
      this.stateManager.subscribe((state) => this._onStateUpdate(state));
    }
  }

  _createCardsAndLines() {
    this.container.innerHTML = '';
    this.container.appendChild(this.svg);
    this.cardElements.clear();
    this.lineElements.clear();

    // Left column container
    const leftCol = document.createElement('div');
    leftCol.className = 'telemetry-left-column';
    this.container.appendChild(leftCol);

    this.leftColumnSensors.forEach((sensor) => {
      this._createCard(sensor, leftCol);
    });

    // Center top container
    const centerTop = document.createElement('div');
    centerTop.className = 'telemetry-top-center';
    this.container.appendChild(centerTop);

    this._createCard(this.topCenterSensor, centerTop);
  }

  _createCard(sensor, parentEl) {
    const card = document.createElement('div');
    card.id = sensor.id;
    card.className = 'dt-sensor-card';

    card.innerHTML = `
      <div class="dt-sensor-header">
        <span class="dt-status-dot"></span>
        <span class="dt-sensor-title">${sensor.title}</span>
      </div>
      <div class="dt-sensor-body">
        <span class="dt-sensor-val" id="${sensor.id}-val">--</span>
        <span class="dt-sensor-unit">${sensor.unit}</span>
      </div>
    `;
    parentEl.appendChild(card);
    this.cardElements.set(sensor.id, card);

    // SVG Leader Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'dt-leader-line');
    line.setAttribute('stroke', '#38bdf8');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '3 3');
    line.setAttribute('opacity', '0.75');
    this.svg.appendChild(line);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'dt-anchor-dot');
    circle.setAttribute('r', '3.5');
    circle.setAttribute('fill', '#22c55e');
    circle.setAttribute('stroke', '#060b17');
    circle.setAttribute('stroke-width', '1.5');
    this.svg.appendChild(circle);

    this.lineElements.set(sensor.id, { line, circle, sensor });
  }

  _onStateUpdate(state) {
    if (!state) return;
    this.allSensors.forEach((sensor) => {
      const valEl = document.getElementById(`${sensor.id}-val`);
      if (valEl) {
        valEl.textContent = sensor.format(state);
      }
    });
  }

  /**
   * Called every animation frame to project 3D engine anchor coordinates into
   * screen pixels and position SVG leader lines smoothly.
   */
  update() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.svg.setAttribute('width', width.toString());
    this.svg.setAttribute('height', height.toString());

    this.allSensors.forEach((sensor) => {
      const card = this.cardElements.get(sensor.id);
      const lineEntry = this.lineElements.get(sensor.id);
      if (!card || !lineEntry || !sensor.anchor) return;
      const { line, circle } = lineEntry;

      const anchor3D = sensor.anchor.clone();
      anchor3D.project(this.camera);

      // If behind camera
      if (anchor3D.z > 1.0) {
        line.style.opacity = '0';
        circle.style.opacity = '0';
        return;
      }

      const anchorScreenX = (anchor3D.x * 0.5 + 0.5) * width;
      const anchorScreenY = (-(anchor3D.y * 0.5) + 0.5) * height;

      const cardRect = card.getBoundingClientRect();
      let lineStartX = cardRect.right;
      let lineStartY = cardRect.top + cardRect.height / 2;

      if (sensor.id === 'sensor-vib') {
        lineStartX = cardRect.left + cardRect.width / 2;
        lineStartY = cardRect.bottom;
      }

      line.setAttribute('x1', lineStartX.toString());
      line.setAttribute('y1', lineStartY.toString());
      line.setAttribute('x2', anchorScreenX.toString());
      line.setAttribute('y2', anchorScreenY.toString());
      line.style.opacity = '0.85';

      circle.setAttribute('cx', anchorScreenX.toString());
      circle.setAttribute('cy', anchorScreenY.toString());
      circle.style.opacity = '1';
    });
  }

  setVisible(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
