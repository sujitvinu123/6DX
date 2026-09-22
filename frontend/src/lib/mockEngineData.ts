import { EngineState, TelemetryDataPoint, ActiveAlert } from '../types/engine';

export const initialEngineState: EngineState = {
  timestamp: new Date().toISOString(),
  uavId: 'UAV-001',
  engineId: 'ENG-001',
  missionId: 'M-ISR-2026',

  // Flight Envelope
  altitude: 5000,
  ambientTemperature: 35,
  atmosphericPressure: 540,

  // Setpoints
  throttle: 70,
  engineLoad: 68,

  // Primary Telemetry
  rpm: 4820,
  cht: 158,
  egt: 704,

  // Lubrication
  oilPressure: 4.2,
  oilTemperature: 96,

  // Fuel & Dynamics
  fuelFlow: 18.4,
  vibration: 0.13,

  // Electrical
  batteryVoltage: 24.4,
  alternatorVoltage: 28.2,
  alternatorLoad: 42,

  // Ignition
  injectionTiming: 24,

  // Subsystem Health
  thermalHealth: 91,
  mechanicalHealth: 96,
  lubricationHealth: 94,
  combustionHealth: 92,
  electricalHealth: 97,

  // Overall Health
  overallHealth: 94,

  // AI Analytics
  anomalyScore: 0.12,
  degradationIndex: 8.4,
  rulHours: 86,
  rulConfidence: 82,

  // Fault Predictions
  faultProbabilities: {
    injectorAbnormality: 12,
    overheating: 7,
    lubricationIssue: 4,
    misfire: 3,
    sensorDrift: 2,
  },

  // Explainable AI (XAI)
  xaiSignalContributions: [
    { feature: 'EGT deviation', deviation: '+8.4%', impactPercentage: 42 },
    { feature: 'Fuel-flow deviation', deviation: '+6.1%', impactPercentage: 28 },
    { feature: 'RPM instability', deviation: '+4.8%', impactPercentage: 18 },
    { feature: 'Vibration deviation', deviation: '+3.2%', impactPercentage: 12 },
  ],
};

// 20-Point Historical Telemetry for Engineering Time-Series Charts
export const generateHistoricalTelemetry = (): TelemetryDataPoint[] => {
  const data: TelemetryDataPoint[] = [];
  const now = new Date();

  for (let i = 20; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 5000);
    const timeStr = t.toTimeString().split(' ')[0];
    
    // Controlled engineering variations
    const noise = Math.sin(i * 0.4);
    data.push({
      time: timeStr,
      rpm: Math.round(4820 + noise * 18 + (Math.random() - 0.5) * 6),
      cht: Number((158 + noise * 1.5 + (Math.random() - 0.5) * 0.4).toFixed(1)),
      egt: Number((704 + noise * 3.8 + (Math.random() - 0.5) * 1.2).toFixed(1)),
      oilPressure: Number((4.2 + (Math.random() - 0.5) * 0.04).toFixed(2)),
      oilTemperature: Number((96 + (Math.random() - 0.5) * 0.3).toFixed(1)),
      vibration: Number((0.13 + (Math.random() - 0.5) * 0.008).toFixed(3)),
      fuelFlow: Number((18.4 + noise * 0.2 + (Math.random() - 0.5) * 0.1).toFixed(1)),
    });
  }
  return data;
};

// Health History (0 to 100 Flight Hours)
export const healthHistoryData = [
  { hours: 0, health: 100 },
  { hours: 15, health: 99 },
  { hours: 30, health: 98 },
  { hours: 45, health: 97 },
  { hours: 60, health: 96 },
  { hours: 75, health: 95 },
  { hours: 86, health: 94 }, // Current
  { hours: 100, health: 91 }, // Projected
  { hours: 120, health: 87 },
  { hours: 140, health: 81 },
];

export const mockAlerts: ActiveAlert[] = [
  {
    id: 'ALT-01',
    timestamp: '10:42:18',
    severity: 'system',
    title: 'TELEMETRY SYNCHRONIZED',
    description: 'Digital Twin virtual state aligned with 50Hz simulated CAN stream.',
  },
  {
    id: 'ALT-02',
    timestamp: '10:40:02',
    severity: 'info',
    title: 'OPERATING NORMALLY',
    description: 'All propulsion parameters within baseline thermodynamic margins.',
  },
  {
    id: 'ALT-03',
    timestamp: '10:35:14',
    severity: 'notice',
    title: 'NO CRITICAL FAULTS',
    description: 'AI residual models confirm nominal component degradation trajectory.',
  },
];
