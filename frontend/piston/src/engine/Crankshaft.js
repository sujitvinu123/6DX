import * as THREE from 'three';

/**
 * Creates the Central Crankcase Housing, Reduction Gearbox Casing, and Fasteners
 * matching the reference aero-piston engine.
 * 
 * @param {Object} materials - PBR engine materials map
 * @return {THREE.Group} Crankcase Group
 */
export function createCrankcase(materials) {
  const crankcaseGroup = new THREE.Group();
  crankcaseGroup.name = 'Crankcase';

  // 1. MAIN CRANKCASE CENTER BLOCK (Horizontally-Split Magnesium/Aluminum Casting)
  const mainBodyGeo = new THREE.CylinderGeometry(0.88, 0.88, 2.7, 36);
  mainBodyGeo.rotateX(Math.PI / 2); // Longitudinal along Z-axis
  const mainBody = new THREE.Mesh(mainBodyGeo, materials.crankcase);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  crankcaseGroup.add(mainBody);

  // Structural Stiffening Ribs along Crankcase Barrel
  for (let r = -1.1; r <= 1.1; r += 0.44) {
    const ribGeo = new THREE.TorusGeometry(0.89, 0.045, 16, 36);
    const ribMesh = new THREE.Mesh(ribGeo, materials.crankcaseCover);
    ribMesh.position.z = r;
    crankcaseGroup.add(ribMesh);
  }

  // Horizontal Split-Line Flange (Left & Right crankcase joining rails)
  [-0.88, 0.88].forEach((x) => {
    const flangeGeo = new THREE.BoxGeometry(0.14, 0.16, 2.7);
    const flangeMesh = new THREE.Mesh(flangeGeo, materials.crankcaseCover);
    flangeMesh.position.set(x, 0, 0);
    crankcaseGroup.add(flangeMesh);

    // Flange Joint Through-Bolts
    for (let z = -1.1; z <= 1.1; z += 0.35) {
      const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10);
      boltGeo.rotateZ(Math.PI / 2);
      const boltMesh = new THREE.Mesh(boltGeo, materials.steelBolts);
      boltMesh.position.set(x, 0, z);
      crankcaseGroup.add(boltMesh);
    }
  });

  // Top Crankcase Inspection Cover & Access Plate
  const topCoverGeo = new THREE.BoxGeometry(0.92, 0.14, 2.3);
  const topCover = new THREE.Mesh(topCoverGeo, materials.crankcaseCover);
  topCover.position.y = 0.84;
  topCover.castShadow = true;
  crankcaseGroup.add(topCover);

  // Top Cover Mounting Bolts
  for (let z = -0.95; z <= 0.95; z += 0.28) {
    [-0.40, 0.40].forEach((x) => {
      const boltGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.07, 10);
      const boltMesh = new THREE.Mesh(boltGeo, materials.steelBolts);
      boltMesh.position.set(x, 0.91, z);
      crankcaseGroup.add(boltMesh);
    });
  }

  // 2. FRONT REDUCTION GEARBOX HOUSING (Stepped Dark Gunmetal Casing matching Reference)
  // Step 1: Base conical transition bellhousing
  const frontHousingGeo = new THREE.CylinderGeometry(0.60, 0.86, 0.75, 36);
  frontHousingGeo.rotateX(Math.PI / 2);
  const frontHousing = new THREE.Mesh(frontHousingGeo, materials.crankcase);
  frontHousing.position.z = 1.60;
  frontHousing.castShadow = true;
  frontHousing.receiveShadow = true;
  crankcaseGroup.add(frontHousing);

  // Step 2: Main cylindrical reduction gearcase collar
  const gearcaseGeo = new THREE.CylinderGeometry(0.50, 0.58, 0.70, 36);
  gearcaseGeo.rotateX(Math.PI / 2);
  const gearcase = new THREE.Mesh(gearcaseGeo, materials.crankcaseCover);
  gearcase.position.z = 2.15;
  gearcase.castShadow = true;
  crankcaseGroup.add(gearcase);

  // Intermediate Flange Ring with Perimeter Fasteners
  const midFlangeGeo = new THREE.TorusGeometry(0.80, 0.055, 16, 36);
  const midFlange = new THREE.Mesh(midFlangeGeo, materials.crankcaseCover);
  midFlange.position.z = 1.30;
  crankcaseGroup.add(midFlange);

  // Primary Housing Perimeter Bolts (14 bolts around main housing flange)
  const numHousingBolts = 14;
  for (let b = 0; b < numHousingBolts; b++) {
    const angle = (b / numHousingBolts) * Math.PI * 2;
    const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.09, 12);
    boltGeo.rotateX(Math.PI / 2);
    const boltMesh = new THREE.Mesh(boltGeo, materials.steelBolts);
    boltMesh.position.set(Math.cos(angle) * 0.74, Math.sin(angle) * 0.74, 1.30);
    crankcaseGroup.add(boltMesh);
  }

  // Nose Reduction Gearbox Perimeter Studs (12 perimeter studs on front face)
  const numNoseStuds = 12;
  for (let s = 0; s < numNoseStuds; s++) {
    const angle = (s / numNoseStuds) * Math.PI * 2;
    const studGeo = new THREE.CylinderGeometry(0.030, 0.030, 0.10, 10);
    studGeo.rotateX(Math.PI / 2);
    const studMesh = new THREE.Mesh(studGeo, materials.steelBolts);
    studMesh.position.set(Math.cos(angle) * 0.46, Math.sin(angle) * 0.46, 2.50);
    crankcaseGroup.add(studMesh);
  }

  // 3. REAR ACCESSORY COVER & STARTER PAD
  const rearCoverGeo = new THREE.CylinderGeometry(0.84, 0.84, 0.18, 36);
  rearCoverGeo.rotateX(Math.PI / 2);
  const rearCover = new THREE.Mesh(rearCoverGeo, materials.crankcaseCover);
  rearCover.position.z = -1.40;
  rearCover.castShadow = true;
  crankcaseGroup.add(rearCover);

  return crankcaseGroup;
}

