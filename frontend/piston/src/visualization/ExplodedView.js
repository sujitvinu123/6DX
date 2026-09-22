import * as THREE from 'three';

/**
 * ExplodedViewManager — True Technical Exploded Assembly View.
 * 
 * Separates ONLY the major existing engine assemblies outward from the central
 * core along sensible mechanical axes while the central engine block remains
 * anchored in place (so the engine never jumps, flips, or flies away).
 * 
 * Animation:
 * - Smooth 0.8s cubic ease-out transition.
 * - Stores pristine initial transforms so repeated toggling never accumulates offsets.
 * - Restores exact original assembled transforms on collapse/reset.
 */
export class ExplodedViewManager {
  /**
   * @param {THREE.Group} engineGroup 
   */
  constructor(engineGroup) {
    this.engineGroup = engineGroup;
    this.isExploded = false;
    this.isTransitioning = false;
    this.progress = 0.0;
    this.duration = 0.8; // seconds

    this.initialPositions = new Map();
    this.activeNodes = [];

    this.saveInitialPositions();
  }

  /**
   * Identifies major existing mechanical assemblies and assigns clean,
   * realistic outward explosion offsets while keeping the engine core anchored.
   */
  saveInitialPositions() {
    this.initialPositions.clear();
    this.activeNodes = [];

    // 1. Semantic named assemblies (Procedural Engine Model)
    const semanticAssemblies = [
      { name: 'Gearbox',                        offset: new THREE.Vector3( 0.0, -0.15, -1.5) },
      { name: 'OutputShaft',                    offset: new THREE.Vector3( 0.0, -0.15, -2.4) },
      { name: 'TurbochargerSystem',             offset: new THREE.Vector3(-1.3,  0.90,  0.4) },
      { name: 'IntakeSystem',                   offset: new THREE.Vector3(-0.3,  1.40,  0.5) },
      { name: 'CommonRailValve',                offset: new THREE.Vector3(-0.9,  1.30,  0.3) },
      { name: 'WastegateController',            offset: new THREE.Vector3(-1.1,  1.10,  0.5) },
      { name: 'HighPressurePump',               offset: new THREE.Vector3(-1.4, -0.50,  0.3) },
      { name: 'FuelMeteringUnit',               offset: new THREE.Vector3(-1.3, -0.20,  0.5) },
      { name: 'OilSystem',                      offset: new THREE.Vector3( 0.0, -1.50, -0.2) },
      { name: 'Alternator',                     offset: new THREE.Vector3( 1.5, -0.10,  0.2) },
      { name: 'VRibbedBelt',                    offset: new THREE.Vector3( 1.4,  0.40,  0.2) },
      { name: 'EngineOilFilterHousing',         offset: new THREE.Vector3( 1.1,  1.20,  0.4) },
      { name: 'GearboxOverpressureReliefValve', offset: new THREE.Vector3( 1.2,  0.50, -0.2) },
      { name: 'PipingHoses',                    offset: new THREE.Vector3( 0.0,  0.90,  0.6) }
    ];

    let foundSemantic = 0;
    semanticAssemblies.forEach(({ name, offset }) => {
      const obj = this.engineGroup.getObjectByName(name);
      if (obj && obj !== this.engineGroup) {
        foundSemantic++;
        this.initialPositions.set(obj.uuid, obj.position.clone());
        this.activeNodes.push({
          object: obj,
          offset: offset.clone(),
          initialPos: obj.position.clone()
        });
      }
    });

    if (foundSemantic >= 3) {
      console.info(`[ExplodedView] Initialized with ${foundSemantic} semantic major assemblies.`);
      return;
    }

    // 2. GLB Model Multi-Mesh Hierarchy Disassembly:
    // Gather all distinct meshes belonging to the engine
    const allMeshes = [];
    this.engineGroup.traverse((child) => {
      if (child.isMesh && child.parent && child !== this.engineGroup) {
        allMeshes.push(child);
      }
    });

    if (allMeshes.length === 0) return;

    // Calculate total engine bounding box to locate global center
    const engineBox = new THREE.Box3().setFromObject(this.engineGroup);
    const engineCenter = new THREE.Vector3();
    const engineSize = new THREE.Vector3();
    engineBox.getCenter(engineCenter);
    engineBox.getSize(engineSize);

    // Group meshes into 6 cohesive major assembly sectors (Front, Top, Bottom, Left, Right, Core)
    allMeshes.forEach((mesh) => {
      const meshBox = new THREE.Box3().setFromObject(mesh);
      const meshCenter = new THREE.Vector3();
      meshBox.getCenter(meshCenter);

      const rel = new THREE.Vector3().subVectors(meshCenter, engineCenter);
      let offset = new THREE.Vector3(0, 0, 0);

      // Determine major assembly cluster:
      if (rel.x < -0.35 * engineSize.x) {
        // Front Gearbox / Output Shaft assembly (moves forward along -X)
        offset.set(-1.5, -0.1, 0);
      } else if (rel.y > 0.25 * engineSize.y) {
        // Top Intake / Turbocharger assembly (moves upward along +Y)
        offset.set(rel.x < 0 ? -0.4 : 0.4, 1.4, rel.z < 0 ? -0.3 : 0.3);
      } else if (rel.y < -0.25 * engineSize.y) {
        // Bottom Oil Sump / Pan assembly (moves downward along -Y)
        offset.set(0, -1.5, 0);
      } else if (rel.z > 0.25 * engineSize.z) {
        // Left Accessories / Exhaust assembly (moves outward to left along +Z)
        offset.set(0, 0.2, 1.4);
      } else if (rel.z < -0.25 * engineSize.z) {
        // Right Alternator / Filter assembly (moves outward to right along -Z)
        offset.set(0, 0.2, -1.4);
      } else {
        // Central Engine Core / Crankcase — stays anchored at origin (offset = 0, 0, 0)
        offset.set(0, 0, 0);
      }

      this.initialPositions.set(mesh.uuid, mesh.position.clone());
      this.activeNodes.push({
        object: mesh,
        offset: offset,
        initialPos: mesh.position.clone()
      });
    });

    console.info(`[ExplodedView] Initialized with ${this.activeNodes.length} component meshes across 6 major assembly sectors.`);
  }

