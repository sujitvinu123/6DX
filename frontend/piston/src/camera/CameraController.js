import * as THREE from 'three';

/**
 * Camera Controller handling smooth position & target transitions.
 */
export class CameraController {
  /**
   * @param {THREE.PerspectiveCamera} camera 
   * @param {OrbitControls} controls 
   */
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;

    this.defaultPosition = new THREE.Vector3(4.8, 2.4, 4.2);
    this.defaultTarget = new THREE.Vector3(0, -0.2, 0);

    this.isTransitioning = false;
    this.transitionProgress = 1.0;
    this.transitionDuration = 1.0; // seconds

    this.startPosition = new THREE.Vector3();
    this.endPosition = new THREE.Vector3();
    this.startTarget = new THREE.Vector3();
    this.endTarget = new THREE.Vector3();
  }

  /**
   * Smoothly animates camera to frame a specific component target.
   * @param {THREE.Vector3} targetLookAt - Center of target object
   * @param {number} distanceOffset - Desired distance from target
   */
  flyToComponent(targetLookAt, distanceOffset = 2.5) {
    this.startPosition.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);

    this.endTarget.copy(targetLookAt);

    // Calculate direction vector from target to current camera
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    if (dir.lengthSq() < 0.001) dir.set(1, 0.8, 1).normalize();

    this.endPosition.copy(targetLookAt).addScaledVector(dir, distanceOffset);

    this.transitionProgress = 0.0;
    this.isTransitioning = true;
  }

  /**
   * Smoothly resets camera to default view framing complete engine.
   */
  resetView() {
    this.startPosition.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);

    this.endPosition.copy(this.defaultPosition);
    this.endTarget.copy(this.defaultTarget);

    this.transitionProgress = 0.0;
    this.isTransitioning = true;
  }

  /**
   * Called every frame in the render loop.
   * @param {number} deltaTime 
   */
  update(deltaTime) {
    if (!this.isTransitioning) return;

    this.transitionProgress += deltaTime / this.transitionDuration;
    if (this.transitionProgress >= 1.0) {
      this.transitionProgress = 1.0;
      this.isTransitioning = false;
    }

    // Smooth cubic easing function (easeOutCubic)
    const t = 1 - Math.pow(1 - this.transitionProgress, 3);

    this.camera.position.lerpVectors(this.startPosition, this.endPosition, t);
    this.controls.target.lerpVectors(this.startTarget, this.endTarget, t);
    this.controls.update();
  }
}
