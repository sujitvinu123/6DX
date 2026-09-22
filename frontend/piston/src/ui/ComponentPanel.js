import { subscribeTelemetry } from '../data/telemetryData.js';
import { InspectionViewer } from './InspectionViewer.js';

/**
 * UI Component Panel Controller managing right-side component inspection and
 * the embedded SECOND 3D Viewport canvas.
 */
export class ComponentPanelUI {
  constructor(onIsolateClicked, onResetClicked, stateManager = null) {
    this.panelEl = document.getElementById('inspection-panel');
    this.nameEl = document.getElementById('panel-component-name');
    this.catEl = document.getElementById('panel-component-category');
    this.healthStatusEl = document.getElementById('panel-health-status');
    this.healthIdxEl = document.getElementById('panel-health-index');
    this.chtEl = document.getElementById('panel-cht-val');
    this.egtEl = document.getElementById('panel-egt-val');
    this.vibEl = document.getElementById('panel-vib-val');
    this.rpmEl = document.getElementById('panel-rpm-val');

    this.btnIsolate = document.getElementById('btn-isolate-component');
    this.btnReset = document.getElementById('btn-reset-inspection');
    this.btnClose = document.getElementById('btn-close-panel');

    this.onIsolateClicked = onIsolateClicked;
    this.onResetClicked = onResetClicked;
    this.stateManager = stateManager;

    this.activeComponentGroup = null;
    this.activeComponentName = null;

    // Embedded SECOND Three.js viewport inside right panel
    this.inspectionViewer = new InspectionViewer('inspection-canvas');

    this.initListeners();

    if (this.stateManager) {
      this.stateManager.subscribe((state) => this.renderDigitalTwinState(state));
    } else {
      subscribeTelemetry((data) => this.renderTelemetry(data));
    }
  }

  initListeners() {
    this.btnIsolate.addEventListener('click', () => {
      if (this.onIsolateClicked && this.activeComponentGroup) {
        if (this.btnIsolate.innerText.includes('ISOLATE')) {
          this.onIsolateClicked(this.activeComponentGroup);
          this.btnIsolate.innerText = 'RETURN TO ENGINE';
        } else {
          this.onIsolateClicked(null);
          this.btnIsolate.innerText = 'ISOLATE COMPONENT';
        }
      }
    });

    this.btnReset.addEventListener('click', () => {
      if (this.onResetClicked) this.onResetClicked();
    });

    this.btnClose.addEventListener('click', () => {
      if (this.onResetClicked) this.onResetClicked();
      else this.closePanel();
    });
  }

  openPanel(componentName, componentGroup) {
    this.activeComponentName = componentName;
    this.activeComponentGroup = componentGroup;

    const formattedName = componentName.replace(/_/g, ' ').toUpperCase();
    this.nameEl.innerText = formattedName;

    if (componentName.includes('Cylinder') || componentName.includes('Head')) {
      this.catEl.innerText = 'Combustion / Cylinder Group';
    } else if (componentName.includes('Propeller') || componentName.includes('Spinner')) {
      this.catEl.innerText = 'Propulsion & Aerodynamic Rotor';
    } else if (componentName.includes('Crankshaft') || componentName.includes('Shaft') || componentName.includes('Flange')) {
      this.catEl.innerText = 'Kinematic Drivetrain';
    } else if (componentName.includes('Turbo')) {
      this.catEl.innerText = 'Forced Induction / Turbocharger System';
    } else if (componentName.includes('Oil') || componentName.includes('Filter') || componentName.includes('Cooler')) {
      this.catEl.innerText = 'Lubrication & Oil Cooling System';
    } else if (componentName.includes('Intake')) {
      this.catEl.innerText = 'Air Intake & Fuel Injection';
    } else if (componentName.includes('Exhaust')) {
      this.catEl.innerText = 'Exhaust Gas System';
    } else {
      this.catEl.innerText = 'Structural Engine Subsystem';
    }

    this.btnIsolate.innerText = 'ISOLATE COMPONENT';
    this.panelEl.classList.add('active');

    // Load cloned 3D component into the embedded second Three.js viewer canvas
    if (this.inspectionViewer) {
      this.inspectionViewer.loadComponent(componentGroup);
    }
  }

  closePanel() {
    this.panelEl.classList.remove('active');
    this.activeComponentGroup = null;
    this.activeComponentName = null;

    if (this.inspectionViewer) {
      this.inspectionViewer.stopViewer();
    }
  }

  renderDigitalTwinState(state) {
    if (!state) return;
    if (this.chtEl && state.cooling?.cht !== null) this.chtEl.innerText = `${state.cooling.cht} °C`;
    if (this.egtEl && state.cooling?.egt !== null) this.egtEl.innerText = `${state.cooling.egt} °C`;
    if (this.vibEl && state.vibration?.value !== null) this.vibEl.innerText = `${state.vibration.value} g`;
    if (this.rpmEl && state.engine?.rpm !== null) this.rpmEl.innerText = Math.round(Number(state.engine.rpm)).toLocaleString('en-US');
    if (this.healthIdxEl && state.diagnostics?.healthIndices?.overall !== null) this.healthIdxEl.innerText = `${state.diagnostics.healthIndices.overall}`;
    if (this.healthStatusEl && state.engine?.operatingState !== null) this.healthStatusEl.innerText = state.engine.operatingState;
  }

  renderTelemetry(data) {
    if (this.chtEl) this.chtEl.innerText = `${data.cht} °C`;
    if (this.egtEl) this.egtEl.innerText = `${data.egt} °C`;
    if (this.vibEl) this.vibEl.innerText = `${data.vibration} g`;
    if (this.rpmEl) this.rpmEl.innerText = Math.round(Number(data.rpm)).toLocaleString('en-US');
    if (this.healthIdxEl) this.healthIdxEl.innerText = `${data.healthIndex}`;
    if (this.healthStatusEl) this.healthStatusEl.innerText = data.status;
  }
}