  toggleExplodedView() {
    if (this.isExploded) {
      this.collapse();
    } else {
      this.explode();
    }
  }

  explode() {
    if (this.isExploded) return;
    if (this.activeNodes.length === 0) this.saveInitialPositions();
    this.isExploded = true;
    this.isTransitioning = true;
    this.progress = 0.0;
  }

  collapse() {
    if (!this.isExploded && !this.isTransitioning) return;
    this.isExploded = false;
    this.isTransitioning = true;
    this.progress = 0.0;
  }

  resetExplodedImmediately() {
    this.isExploded = false;
    this.isTransitioning = false;
    this.progress = 0.0;
    this.activeNodes.forEach(({ object, initialPos }) => {
      if (object && initialPos) {
        object.position.copy(initialPos);
      }
    });
  }

  /**
   * Render loop frame update with smooth cubic easing.
   * @param {number} deltaTime 
   */
  update(deltaTime) {
    if (!this.isTransitioning) return;

    this.progress += deltaTime / this.duration;
    if (this.progress >= 1.0) {
      this.progress = 1.0;
      this.isTransitioning = false;
    }

    // Smooth cubic ease-out
    const t = 1 - Math.pow(1 - this.progress, 3);
    const factor = this.isExploded ? t : (1 - t);

    this.activeNodes.forEach(({ object, offset, initialPos }) => {
      if (object && initialPos) {
        const targetPos = initialPos.clone().addScaledVector(offset, factor);
        object.position.copy(targetPos);
      }
    });
  }
}
