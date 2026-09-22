import * as THREE from 'three';

/**
 * Creates Engine Rear Accessories (Starter Motor, Alternator, Electrical ECU Boxes, Wires)
 * and the Engine Structural Mounting System (Bed plate & Vibration brackets).
 * 
 * @param {Object} materials - PBR engine materials map
 * @return {Object} Named groups: { StarterMotor, Alternator, ElectricalBoxes, MountingSystem, WiresGroup }
 */
export function createAccessoriesAndMounting(materials) {
  // 1. STARTER MOTOR (Mounted at rear bottom of crankcase)
  const starterMotorGroup = new THREE.Group();
  starterMotorGroup.name = 'StarterMotor';

  const starterBodyGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.85, 24);
  starterBodyGeo.rotateX(Math.PI / 2);
  const starterBody = new THREE.Mesh(starterBodyGeo, materials.crankcaseCover);
  starterBody.castShadow = true;
  starterMotorGroup.add(starterBody);

  const starterSolenoidGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.55, 16);
  starterSolenoidGeo.rotateX(Math.PI / 2);
  const starterSolenoid = new THREE.Mesh(starterSolenoidGeo, materials.steelBolts);
  starterSolenoid.position.set(0, 0.32, 0.1);
  starterMotorGroup.add(starterSolenoid);

  starterMotorGroup.position.set(0, -0.65, -1.8);

  // 2. ALTERNATOR / GENERATOR (Mounted at rear upper crankcase)
  const alternatorGroup = new THREE.Group();
  alternatorGroup.name = 'Alternator';

  const altBodyGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.65, 24);
  altBodyGeo.rotateX(Math.PI / 2);
  const altBody = new THREE.Mesh(altBodyGeo, materials.cylinderBarrel);
  altBody.castShadow = true;
  alternatorGroup.add(altBody);

  // Cooling Vents on Alternator Housing
  for (let v = 0; v < 6; v++) {
    const ventGeo = new THREE.TorusGeometry(0.39, 0.015, 8, 24);
    const ventMesh = new THREE.Mesh(ventGeo, materials.coolingFin);
    ventMesh.position.z = -0.25 + v * 0.1;
    alternatorGroup.add(ventMesh);
  }

  const altPulleyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 20);
  altPulleyGeo.rotateX(Math.PI / 2);
  const altPulley = new THREE.Mesh(altPulleyGeo, materials.steelBolts);
  altPulley.position.z = 0.38;
  alternatorGroup.add(altPulley);

  alternatorGroup.position.set(0, 0.65, -1.75);

  // 3. ELECTRICAL ECU BOXES (Ignition control units)
  const electricalBoxesGroup = new THREE.Group();
  electricalBoxesGroup.name = 'ElectricalBoxes';

  const ecuGeo = new THREE.BoxGeometry(0.65, 0.4, 0.45);
  const ecuMesh = new THREE.Mesh(ecuGeo, materials.headCover);
  ecuMesh.position.set(0, 0.0, -1.9);
  ecuMesh.castShadow = true;
  electricalBoxesGroup.add(ecuMesh);

  // Wire Harness Plug Socket
  const socketGeo = new THREE.BoxGeometry(0.35, 0.15, 0.12);
  const socketMesh = new THREE.Mesh(socketGeo, materials.fuelRail);
  socketMesh.position.set(0, -0.15, -1.65);
  electricalBoxesGroup.add(socketMesh);

  // 4. MAIN WIRING HARNESS (Visible dark flexible electrical/fuel lines)
  const wiresGroup = new THREE.Group();
  wiresGroup.name = 'WiringHarness';

  const harnessPaths = [
    // ECU to Starter Motor
    [new THREE.Vector3(0, -0.15, -1.65), new THREE.Vector3(0, -0.35, -1.7), new THREE.Vector3(0, -0.45, -1.8)],
    // ECU to Alternator
    [new THREE.Vector3(0.1, 0.1, -1.75), new THREE.Vector3(0.2, 0.4, -1.75), new THREE.Vector3(0.1, 0.6, -1.75)],
    // Main Power Line along bottom crankcase
    [new THREE.Vector3(0, -0.7, -1.6), new THREE.Vector3(0, -0.85, 0), new THREE.Vector3(0, -0.8, 1.2)]
  ];

  harnessPaths.forEach((pathPoints) => {
    const curve = new THREE.CatmullRomCurve3(pathPoints);
    const wireGeo = new THREE.TubeGeometry(curve, 16, 0.025, 8, false);
    const wireMesh = new THREE.Mesh(wireGeo, materials.wires);
    wiresGroup.add(wireMesh);
  });

  // 5. ENGINE MOUNTING SYSTEM (Plate underneath & brackets)
  const mountingSystemGroup = new THREE.Group();
  mountingSystemGroup.name = 'MountingSystem';

  // Base Structural Bed Plate Underneath Engine
  const basePlateGeo = new THREE.BoxGeometry(2.8, 0.12, 3.4);
  const basePlate = new THREE.Mesh(basePlateGeo, materials.mountPlate);
  basePlate.position.set(0, -1.5, 0);
  basePlate.castShadow = true;
  basePlate.receiveShadow = true;
  mountingSystemGroup.add(basePlate);

  // 4 Corner Engine Mounting Brackets with Rubber Vibration Dampeners
  const mountCornerPositions = [
    [-1.2, -1.5, 1.2],
    [1.2, -1.5, 1.2],
    [-1.2, -1.5, -1.2],
    [1.2, -1.5, -1.2]
  ];

  mountCornerPositions.forEach(([mx, my, mz], i) => {
    // Structural Bracket Arm extending from crankcase to mount plate
    const bracketArmGeo = new THREE.BoxGeometry(0.3, 0.7, 0.3);
    const bracketArm = new THREE.Mesh(bracketArmGeo, materials.mountPlate);
    bracketArm.position.set(mx * 0.75, my + 0.35, mz * 0.75);
    bracketArm.rotation.z = Math.sign(mx) * (Math.PI / 12);
    bracketArm.castShadow = true;
    mountingSystemGroup.add(bracketArm);

    // Rubber Vibration Isolator Ring
    const rubberGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 20);
    const rubberMesh = new THREE.Mesh(rubberGeo, materials.rubberMount);
    rubberMesh.position.set(mx, my + 0.14, mz);
    mountingSystemGroup.add(rubberMesh);

    // Heavy Steel Mount Bolt
    const mountBoltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16);
    const mountBolt = new THREE.Mesh(mountBoltGeo, materials.steelBolts);
    mountBolt.position.set(mx, my + 0.22, mz);
    mountingSystemGroup.add(mountBolt);
  });

  return {
    StarterMotor: starterMotorGroup,
    Alternator: alternatorGroup,
    ElectricalBoxes: electricalBoxesGroup,
    MountingSystem: mountingSystemGroup,
    WiresGroup: wiresGroup
  };
}
