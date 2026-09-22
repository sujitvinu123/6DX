import * as THREE from 'three';

/**
 * Handles Component Isolation mode: separates selected engine parts smoothly
 * away from the main assembly and allows restoration.
 */
export class ComponentIsolationManager {
  constructor() {
    this.isolatedGroup = null;
    this.originalPosition = new THREE.Vector3();
    this.originalQuaternion = new THREE.Quaternion();
    
    this.isIsolated = false;
    this.isTransitioning = false;
    this.transitionProgress = 1.0;
    this.transitionDuration = 0.6; // seconds

    this.startPos = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
  }

  /**
   * Isolates a component group by moving it outward along a component-specific direction.
   * @param {THREE.Group} componentGroup 
   */
  isolateComponent(componentGroup) {
    if (!componentGroup) return;

    if (this.isIsolated && this.isolatedGroup === componentGroup) return;

    if (this.isIsolated) {
      this.resetIsolationImmediately();
    }

    this.isolatedGroup = componentGroup;
    this.originalPosition.copy(componentGroup.position);
    this.originalQuaternion.copy(componentGroup.quaternion);

    // Calculate displacement vector based on component orientation/type
    const offsetDir = new THREE.Vector3();
    const name = componentGroup.name;

    if (name.includes('Left')) {
      offsetDir.set(-1.8, 0.4, 0);
    } else if (name.includes('Right')) {
      offsetDir.set(1.8, 0.4, 0);
    } else if (name.includes('Intake')) {
      offsetDir.set(0, 1.8, 0);
    } else if (name.includes('Exhaust')) {
      offsetDir.set(0, -1.8, 0);
    } else if (name.includes('Output')) {
      offsetDir.set(0, 0.4, 2.0);
    } else {
      offsetDir.set(0, 1.6, 1.2);
    }

    this.startPos.copy(componentGroup.position);
    this.targetPos.copy(this.originalPosition).add(offsetDir);

    this.transitionProgress = 0.0;
    this.isTransitioning = true;
    this.isIsolated = true;
  }

  /**
   * Smoothly returns isolated component to original position on engine.
   */
  resetIsolation() {
    if (!this.isIsolated || !this.isolatedGroup) return;

    this.startPos.copy(this.isolatedGroup.position);
    this.targetPos.copy(this.originalPosition);

    this.transitionProgress = 0.0;
    this.isTransitioning = true;
    this.isIsolated = false;
  }

  resetIsolationImmediately() {
    if (this.isolatedGroup) {
      this.isolatedGroup.position.copy(this.originalPosition);
      this.isolatedGroup.quaternion.copy(this.originalQuaternion);
    }
    this.isolatedGroup = null;
    this.isIsolated = false;
    this.isTransitioning = false;
  }

  /**
   * Animation frame update.
   * @param {number} deltaTime 
   */
  update(deltaTime) {
    if (!this.isTransitioning || !this.isolatedGroup) return;

    this.transitionProgress += deltaTime / this.transitionDuration;
    if (this.transitionProgress >= 1.0) {
      this.transitionProgress = 1.0;
      this.isTransitioning = false;
      if (!this.isIsolated) {
        this.isolatedGroup = null;
      }
    }

    const t = 1 - Math.pow(1 - this.transitionProgress, 3);
    this.isolatedGroup.position.lerpVectors(this.startPos, this.targetPos, t);
  }
}