/**
 * Creates the Internal Rotating Crankshaft, Output Shaft, and Prop Flange.
 * 
 * @param {Object} materials - PBR engine materials map
 * @return {Object} Object containing Crankshaft group and OutputShaft group references.
 */
export function createCrankshaftAssembly(materials) {
  const crankshaftGroup = new THREE.Group();
  crankshaftGroup.name = 'Crankshaft';

  // Central Journal Shaft
  const journalGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.9, 24);
  journalGeo.rotateX(Math.PI / 2);
  const journalMesh = new THREE.Mesh(journalGeo, materials.outputShaft);
  crankshaftGroup.add(journalMesh);

  // Crank Counterweights & Crankpins (4 offset throws for Boxer cylinders)
  const pinOffsets = [
    { z: 0.75, angle: 0 },
    { z: -0.75, angle: Math.PI },
    { z: 0.55, angle: Math.PI },
    { z: -0.95, angle: 0 }
  ];

  pinOffsets.forEach(({ z, angle }) => {
    // Crank Web Counterweight
    const webGeo = new THREE.BoxGeometry(0.42, 0.72, 0.14);
    const webMesh = new THREE.Mesh(webGeo, materials.crankcaseCover);
    webMesh.position.set(0, 0, z);
    webMesh.rotation.z = angle;
    crankshaftGroup.add(webMesh);

    // Crankpin Journal
    const pinGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.20, 16);
    pinGeo.rotateX(Math.PI / 2);
    const pinMesh = new THREE.Mesh(pinGeo, materials.outputShaft);
    const pinRadius = 0.35;
    pinMesh.position.set(Math.cos(angle) * pinRadius, Math.sin(angle) * pinRadius, z);
    crankshaftGroup.add(pinMesh);
  });

  // FRONT OUTPUT SHAFT & PROP FLANGE
  const outputShaftGroup = new THREE.Group();
  outputShaftGroup.name = 'OutputShaft';

  // Front Output Shaft Barrel
  const propShaftGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.85, 32);
  propShaftGeo.rotateX(Math.PI / 2);
  const propShaftMesh = new THREE.Mesh(propShaftGeo, materials.outputShaft);
  propShaftMesh.position.z = 2.40;
  propShaftMesh.castShadow = true;
  outputShaftGroup.add(propShaftMesh);

  // Output Flange (Concentric Metallic Propeller Mounting Plate)
  const outputFlangeMesh = new THREE.Group();
  outputFlangeMesh.name = 'OutputFlange';

  // Main Outer Flange Ring
  const flangeDiskGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.14, 36);
  flangeDiskGeo.rotateX(Math.PI / 2);
  const flangeDisk = new THREE.Mesh(flangeDiskGeo, materials.outputShaft);
  flangeDisk.position.z = 2.70;
  flangeDisk.castShadow = true;
  outputFlangeMesh.add(flangeDisk);

  // Concentric Inner Pilot Ring
  const pilotRingGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.18, 36);
  pilotRingGeo.rotateX(Math.PI / 2);
  const pilotRing = new THREE.Mesh(pilotRingGeo, materials.steelBolts);
  pilotRing.position.z = 2.78;
  pilotRing.castShadow = true;
  outputFlangeMesh.add(pilotRing);

  // 8 Perimeter Drive Bolts around Prop Flange
  const numPropBolts = 8;
  const boltRadius = 0.52;
  for (let b = 0; b < numPropBolts; b++) {
    const angle = (b / numPropBolts) * Math.PI * 2;
    const propBoltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12);
    propBoltGeo.rotateX(Math.PI / 2);
    const propBoltMesh = new THREE.Mesh(propBoltGeo, materials.steelBolts);
    propBoltMesh.name = `PropBolt_${b + 1}`;
    propBoltMesh.position.set(Math.cos(angle) * boltRadius, Math.sin(angle) * boltRadius, 2.76);
    propBoltMesh.castShadow = true;
    outputFlangeMesh.add(propBoltMesh);
  }

  outputShaftGroup.add(outputFlangeMesh);
  crankshaftGroup.add(outputShaftGroup);

  return { crankshaftGroup, outputShaftGroup, outputFlangeMesh };
}
