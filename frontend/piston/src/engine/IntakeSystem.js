import * as THREE from 'three';

/**
 * Creates the Upper Intake System, Longitudinal Manifold Rails, Red Ignition Leads,
 * and Green Sensor Collars matching the reference engine.
 * 
 * @param {Object} materials - PBR engine materials map
 * @return {THREE.Group} IntakeSystem Group
 */
export function createIntakeSystem(materials) {
  const intakeGroup = new THREE.Group();
  intakeGroup.name = 'IntakeSystem';

  // 1. TOP AIR INTAKE PLENUM / ECU BOX (Polished Cast Aluminum with Lid Bolts)
  const plenumGeo = new THREE.BoxGeometry(0.95, 0.42, 1.4);
  const plenumMesh = new THREE.Mesh(plenumGeo, materials.crankcaseCover);
  plenumMesh.position.set(0, 1.12, -0.1);
  plenumMesh.castShadow = true;
  plenumMesh.receiveShadow = true;
  intakeGroup.add(plenumMesh);

  // Perimeter fasteners around top cover plate
  for (let z = -0.7; z <= 0.5; z += 0.3) {
    [-0.42, 0.42].forEach((x) => {
      const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10);
      const boltMesh = new THREE.Mesh(boltGeo, materials.steelBolts);
      boltMesh.position.set(x, 1.34, z);
      intakeGroup.add(boltMesh);
    });
  }

  // Front Air Intake Throat / Filter Flange
  const throatGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.35, 24);
  throatGeo.rotateX(Math.PI / 2);
  const throatMesh = new THREE.Mesh(throatGeo, materials.intake);
  throatMesh.position.set(0, 1.12, 0.75);
  throatMesh.castShadow = true;
  intakeGroup.add(throatMesh);

  // 2. LONGITUDINAL MANIFOLD RAILS (Left & Right top distribution tubes matching reference)
  [-1.05, 1.05].forEach((x, idx) => {
    const side = idx === 0 ? 'Left' : 'Right';

    // Main longitudinal polished manifold tube
    const railGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.6, 24);
    railGeo.rotateX(Math.PI / 2);
    const railMesh = new THREE.Mesh(railGeo, materials.outputShaft);
    railMesh.name = `ManifoldRail_${side}`;
    railMesh.position.set(x, 1.05, -0.1);
    railMesh.castShadow = true;
    intakeGroup.add(railMesh);

    // Aluminum mounting clamp collars around the rail
    for (let z = -1.0; z <= 0.8; z += 0.6) {
      const clampGeo = new THREE.TorusGeometry(0.13, 0.025, 8, 20);
      const clampMesh = new THREE.Mesh(clampGeo, materials.steelBolts);
      clampMesh.position.set(x, 1.05, z);
      intakeGroup.add(clampMesh);
    }

    // Green Anodized Sensor Collars on the upper rail (matching the reference photo)
    [-0.5, 0.4].forEach((z) => {
      const greenSensorMat = new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        roughness: 0.25,
        metalness: 0.85
      });
      const sensorCollarGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 16);
      sensorCollarGeo.rotateX(Math.PI / 2);
      const sensorCollar = new THREE.Mesh(sensorCollarGeo, greenSensorMat);
      sensorCollar.position.set(x, 1.05, z);
      sensorCollar.castShadow = true;
      intakeGroup.add(sensorCollar);
    });
  });

  // 3. CURVED INTAKE RUNNERS (Connecting longitudinal rails down into cylinder intake ports)
  const runnerConfigs = [
    {
      name: 'IntakeRunner_Left_1',
      points: [
        new THREE.Vector3(-1.05, 1.05, 0.75),
        new THREE.Vector3(-1.45, 0.85, 0.75),
        new THREE.Vector3(-1.95, 0.45, 0.75)
      ]
    },
    {
      name: 'IntakeRunner_Left_2',
      points: [
        new THREE.Vector3(-1.05, 1.05, -0.75),
        new THREE.Vector3(-1.45, 0.85, -0.75),
        new THREE.Vector3(-1.95, 0.45, -0.75)
      ]
    },
    {
      name: 'IntakeRunner_Right_1',
      points: [
        new THREE.Vector3(1.05, 1.05, 0.55),
        new THREE.Vector3(1.45, 0.85, 0.55),
        new THREE.Vector3(1.95, 0.45, 0.55)
      ]
    },
    {
      name: 'IntakeRunner_Right_2',
      points: [
        new THREE.Vector3(1.05, 1.05, -0.95),
        new THREE.Vector3(1.45, 0.85, -0.95),
        new THREE.Vector3(1.95, 0.45, -0.95)
      ]
    }
  ];

  runnerConfigs.forEach((config) => {
    const curve = new THREE.CatmullRomCurve3(config.points);
    const runnerGeo = new THREE.TubeGeometry(curve, 20, 0.08, 16, false);
    const runnerMesh = new THREE.Mesh(runnerGeo, materials.outputShaft);
    runnerMesh.name = config.name;
    runnerMesh.castShadow = true;
    intakeGroup.add(runnerMesh);
  });

  // 4. HIGH-VOLTAGE RED SILICONE IGNITION WIRES (Routing from top ECU to spark plugs)
  const redWireMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.4,
    metalness: 0.15
  });

  const ignitionPaths = [
    // Left Cyl 1
    [new THREE.Vector3(-0.35, 1.25, 0.3), new THREE.Vector3(-0.85, 1.35, 0.5), new THREE.Vector3(-1.75, 0.8, 0.75)],
    // Left Cyl 2
    [new THREE.Vector3(-0.35, 1.25, -0.3), new THREE.Vector3(-0.85, 1.35, -0.5), new THREE.Vector3(-1.75, 0.8, -0.75)],
    // Right Cyl 1
    [new THREE.Vector3(0.35, 1.25, 0.3), new THREE.Vector3(0.85, 1.35, 0.4), new THREE.Vector3(1.75, 0.8, 0.55)],
    // Right Cyl 2
    [new THREE.Vector3(0.35, 1.25, -0.3), new THREE.Vector3(0.85, 1.35, -0.6), new THREE.Vector3(1.75, 0.8, -0.95)]
  ];

  ignitionPaths.forEach((pts, i) => {
    const wireCurve = new THREE.CatmullRomCurve3(pts);
    const wireGeo = new THREE.TubeGeometry(wireCurve, 16, 0.024, 8, false);
    const wireMesh = new THREE.Mesh(wireGeo, redWireMat);
    wireMesh.name = `IgnitionWire_${i + 1}`;
    intakeGroup.add(wireMesh);
  });

  return intakeGroup;
}
