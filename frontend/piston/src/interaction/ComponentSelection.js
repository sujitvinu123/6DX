import * as THREE from 'three';

/**
 * Manages component selection in Standard Twin mode.
 * Keeps entire engine 100% OPAQUE and solid while highlighting selected part with cyan glow.
 */
export class ComponentSelectionManager {
  /**
   * @param {THREE.Group} engineGroup 
   */
  constructor(engineGroup) {
    this.engineGroup = engineGroup;
    this.selectedComponentName = null;
    this.selectedGroup = null;

    this.originalMaterialsMap = new Map();
    this.saveOriginalMaterials();
  }

  saveOriginalMaterials() {
    this.engineGroup.traverse((child) => {
      if (child.isMesh && child.material && !this.originalMaterialsMap.has(child.uuid)) {
        this.originalMaterialsMap.set(child.uuid, {
          material: child.material,
          color: child.material.color ? child.material.color.clone() : new THREE.Color(0xffffff)
        });
      }
    });
  }

  /**
   * Selects and highlights a component while keeping the entire engine 100% OPAQUE.
   * @param {string} componentName 
   * @param {THREE.Group} componentGroup 
   */
  selectComponent(componentName, componentGroup) {
    this.clearSelection();

    this.selectedComponentName = componentName;
    this.selectedGroup = componentGroup;

    this.engineGroup.traverse((child) => {
      if (!child.isMesh) return;

      const isInsideSelected = this.isChildOfGroup(child, componentGroup);

      if (isInsideSelected) {
        // Highlight selected component with cyan/blue glow
        child.material = child.material.clone();
        child.material.transparent = false;
        child.material.opacity = 1.0;
        if ('emissive' in child.material) {
          child.material.emissive = new THREE.Color(0x0284c7);
          child.material.emissiveIntensity = 0.55;
        }
      } else {
        // Slightly dim color tone of non-selected parts, KEEPING THEM 100% OPAQUE
        child.material = child.material.clone();
        child.material.transparent = false;
        child.material.opacity = 1.0;
        if (child.material.color) {
          child.material.color.multiplyScalar(0.45);
        }
      }
    });
  }

  /**
   * Clears selection and restores original opaque materials.
   */
  clearSelection() {
    this.selectedComponentName = null;
    this.selectedGroup = null;

    this.engineGroup.traverse((child) => {
      if (!child.isMesh) return;

      const stored = this.originalMaterialsMap.get(child.uuid);
      if (stored) {
        child.material = stored.material;
        child.material.transparent = false;
        child.material.opacity = 1.0;
        if (child.material.color && stored.color) {
          child.material.color.copy(stored.color);
        }
      }
    });
  }

  isChildOfGroup(child, targetGroup) {
    let curr = child;
    while (curr) {
      if (curr === targetGroup) return true;
      curr = curr.parent;
    }
    return false;
  }
}
