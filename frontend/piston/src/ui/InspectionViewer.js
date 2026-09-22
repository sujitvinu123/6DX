import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * InspectionViewer: Embedded SECOND Three.js Viewport inside the right inspection panel.
 * Renders an isolated, cloned, 100% opaque 3D component with independent orbit & zoom.
 */
export class InspectionViewer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    // 1. DEDICATED SCENE
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // 2. DEDICATED CAMERA
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(2, 1.5, 2.5);

    // 3. DEDICATED WEBGL RENDERER
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(280, 200);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // 4. DEDICATED LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight1.position.set(5, 8, 5);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0284c7, 1.5);
    dirLight2.position.set(-5, 4, -5);
    this.scene.add(dirLight2);

    // 5. DEDICATED ORBIT CONTROLS
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 10.0;

    this.clonedObject = null;
    this.isActive = false;

    this.animate = this.animate.bind(this);
  }

  /**
   * Loads a deep clone of the engine component into the 3D viewer.
   * @param {THREE.Group} sourceGroup 
   */
  loadComponent(sourceGroup) {
    if (!sourceGroup || !this.canvas) return;

    // Clear previous component
    if (this.clonedObject) {
      this.scene.remove(this.clonedObject);
      this.clonedObject = null;
    }

    // Deep clone component
    this.clonedObject = sourceGroup.clone(true);
    this.clonedObject.position.set(0, 0, 0);
    this.clonedObject.rotation.set(0, 0, 0);

    // Ensure EVERY material on cloned component is 100% OPAQUE and solid
    this.clonedObject.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.transparent = false;
        child.material.opacity = 1.0;
        if ('emissive' in child.material) {
          child.material.emissive = new THREE.Color(0x000000);
          child.material.emissiveIntensity = 0;
        }
      }
    });

    this.scene.add(this.clonedObject);

    // Auto-fit camera around cloned component bounding box
    const box = new THREE.Box3().setFromObject(this.clonedObject);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    this.clonedObject.position.sub(center); // Center component at origin

    const distance = maxDim * 2.2;
    this.camera.position.set(distance * 0.8, distance * 0.6, distance);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.isActive = true;
    this.resizeCanvas();
    requestAnimationFrame(this.animate);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth || 280;
    const height = this.canvas.clientHeight || 200;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  stopViewer() {
    this.isActive = false;
    if (this.clonedObject) {
      this.scene.remove(this.clonedObject);
      this.clonedObject = null;
    }
  }

  animate() {
    if (!this.isActive) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
