/**
 * Top Navigation Mode Switcher Controller.
 * Manages mode state switching between Standard Twin, X-Ray & Sensors, Exploded View, and Reset.
 */
export class ModeSwitcherUI {
  /**
   * @param {Object} callbacks - { onStandardMode, onXRayMode, onExplodedToggle, onResetView }
   */
  constructor(callbacks) {
    this.btnStandard = document.getElementById('btn-mode-standard');
    this.btnXRay = document.getElementById('btn-mode-xray');
    this.btnExploded = document.getElementById('btn-exploded-view');
    this.btnReset = document.getElementById('btn-reset-view');

    this.callbacks = callbacks;
    this.initListeners();
  }

  initListeners() {
    this.btnStandard.addEventListener('click', () => {
      this.btnStandard.classList.add('active');
      this.btnXRay.classList.remove('active');
      if (this.callbacks.onStandardMode) this.callbacks.onStandardMode();
    });

    this.btnXRay.addEventListener('click', () => {
      this.btnXRay.classList.add('active');
      this.btnStandard.classList.remove('active');
      if (this.callbacks.onXRayMode) this.callbacks.onXRayMode();
    });

    this.btnExploded.addEventListener('click', () => {
      this.btnExploded.classList.toggle('active-exploded');
      if (this.callbacks.onExplodedToggle) this.callbacks.onExplodedToggle();
    });

    this.btnReset.addEventListener('click', () => {
      this.setStandardMode();
      this.btnExploded.classList.remove('active-exploded');
      if (this.callbacks.onResetView) this.callbacks.onResetView();
    });
  }

  setStandardMode() {
    this.btnStandard.classList.add('active');
    this.btnXRay.classList.remove('active');
  }

  setXRayMode() {
    this.btnXRay.classList.add('active');
    this.btnStandard.classList.remove('active');
  }
}
