/**
 * Engine State Controller for SIH 26054 Digital Twin.
 * Synchronizes 3D engine mechanical animation controllers directly from DigitalTwinState.
 * 
 * Rules:
 * - Single source of truth is DigitalTwinState.
 * - Does NOT generate random noise or fake physics.
 */
export class EngineStateController {
  /**
   * @param {TwinStateManager} stateManager 
   * @param {Object} engineModel - AeroPistonEngine instance returned from createAeroPistonEngine()
   */
  constructor(stateManager, engineModel) {
    this.stateManager = stateManager;
    this.engineModel = engineModel;

    this.init();
  }

  init() {
    this.stateManager.subscribe((state, changedPaths) => {
      this.onStateChanged(state, changedPaths);
    });
  }

  onStateChanged(state, changedPaths) {
    if (!this.engineModel || !state.engine) return;

    // 1. Sync Engine RPM to mechanical animation controller
    if (state.engine.rpm !== null && state.engine.rpm !== undefined) {
      if (this.engineModel.setRPM) {
        this.engineModel.setRPM(state.engine.rpm);
      }
    }

    // 2. Sync Engine Ignition Operating State
    if (state.engine.operatingState) {
      if (state.engine.operatingState === 'STOPPED' && this.engineModel.stopEngine) {
        this.engineModel.stopEngine();
      } else if (state.engine.operatingState === 'HEALTHY' || state.engine.operatingState === 'RUNNING') {
        if (this.engineModel.startEngine) {
          this.engineModel.startEngine();
        }
      }
    }
  }
}
