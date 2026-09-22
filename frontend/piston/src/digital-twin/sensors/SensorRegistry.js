/**
 * Sensor Registry for SIH 26054 Aero-Piston Engine Digital Twin.
 * 
 * Defines physical engine sensor instrumentation nodes mapped to Three.js 3D component anchors.
 */

export const INITIAL_SENSOR_REGISTRY = [
  {
    id: 'SENS_RPM_01',
    parameter: 'Engine Speed',
    unit: 'RPM',
    component: 'OutputShaft',
    position: { x: 0, y: 0.4, z: 2.2 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_CHT_CYL1',
    parameter: 'Cylinder Head Temp Cyl 1 (Left)',
    unit: '°C',
    component: 'LeftHead_1',
    position: { x: -2.2, y: 0.5, z: 0.75 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_CHT_CYL2',
    parameter: 'Cylinder Head Temp Cyl 2 (Left)',
    unit: '°C',
    component: 'LeftHead_2',
    position: { x: -2.2, y: 0.5, z: -0.75 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_CHT_CYL3',
    parameter: 'Cylinder Head Temp Cyl 3 (Right)',
    unit: '°C',
    component: 'RightHead_1',
    position: { x: 2.2, y: 0.5, z: 0.55 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_CHT_CYL4',
    parameter: 'Cylinder Head Temp Cyl 4 (Right)',
    unit: '°C',
    component: 'RightHead_2',
    position: { x: 2.2, y: 0.5, z: -0.95 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_EGT_RUN1',
    parameter: 'Exhaust Gas Temp Runner 1',
    unit: '°C',
    component: 'ExhaustPipe_Left_1',
    position: { x: -1.4, y: -0.85, z: 0.65 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_EGT_RUN2',
    parameter: 'Exhaust Gas Temp Runner 2',
    unit: '°C',
    component: 'ExhaustPipe_Left_2',
    position: { x: -1.4, y: -0.85, z: -0.85 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_EGT_RUN3',
    parameter: 'Exhaust Gas Temp Runner 3',
    unit: '°C',
    component: 'ExhaustPipe_Right_1',
    position: { x: 1.4, y: -0.85, z: 0.45 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_EGT_RUN4',
    parameter: 'Exhaust Gas Temp Runner 4',
    unit: '°C',
    component: 'ExhaustPipe_Right_2',
    position: { x: 1.4, y: -0.85, z: -1.05 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_EGT_COLL_L',
    parameter: 'Left Exhaust Collector Temp',
    unit: '°C',
    component: 'ExhaustSystem',
    position: { x: -0.6, y: -1.4, z: -1.2 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_EGT_COLL_R',
    parameter: 'Right Exhaust Collector Temp',
    unit: '°C',
    component: 'ExhaustSystem',
    position: { x: 0.6, y: -1.4, z: -1.2 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_OIL_PRESS',
    parameter: 'Oil Gallery Pressure',
    unit: 'bar',
    component: 'Crankcase',
    position: { x: 0, y: 0.9, z: 0.2 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_OIL_TEMP',
    parameter: 'Oil Sump Temperature',
    unit: '°C',
    component: 'Crankcase',
    position: { x: 0, y: -0.6, z: -1.3 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_OIL_FLOW',
    parameter: 'Oil Circulation Rate [Placeholder]',
    unit: 'L/min',
    component: 'Crankcase',
    position: { x: 0, y: -0.4, z: 0.8 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_FUEL_PRESS',
    parameter: 'Fuel Rail Pressure [Placeholder]',
    unit: 'bar',
    component: 'FuelRail_Left',
    position: { x: -1.1, y: 0.85, z: -0.1 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_FUEL_FLOW',
    parameter: 'Mass Fuel Flow',
    unit: 'L/h',
    component: 'IntakeSystem',
    position: { x: -1.1, y: 0.9, z: 0 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_INJ_L1',
    parameter: 'Injector 1 Pulse Width [Placeholder]',
    unit: 'ms',
    component: 'Injector_Left_1',
    position: { x: -1.8, y: 0.45, z: 0.75 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_INJ_L2',
    parameter: 'Injector 2 Pulse Width [Placeholder]',
    unit: 'ms',
    component: 'Injector_Left_2',
    position: { x: -1.8, y: 0.45, z: -0.75 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_INJ_R1',
    parameter: 'Injector 3 Pulse Width [Placeholder]',
    unit: 'ms',
    component: 'Injector_Right_1',
    position: { x: 1.8, y: 0.45, z: 0.55 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_INJ_R2',
    parameter: 'Injector 4 Pulse Width [Placeholder]',
    unit: 'ms',
    component: 'Injector_Right_2',
    position: { x: 1.8, y: 0.45, z: -0.95 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_VIB_CRANK',
    parameter: 'Crankcase Vibration',
    unit: 'g',
    component: 'Crankcase',
    position: { x: 0.85, y: 0.2, z: 0 },
    value: null,
    status: 'NORMAL'
  },
  {
    id: 'SENS_VIB_MOUNT',
    parameter: 'Engine Mount Vibration [Placeholder]',
    unit: 'g',
    component: 'MountingSystem',
    position: { x: -1.2, y: -1.36, z: -1.2 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_MAP_PRESS',
    parameter: 'Manifold Air Pressure [Placeholder]',
    unit: 'kPa',
    component: 'IntakeSystem',
    position: { x: 0, y: 1.15, z: 0 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_ALT_VOLT',
    parameter: 'Alternator Output Voltage [Placeholder]',
    unit: 'V',
    component: 'Alternator',
    position: { x: 0, y: 0.65, z: -1.75 },
    value: null,
    status: 'OFFLINE'
  },
  {
    id: 'SENS_START_CURR',
    parameter: 'Starter Motor Current [Placeholder]',
    unit: 'A',
    component: 'StarterMotor',
    position: { x: 0, y: -0.65, z: -1.8 },
    value: null,
    status: 'OFFLINE'
  }
];
