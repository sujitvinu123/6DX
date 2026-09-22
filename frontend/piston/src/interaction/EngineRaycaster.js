import * as THREE from 'three';

/**
 * Handles 3D Raycasting for click/tap interaction on Engine components and Sensor markers.
 */
export class EngineRaycaster {
  /**
   * @param {THREE.PerspectiveCamera} camera 
   * @param {THREE.Scene} scene 
   * @param {HTMLCanvasElement} canvas 
   * @param {Function} onComponentClicked 
   */
  constructor(camera, scene, canvas, onComponentClicked) {
    this.camera = camera;
    this.scene = scene;
    this.canvas = canvas;
    this.onComponentClicked = onComponentClicked;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.pointerDownTime = 0;
    this.pointerDownPos = new THREE.Vector2();

    this.initListeners();
  }

  initListeners() {
    this.canvas.addEventListener('pointerdown', (e) => {
      this.pointerDownTime = performance.now();
      this.pointerDownPos.set(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('pointerup', (e) => {
      // Ignore drags / orbit controls interaction
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      const duration = performance.now() - this.pointerDownTime;
      if (dist > 5 || duration > 400) return;

      this.onClick(e);
    });
  }

  onClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const rootGroup = this.scene.getObjectByName('AeroPistonEngine');
    if (!rootGroup) return;

    const intersects = this.raycaster.intersectObjects(rootGroup.children, true);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      const logicalComponent = this.resolveLogicalComponent(hitObject);
      if (logicalComponent) {
        this.onComponentClicked(logicalComponent.name, logicalComponent.group, hitObject);
      }
    }
  }

  /**
   * Traverses upward from hit mesh to find the primary named component group.
   */
  resolveLogicalComponent(hitMesh) {
    let curr = hitMesh;

    // List of target component group names
    const targetNames = [
      'LeftCylinder_1', 'LeftCylinder_2', 'RightCylinder_1', 'RightCylinder_2',
      'LeftHead_1', 'LeftHead_2', 'RightHead_1', 'RightHead_2',
      'Piston_Left_1', 'Piston_Left_2', 'Piston_Right_1', 'Piston_Right_2',
      'Injector_Left_1', 'Injector_Left_2', 'Injector_Right_1', 'Injector_Right_2',
      'Crankcase', 'Crankshaft', 'OutputShaft', 'OutputFlange',
      'IntakeSystem', 'ExhaustSystem', 'StarterMotor', 'Alternator',
      'ElectricalBoxes', 'MountingSystem'
    ];

    while (curr && curr.name !== 'AeroPistonEngine' && curr !== this.scene) {
      if (targetNames.includes(curr.name)) {
        return { name: curr.name, group: curr };
      }
      curr = curr.parent;
    }

    return null;
  }
}
