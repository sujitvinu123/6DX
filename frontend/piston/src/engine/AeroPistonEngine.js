import * as THREE from 'three';
import { createEngineMaterials } from './EngineMaterials.js';
import { createCylinderBank } from './CylinderBank.js';
import { createCrankcase, createCrankshaftAssembly } from './Crankshaft.js';
import { createPropellerAssembly } from './PropellerAssembly.js';
import { createExhaustSystem } from './ExhaustSystem.js';
import { createIntakeSystem } from './IntakeSystem.js';
import { createTurbochargerSystem } from './TurbochargerSystem.js';
import { createOilSystem } from './OilSystem.js';
import { createAccessoriesAndMounting } from './EngineAccessories.js';
import { EngineAnimation } from './EngineAnimation.js';

/**
 * Creates the complete CANONICAL 3D Horizontally-Opposed Aero-Piston Engine Model
 * for BOTH the Simulator and the Digital Twin visualization.
 * 
 * Single Canonical Visual Asset:
 * - 4-cylinder Boxer architecture (horizontally opposed)
 * - Front variable-pitch 3-blade propeller with aerodynamic metallic spinner
 * - Dual-scroll turbocharger & charge boost plumbing
 * - High-pressure lubrication system, oil filter canister, oil cooler radiator & braided AN-8 lines
 * - Intake air plenum & anodized fuel rails
 * - Tuned stainless/bronze exhaust headers and collectors
 * - Rear starter motor, alternator, ignition ECUs, and vibration-damped mounting bed
 * 
 * @return {Object} An engine instance object containing:
 *  - engineGroup: The root THREE.Group ("AeroPistonEngine")
 *  - animator: EngineAnimation instance controlling RPM & kinematics
 *  - componentsMap: Fast lookup dictionary of all addressable engine parts
 *  - API methods: setRPM, startEngine, stopEngine, updateEngine, getCylinderByName, getComponentByName
 */
export function createAeroPistonEngine() {
  // 1. Root AeroPistonEngine Group
  const engineGroup = new THREE.Group();
  engineGroup.name = 'AeroPistonEngine';

  // 2. Initialize PBR Engine Materials
  const materials = createEngineMaterials();

  // 3. Central Crankcase
  const crankcaseGroup = createCrankcase(materials);
  engineGroup.add(crankcaseGroup);

  // 4. Rotating Crankshaft, Front Output Shaft & Propeller Assembly
  const { crankshaftGroup, outputShaftGroup, outputFlangeMesh } = createCrankshaftAssembly(materials);
  
  // 4b. Mount the Canonical 3-Blade Propeller & Metallic Spinner to the rotating OutputShaft
  const propellerAssembly = createPropellerAssembly(materials);
  outputShaftGroup.add(propellerAssembly);
  
  engineGroup.add(crankshaftGroup);

  // 5. Left and Right Cylinder Banks (Boxer 4-cylinder architecture)
  const leftBank = createCylinderBank('Left', materials);
  const rightBank = createCylinderBank('Right', materials);

  engineGroup.add(leftBank.bankGroup);
  engineGroup.add(rightBank.bankGroup);

  // 6. Exhaust System (Tuned headers and collectors)
  const exhaustGroup = createExhaustSystem(materials);
  engineGroup.add(exhaustGroup);

  // 7. Intake System (Plenum, runners, fuel rails)
  const intakeGroup = createIntakeSystem(materials);
  engineGroup.add(intakeGroup);

  // 8. Turbocharger System (Compressor volute, turbine scroll, boost pipe)
  const turboGroup = createTurbochargerSystem(materials);
  engineGroup.add(turboGroup);

  // 9. Lubrication & Oil System (Filter canister, radiator cooler, braided AN lines)
  const oilGroup = createOilSystem(materials);
  engineGroup.add(oilGroup);

  // 10. Rear Accessories & Engine Mounting System
  const { StarterMotor, Alternator, ElectricalBoxes, MountingSystem, WiresGroup } = createAccessoriesAndMounting(materials);
  engineGroup.add(StarterMotor);
  engineGroup.add(Alternator);
  engineGroup.add(ElectricalBoxes);
  engineGroup.add(MountingSystem);
  engineGroup.add(WiresGroup);

  // Map of all pistons for kinematic animation
  const pistonsMap = {
    Piston_Left_1: leftBank.cyl_1,
    Piston_Left_2: leftBank.cyl_2,
    Piston_Right_1: rightBank.cyl_1,
    Piston_Right_2: rightBank.cyl_2
  };

  // 11. Instantiate Engine Mechanical Animation Controller
  const animator = new EngineAnimation({
    Crankshaft: crankshaftGroup,
    OutputShaft: outputShaftGroup,
    pistons: pistonsMap
  });

  // Default initial RPM = 1200
  animator.setRPM(1200);

  // 12. Direct Component Addressability Lookup Map for Digital Twin telemetry
  const componentsMap = new Map();

  // Register all named subcomponents recursively
  engineGroup.traverse((child) => {
    if (child.name && !componentsMap.has(child.name)) {
      componentsMap.set(child.name, child);
    }
  });

  /**
   * Helper to retrieve any cylinder group or sub-part by name.
   */
  const getCylinderByName = (name) => {
    return componentsMap.get(name) || engineGroup.getObjectByName(name) || null;
  };

  /**
   * Helper to retrieve any named component on the engine hierarchy.
   */
  const getComponentByName = (name) => {
    return componentsMap.get(name) || engineGroup.getObjectByName(name) || null;
  };

  return {
    engineGroup,
    animator,
    materials,
    componentsMap,
    setRPM: (rpm) => animator.setRPM(rpm),
    startEngine: () => animator.startEngine(),
    stopEngine: () => animator.stopEngine(),
    updateEngine: (deltaTime) => animator.updateEngine(deltaTime),
    getCylinderByName,
    getComponentByName
  };
}
