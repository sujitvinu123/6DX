/**
 * AERO-TWIN — Central Normalized Engine State & Data Architecture Contract
 * All visualizations (3D engine, telemetry gauges, AI models, charts) consume this contract.
 */

export type DataSourceType = 'SIMULATED_DATASET' | 'MISSION_REPLAY' | 'LIVE_TELEMETRY' | 'CAN_ECU';

export interface EngineState {
  timestamp: string;
  sourceType: DataSourceType;
  sourceLabel: string;

  // Asset Identification
  uavId: string;
  engineId: string;
  missionId: string | null;

  // Environment & Mission Parameters (Null if unavailable in data source)
  altitude: number | null; // meters
  ambientTemperature: number | null; // °C
  atmosphericPressure: number | null; // hPa / bar

  // Operating Setpoints
  throttle: number | null; // %
  engineLoad: number | null; // %
  missionPhase: string | null;

  // Primary Propulsion Telemetry
  rpm: number | null; // RPM
  cht: number | null; // Cylinder Head Temp (°C)
  egt: number | null; // Exhaust Gas Temp (°C)

  // Lubrication Subsystem
  oilPressure: number | null; // bar
  oilTemperature: number | null; // °C

  // Fuel & Dynamics Subsystem
  fuelFlow: number | null; // L/h
  vibration: number | null; // g (RMS)

  // Electrical Subsystem
  batteryVoltage: number | null; // V
  alternatorVoltage: number | null; // V
  alternatorLoad: number | null; // %

  // Ignition & Timing
  injectionTiming: number | null; // ° BTDC

  // Derived / Calculated Health Indicators (0 - 100)
  thermalHealth: number | null;
  mechanicalHealth: number | null;
  lubricationHealth: number | null;
  combustionHealth: number | null;
  electricalHealth: number | null;
  overallHealth: number | null;

  // AI Diagnostic Metrics
  anomalyScore: number | null;
  degradationIndex: number | null;
  rulHours: number | null;
  rulConfidence: number | null;

  // Subsystem Fault Probabilities
  faultProbabilities: {
    injectorAbnormality: number | null;
    overheating: number | null;
    lubricationIssue: number | null;
    misfire: number | null;
    sensorDrift: number | null;
  };

  // Explainable AI (XAI) Feature Attributions
  xaiContributions: Array<{
    feature: string;
    deviation: string;
    weight: number;
  }>;
}

export interface IDataSource {
  readonly type: DataSourceType;
  readonly label: string;
  readonly isLive: boolean;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(callback: (state: EngineState) => void): () => void;
  getCurrentState(): EngineState;
}

/**
 * Utility helper to format values or return 'N/A' if null/undefined
 */
export function formatTelemetry(val: number | null | undefined, unit: string = '', decimals: number = 1): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'N/A';
  }
  return `${val.toFixed(decimals)}${unit ? ' ' + unit : ''}`;
}
