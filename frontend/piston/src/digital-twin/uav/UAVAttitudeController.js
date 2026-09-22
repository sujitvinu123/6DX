import * as THREE from 'three';

/**
 * UAV Attitude Controller for SIH 26054 Digital Twin.
 * Synchronizes 3D UAV root rotation (roll, pitch, yaw) directly from DigitalTwinState.uav.
 */
export class UAVAttitudeController {
  /**
   * @param {TwinStateManager} stateManager 
   * @param {THREE.Group} targetGroup - Root 3D Group representing the engine/UAV assembly
   */
  constructor(stateManager, targetGroup) {
    this.stateManager = stateManager;
    this.targetGroup = targetGroup;

    this.init();
  }

  init() {
    this.stateManager.subscribe((state, changedPaths) => {
      this.onStateChanged(state, changedPaths);
    });
  }

  onStateChanged(state, changedPaths) {
    if (!this.targetGroup || !state.uav) return;

    // Convert degrees to radians if roll/pitch/yaw are supplied
    const DEG2RAD = Math.PI / 180;

    const roll = state.uav.roll !== null ? state.uav.roll * DEG2RAD : 0;
    const pitch = state.uav.pitch !== null ? state.uav.pitch * DEG2RAD : 0;
    const yaw = state.uav.yaw !== null ? state.uav.yaw * DEG2RAD : 0;

    // Apply rotation matrix / Euler order (ZXY or XYZ) to target 3D root
    this.targetGroup.rotation.set(pitch, yaw, roll, 'YXZ');
  }
}
