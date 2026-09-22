/**
 * AERO-TWIN — 3D Engine Component Hierarchy & Telemetry Mapping Registry
 * Directly maps the real Horizontally-Opposed Aero-Piston Engine nodes from /piston
 * to Digital Twin telemetry channels, subsystems, and diagnostics.
 */

export interface EnginePartMapping {
  id: string;
  name: string;
  subsystem: 'ENGINE' | 'CYLINDERS' | 'FUEL' | 'OIL' | 'EXHAUST' | 'ELECTRICAL' | 'MECHANICAL';
  meshNodeName: string;
  associatedTelemetry: string[];
  description: string;
}

export const ENGINE_PARTS: Record<string, EnginePartMapping> = {
  crankcase: {
    id: 'crankcase',
    name: 'Main Crankcase Housing',
    subsystem: 'ENGINE',
    meshNodeName: 'Crankcase',
    associatedTelemetry: ['oilPressure', 'oilTemperature', 'vibration'],
    description: 'Central horizontal structural housing accommodating journal bearings and internal oil galleries.',
  },
  crankshaft: {
    id: 'crankshaft',
    name: 'Rotating Crankshaft Assembly',
    subsystem: 'MECHANICAL',
    meshNodeName: 'Crankshaft',
    associatedTelemetry: ['rpm', 'vibration'],
    description: 'Forged steel crankshaft with counterweights and 4 boxer throw journals driven by slider-crank kinematics.',
  },
  outputFlange: {
    id: 'outputFlange',
    name: 'Propeller Output Flange',
    subsystem: 'MECHANICAL',
    meshNodeName: 'OutputFlange',
    associatedTelemetry: ['rpm'],
    description: 'Front drive boss with 8 perimeter high-tensile propeller mounting bolts.',
  },
  leftCylinderBank: {
    id: 'leftCylinderBank',
    name: 'Left Cylinder Bank (Cyl 1 & 2)',
    subsystem: 'CYLINDERS',
    meshNodeName: 'LeftCylinderBank',
    associatedTelemetry: ['cht', 'rpm'],
    description: 'Opposed left cylinder bank with 14 machined cooling fins per sleeve and high-temperature alloy heads.',
  },
  rightCylinderBank: {
    id: 'rightCylinderBank',
    name: 'Right Cylinder Bank (Cyl 1 & 2)',
    subsystem: 'CYLINDERS',
    meshNodeName: 'RightCylinderBank',
    associatedTelemetry: ['cht', 'rpm'],
    description: 'Opposed right cylinder bank with 14 machined cooling fins per sleeve and high-temperature alloy heads.',
  },
  leftCylinderHead1: {
    id: 'leftCylinderHead1',
    name: 'Cylinder Head Left 1',
    subsystem: 'CYLINDERS',
    meshNodeName: 'LeftHead_1',
    associatedTelemetry: ['cht'],
    description: 'Cylinder head 1 with cooling fin array, valve cover cap, and direct CHT thermocouple probe region.',
  },
  exhaustSystem: {
    id: 'exhaustSystem',
    name: 'Tuned Exhaust Manifold & Collectors',
    subsystem: 'EXHAUST',
    meshNodeName: 'ExhaustSystem',
    associatedTelemetry: ['egt'],
    description: '3D stainless-bronze curved exhaust runners from cylinder heads joining into dual collector canisters.',
  },
  intakePlenum: {
    id: 'intakePlenum',
    name: 'Air Intake Plenum & Runners',
    subsystem: 'FUEL',
    meshNodeName: 'IntakeSystem',
    associatedTelemetry: ['fuelFlow', 'throttle', 'engineLoad'],
    description: 'Top central air distribution plenum with tuned runners feeding combustion chambers.',
  },
  fuelRails: {
    id: 'fuelRails',
    name: 'Dual Anodized Fuel Rails',
    subsystem: 'FUEL',
    meshNodeName: 'FuelRail_Left',
    associatedTelemetry: ['fuelFlow', 'injectionTiming'],
    description: 'Left and right pressurized fuel delivery rails with electronic injector fittings.',
  },
  sparkPlugs: {
    id: 'sparkPlugs',
    name: 'Electronic Spark Plugs / Injectors',
    subsystem: 'ELECTRICAL',
    meshNodeName: 'Injector_Left_1',
    associatedTelemetry: ['injectionTiming', 'combustionHealth'],
    description: 'High-voltage ceramic spark plugs with ignition leads and electronic injection connectors.',
  },
  alternator: {
    id: 'alternator',
    name: 'Rear Belt Alternator / Generator',
    subsystem: 'ELECTRICAL',
    meshNodeName: 'Alternator',
    associatedTelemetry: ['batteryVoltage', 'alternatorVoltage', 'alternatorLoad'],
    description: 'Rear-mounted 28V auxiliary generator with slotted cooling vents and drive pulley.',
  },
  starterMotor: {
    id: 'starterMotor',
    name: 'Electric Starter Motor',
    subsystem: 'ELECTRICAL',
    meshNodeName: 'StarterMotor',
    associatedTelemetry: ['batteryVoltage'],
    description: 'Heavy-duty 24V starter motor and solenoid mounted at the lower rear crankcase.',
  },
  mountingSystem: {
    id: 'mountingSystem',
    name: 'Structural Bed Plate & Vibration Mounts',
    subsystem: 'MECHANICAL',
    meshNodeName: 'MountingSystem',
    associatedTelemetry: ['vibration'],
    description: 'Engine bed plate with 4 corner structural brackets and rubber vibration isolation bushings.',
  },
};

/**
 * Subsystem Category Definitions
 */
export const SUBSYSTEM_DEFINITIONS = [
  { id: 'ENGINE', label: 'ENGINE (ALL)', partsCount: 13 },
  { id: 'CYLINDERS', label: 'CYLINDERS', partsCount: 4 },
  { id: 'FUEL', label: 'FUEL SYSTEM', partsCount: 2 },
  { id: 'OIL', label: 'OIL & CRANKCASE', partsCount: 1 },
  { id: 'EXHAUST', label: 'EXHAUST SYSTEM', partsCount: 1 },
  { id: 'ELECTRICAL', label: 'ELECTRICAL & IGNITION', partsCount: 3 },
  { id: 'MECHANICAL', label: 'MECHANICAL & MOUNT', partsCount: 2 },
];
