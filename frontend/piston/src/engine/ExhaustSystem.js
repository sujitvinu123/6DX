import * as THREE from 'three';

/**
 * Creates the Exhaust System with curved headers and longitudinal collector tubes
 * matching the reference aero-engine.
 * 
 * @param {Object} materials - PBR engine materials map
 * @return {THREE.Group} ExhaustSystem Group
 */
export function createExhaustSystem(materials) {
  const exhaustGroup = new THREE.Group();
  exhaustGroup.name = 'ExhaustSystem';

  // Cylinder Head Exhaust Port Locations:
  // Left: X = -2.0, Z = [+0.75, -0.75], Y = -0.38
  // Right: X = +2.0, Z = [+0.55, -0.95], Y = -0.38

  const runnerConfigs = [
    // Left Cylinder 1 Header
    {
      name: 'ExhaustPipe_Left_1',
      points: [
        new THREE.Vector3(-2.00, -0.38, 0.75),
        new THREE.Vector3(-1.50, -0.88, 0.68),
        new THREE.Vector3(-0.90, -1.25, 0.40),
        new THREE.Vector3(-0.65, -1.35, -0.20)
      ]
    },
    // Left Cylinder 2 Header
    {
      name: 'ExhaustPipe_Left_2',
      points: [
        new THREE.Vector3(-2.00, -0.38, -0.75),
        new THREE.Vector3(-1.50, -0.88, -0.82),
        new THREE.Vector3(-0.90, -1.25, -0.60),
        new THREE.Vector3(-0.65, -1.35, -0.80)
      ]
    },
    // Right Cylinder 1 Header
    {
      name: 'ExhaustPipe_Right_1',
      points: [
        new THREE.Vector3(2.00, -0.38, 0.55),
        new THREE.Vector3(1.50, -0.88, 0.48),
        new THREE.Vector3(0.90, -1.25, 0.30),
        new THREE.Vector3(0.65, -1.35, -0.20)
      ]
    },
    // Right Cylinder 2 Header
    {
      name: 'ExhaustPipe_Right_2',
      points: [
        new THREE.Vector3(2.00, -0.38, -0.95),
        new THREE.Vector3(1.50, -0.88, -1.02),
        new THREE.Vector3(0.90, -1.25, -0.70),
        new THREE.Vector3(0.65, -1.35, -0.80)
      ]
    }
  ];

  runnerConfigs.forEach((config) => {
    const curve = new THREE.CatmullRomCurve3(config.points);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.115, 16, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, materials.exhaust);
    tubeMesh.name = config.name;
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    exhaustGroup.add(tubeMesh);

    // Header Port Mounting Flange at Cylinder Head
    const portFlangeGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16);
    portFlangeGeo.rotateZ(Math.PI / 2);
    const portFlange = new THREE.Mesh(portFlangeGeo, materials.steelBolts);
    portFlange.position.copy(config.points[0]);
    exhaustGroup.add(portFlange);
  });

  // Left & Right Exhaust Collector Canisters / Muffler Pipes
  [-0.65, 0.65].forEach((x, i) => {
    const sideName = i === 0 ? 'Left' : 'Right';
    
    // Collector Pipe
    const collectorCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, -1.35, 0.2),
      new THREE.Vector3(x, -1.38, -0.8),
      new THREE.Vector3(x * 0.9, -1.42, -1.8),
      new THREE.Vector3(x * 0.8, -1.45, -2.4)
    ]);
    const collectorGeo = new THREE.TubeGeometry(collectorCurve, 32, 0.165, 16, false);
    const collectorMesh = new THREE.Mesh(collectorGeo, materials.exhaust);
    collectorMesh.name = `ExhaustCollector_${sideName}`;
    collectorMesh.castShadow = true;
    exhaustGroup.add(collectorMesh);

    // Slip-Joint Clamps along Collector
    [-0.5, -1.4].forEach((z) => {
      const clampGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 20);
      const clampMesh = new THREE.Mesh(clampGeo, materials.steelBolts);
      clampMesh.position.set(x * 0.95, -1.40, z);
      exhaustGroup.add(clampMesh);
    });

    // Rear Tailpipe Outlet Flange
    const tipGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.12, 20);
    tipGeo.rotateX(Math.PI / 2);
    const tipMesh = new THREE.Mesh(tipGeo, materials.steelBolts);
    tipMesh.position.set(x * 0.8, -1.45, -2.45);
    exhaustGroup.add(tipMesh);
  });

  return exhaustGroup;
}
