import * as THREE from 'three';

/**
 * Photorealistic PBR Engine Materials for the AERO-TWIN 3D Engine.
 * Formulated to precisely match the metallic cast-aluminum, machined steel,
 * gunmetal reduction casing, and chrome highlights of the reference aero-engine.
 */
export function createEngineMaterials() {
  return {
    // Central Crankcase - Cast Aluminum / Magnesium Alloy (Heavy metallic sheen)
    crankcase: new THREE.MeshStandardMaterial({
      color: 0x7c8594,
      roughness: 0.36,
      metalness: 0.82,
      transparent: false,
      opacity: 1.0,
      name: 'mat_crankcase'
    }),

    // Crankcase Covers & Inspection Plates - Machined Billet Aluminum
    crankcaseCover: new THREE.MeshStandardMaterial({
      color: 0x8e98a6,
      roughness: 0.30,
      metalness: 0.88,
      transparent: false,
      opacity: 1.0,
      name: 'mat_crankcaseCover'
    }),

    // Cylinder Barrels - Cast Iron / Steel Sleeve
    cylinderBarrel: new THREE.MeshStandardMaterial({
      color: 0x474f5c,
      roughness: 0.34,
      metalness: 0.86,
      transparent: false,
      opacity: 1.0,
      name: 'mat_cylinderBarrel'
    }),

    // Cooling Fins - Machined Cooling Fin Pack with Crisp Specular Highlights
    coolingFin: new THREE.MeshStandardMaterial({
      color: 0x646f80,
      roughness: 0.26,
      metalness: 0.92,
      transparent: false,
      opacity: 1.0,
      name: 'mat_coolingFin'
    }),

    // Cylinder Heads - Cast High-Temp Aluminum
    cylinderHead: new THREE.MeshStandardMaterial({
      color: 0x727b8a,
      roughness: 0.35,
      metalness: 0.80,
      transparent: false,
      opacity: 1.0,
      name: 'mat_cylinderHead'
    }),

    // Head Valve Rocker Covers - Heavy Cast Alloy
    headCover: new THREE.MeshStandardMaterial({
      color: 0x5a6372,
      roughness: 0.40,
      metalness: 0.78,
      transparent: false,
      opacity: 1.0,
      name: 'mat_headCover'
    }),

    // Output Propeller Shaft - Ground High-Strength Steel
    outputShaft: new THREE.MeshStandardMaterial({
      color: 0xd8e0eb,
      roughness: 0.14,
      metalness: 0.96,
      transparent: false,
      opacity: 1.0,
      name: 'mat_outputShaft'
    }),

    // Front Output Flange Plate
    outputFlangeMat: new THREE.MeshStandardMaterial({
      color: 0xc2cbd6,
      roughness: 0.20,
      metalness: 0.92,
      transparent: false,
      opacity: 1.0,
      name: 'mat_outputFlange'
    }),

    // Hardware Bolts, Studs & Fasteners - Cadmium-Plated / Stainless Steel
    steelBolts: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.12,
      metalness: 0.96,
      transparent: false,
      opacity: 1.0,
      name: 'mat_steelBolts'
    }),

    // Exhaust Manifolds & Collectors - Heat-Treated High-Temp Steel / Bronze
    exhaust: new THREE.MeshStandardMaterial({
      color: 0x4a433d,
      roughness: 0.42,
      metalness: 0.85,
      transparent: false,
      opacity: 1.0,
      name: 'mat_exhaust'
    }),

    // Intake System & Distribution Rails - Polished Aluminum Alloy
    intake: new THREE.MeshStandardMaterial({
      color: 0x94a0b0,
      roughness: 0.22,
      metalness: 0.90,
      transparent: false,
      opacity: 1.0,
      name: 'mat_intake'
    }),

    // Fuel Rails - Anodized Dark Alloy
    fuelRail: new THREE.MeshStandardMaterial({
      color: 0x3b424d,
      roughness: 0.28,
      metalness: 0.85,
      transparent: false,
      opacity: 1.0,
      name: 'mat_fuelRail'
    }),

    // Spark Plug Ceramic Insulator - Gloss White Ceramic
    sparkPlugCeramic: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.10,
      metalness: 0.05,
      transparent: false,
      opacity: 1.0,
      name: 'mat_sparkPlugCeramic'
    }),

    // Spark Plug Terminal / Connector
    sparkPlugGlow: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.20,
      metalness: 0.90,
      transparent: false,
      opacity: 1.0,
      name: 'mat_sparkPlugGlow'
    }),

    // Electrical Wiring & Conduit Hoses - Matte Black Rubber
    wires: new THREE.MeshStandardMaterial({
      color: 0x11151c,
      roughness: 0.85,
      metalness: 0.08,
      transparent: false,
      opacity: 1.0,
      name: 'mat_wires'
    }),

    // Mounting System Bed Plate - Structural Steel
    mountPlate: new THREE.MeshStandardMaterial({
      color: 0x2d3440,
      roughness: 0.48,
      metalness: 0.72,
      transparent: false,
      opacity: 1.0,
      name: 'mat_mountPlate'
    }),

    // Vibration Isolator Bushings - High-Damping Nitrile Rubber
    rubberMount: new THREE.MeshStandardMaterial({
      color: 0x090c12,
      roughness: 0.92,
      metalness: 0.04,
      transparent: false,
      opacity: 1.0,
      name: 'mat_rubberMount'
    }),

    // Propeller Spinner - Mirror-Polished Aerospace Chrome / Aluminum
    spinner: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.06,
      metalness: 0.98,
      transparent: false,
      opacity: 1.0,
      name: 'mat_spinner'
    }),

    // Propeller Blades - Matte Dark Forged Titanium / Carbon Composite
    propellerBlade: new THREE.MeshStandardMaterial({
      color: 0x1c2128,
      roughness: 0.38,
      metalness: 0.65,
      transparent: false,
      opacity: 1.0,
      name: 'mat_propellerBlade'
    }),

    // Propeller Blade Warning Tips - Aviation Amber / Gold
    propellerTip: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.25,
      transparent: false,
      opacity: 1.0,
      name: 'mat_propellerTip'
    }),

    // Turbocharger Turbine Housing - Cast High-Temp Titanium
    turboTurbine: new THREE.MeshStandardMaterial({
      color: 0x484037,
      roughness: 0.45,
      metalness: 0.85,
      transparent: false,
      opacity: 1.0,
      name: 'mat_turboTurbine'
    }),

    // Turbocharger Compressor Housing - Machined Aluminum Volute
    turboCompressor: new THREE.MeshStandardMaterial({
      color: 0xa8b4c4,
      roughness: 0.20,
      metalness: 0.92,
      transparent: false,
      opacity: 1.0,
      name: 'mat_turboCompressor'
    }),

    // Oil Filter Canister - Gloss Deep Black
    oilFilter: new THREE.MeshStandardMaterial({
      color: 0x0f141d,
      roughness: 0.12,
      metalness: 0.80,
      transparent: false,
      opacity: 1.0,
      name: 'mat_oilFilter'
    }),

    // Oil Cooler Matrix Fins
    oilCooler: new THREE.MeshStandardMaterial({
      color: 0x3d4654,
      roughness: 0.30,
      metalness: 0.88,
      transparent: false,
      opacity: 1.0,
      name: 'mat_oilCooler'
    }),

    // Aviation AN-8 Hose Fittings - Anodized Blue
    anodizedBlue: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.20,
      metalness: 0.92,
      transparent: false,
      opacity: 1.0,
      name: 'mat_anodizedBlue'
    }),

    // Aviation AN-8 Hose Fittings - Anodized Red
    anodizedRed: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.20,
      metalness: 0.92,
      transparent: false,
      opacity: 1.0,
      name: 'mat_anodizedRed'
    }),

    // Aviation Sensor Rings - Anodized Green
    anodizedGreen: new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.24,
      metalness: 0.88,
      transparent: false,
      opacity: 1.0,
      name: 'mat_anodizedGreen'
    }),

    // Stainless Steel Braided Hoses
    braidedLine: new THREE.MeshStandardMaterial({
      color: 0xa4afbe,
      roughness: 0.28,
      metalness: 0.94,
      transparent: false,
      opacity: 1.0,
      name: 'mat_braidedLine'
    })
  };
}
