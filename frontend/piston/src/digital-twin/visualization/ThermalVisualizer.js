import * as THREE from 'three';

/**
 * ThermalVisualizer — SIH 26054 Digital Twin.
 *
 * Subscribes to TwinStateManager and maps per-cylinder CHT and global EGT
 * to emissive colour overlays on the Three.js cylinder head meshes and
 * exhaust pipe meshes, providing a live thermal heat-map of the engine.
 *
 * Colour scale:
 *   < 150 °C  → no emissive (blue-white, NORMAL)
 *   150-200°C → faint warm amber
 *   200-230°C → orange (#ff6600)
 *   230-270°C → bright red-orange (#ff3300)
 *   > 270°C   → deep red (#ff0000) + strong glow
 *
 * EGT on exhaust pipes:
 *   < 650°C   → no emissive
 *   650-750°C → amber glow
 *   > 750°C   → red-orange glow
 */
export class ThermalVisualizer {
  /**
   * @param {THREE.Group} engineGroup    — root engine group
   * @param {TwinStateManager} stateManager
   */
  constructor(engineGroup, stateManager) {
    this.engineGroup  = engineGroup;
    this.stateManager = stateManager;

    // Cylinder head component names (must match names set in createCylinderBank)
    this._cylHeadNames = [
      'LeftHead_1',   // cylinder1
      'LeftHead_2',   // cylinder2
      'RightHead_1',  // cylinder3
      'RightHead_2',  // cylinder4
    ];

    // Exhaust pipe names
    this._exhaustNames = [
      'ExhaustPipe_Left_1',
      'ExhaustPipe_Left_2',
      'ExhaustPipe_Right_1',
      'ExhaustPipe_Right_2',
    ];

    this._headMeshes    = this._collectMeshesUnder(this._cylHeadNames);
    this._exhaustMeshes = this._collectMeshesUnder(this._exhaustNames);

    this.stateManager.subscribe((state) => this._onStateChanged(state));
  }

  /** Recursively collect all Mesh children under named engine sub-groups */
  _collectMeshesUnder(names) {
    const result = {};
    names.forEach(name => {
      const group = this.engineGroup.getObjectByName(name);
      const meshes = [];
      if (group) {
        group.traverse(child => {
          if (child.isMesh) meshes.push(child);
        });
        // If the object itself is a mesh (leaf node)
        if (group.isMesh) meshes.push(group);
      }
      result[name] = meshes;
    });
    return result;
  }

  /** Maps temperature (°C) for cylinder heads to an emissive THREE.Color + intensity */
  _chtToEmissive(cht) {
    if (cht === null || cht === undefined) return { color: new THREE.Color(0x000000), intensity: 0 };
    if (cht < 150)  return { color: new THREE.Color(0x000000), intensity: 0 };
    if (cht < 180)  return { color: new THREE.Color(0xff8800), intensity: 0.08 };
    if (cht < 210)  return { color: new THREE.Color(0xff6600), intensity: 0.20 };
    if (cht < 240)  return { color: new THREE.Color(0xff3300), intensity: 0.40 };
    return           { color: new THREE.Color(0xff0000), intensity: 0.65 };
  }

  /** Maps EGT (°C) for exhaust pipes to an emissive THREE.Color + intensity */
  _egtToEmissive(egt) {
    if (egt === null || egt === undefined) return { color: new THREE.Color(0x000000), intensity: 0 };
    if (egt < 650)  return { color: new THREE.Color(0x000000), intensity: 0 };
    if (egt < 720)  return { color: new THREE.Color(0xff6600), intensity: 0.15 };
    if (egt < 800)  return { color: new THREE.Color(0xff3300), intensity: 0.35 };
    return           { color: new THREE.Color(0xff1100), intensity: 0.55 };
  }

  _applyEmissive(meshes, color, intensity) {
    meshes.forEach(mesh => {
      if (!mesh.material) return;
      // Clone material on first thermal update to avoid shared-material side effects
      if (!mesh._thermalMaterialCloned) {
        mesh.material = mesh.material.clone();
        mesh._thermalMaterialCloned = true;
      }
      if ('emissive' in mesh.material) {
        mesh.material.emissive.copy(color);
        mesh.material.emissiveIntensity = intensity;
      }
    });
  }

  _onStateChanged(state) {
    if (!state) return;

    // ── Per-cylinder CHT → head mesh emissive ─────────────────────────────
    const cylinders = state.cylinders;
    const cylData = [
      { name: 'LeftHead_1',  cht: cylinders?.cylinder1?.cht },
      { name: 'LeftHead_2',  cht: cylinders?.cylinder2?.cht },
      { name: 'RightHead_1', cht: cylinders?.cylinder3?.cht },
      { name: 'RightHead_2', cht: cylinders?.cylinder4?.cht },
    ];

    cylData.forEach(({ name, cht }) => {
      const { color, intensity } = this._chtToEmissive(cht);
      const meshes = this._headMeshes[name] || [];
      this._applyEmissive(meshes, color, intensity);
    });

    // ── Global EGT → exhaust pipe emissive ────────────────────────────────
    const globalEgt = state.cooling?.egt;
    const { color: eColor, intensity: eIntensity } = this._egtToEmissive(globalEgt);
    this._exhaustNames.forEach(name => {
      const meshes = this._exhaustMeshes[name] || [];
      this._applyEmissive(meshes, eColor, eIntensity);
    });
  }
}
