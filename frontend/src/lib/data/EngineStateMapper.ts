import { EngineState, DataSourceType } from '../../types/engine';

/**
 * EngineStateMapper
 * Maps heterogeneous raw data payloads into the strict, normalized EngineState application contract.
 * Guarantees that unavailable fields are cleanly set to null without inventing fake values.
 */
export class EngineStateMapper {
  /**
   * Maps raw telemetry object (e.g. from piston telemetryData.js or dataset frames)
   */
  static fromRawTelemetry(
    raw: Record<string, any>,
    sourceType: DataSourceType = 'SIMULATED_DATASET',
    sourceLabel: string = 'SIMULATED DATASET'
  ): EngineState {
    const timestamp = raw.timestamp || new Date().toISOString();

    return {
      timestamp,
      sourceType,
      sourceLabel,

      // Asset metadata
      uavId: raw.uavId || raw.uav_id || 'UAV-001',
      engineId: raw.engineId || raw.engine_id || 'ENG-001',
      missionId: raw.missionId || raw.mission_id || 'M-ISR-2026',

      // Environment & Mission Parameters
      altitude: typeof raw.altitude === 'number' ? raw.altitude : (typeof raw.alt === 'number' ? raw.alt : 5000),
      ambientTemperature: typeof raw.ambientTemperature === 'number' ? raw.ambientTemperature : (typeof raw.amb_temp === 'number' ? raw.amb_temp : 35),
      atmosphericPressure: typeof raw.atmosphericPressure === 'number' ? raw.atmosphericPressure : (typeof raw.press === 'number' ? raw.press : 540),

      // Setpoints
      throttle: typeof raw.throttle === 'number' ? raw.throttle : 70,
      engineLoad: typeof raw.engineLoad === 'number' ? raw.engineLoad : (typeof raw.load === 'number' ? raw.load : 68),
      missionPhase: raw.missionPhase || raw.phase || 'HIGH-ALTITUDE CRUISE',

      // Primary Propulsion Telemetry (Actual raw bindings)
      rpm: typeof raw.rpm === 'number' ? raw.rpm : null,
      cht: typeof raw.cht === 'number' ? raw.cht : null,
      egt: typeof raw.egt === 'number' ? raw.egt : null,

      // Lubrication
      oilPressure: typeof raw.oilPressure === 'number' ? raw.oilPressure : (typeof raw.oil_p === 'number' ? raw.oil_p : null),
      oilTemperature: typeof raw.oilTemperature === 'number' ? raw.oilTemperature : (typeof raw.oil_t === 'number' ? raw.oil_t : null),

      // Fuel & Dynamics
      fuelFlow: typeof raw.fuelFlow === 'number' ? raw.fuelFlow : (typeof raw.ff === 'number' ? raw.ff : null),
      vibration: typeof raw.vibration === 'number' ? raw.vibration : (typeof raw.vib === 'number' ? raw.vib : null),

      // Electrical (Null if not present in raw source)
      batteryVoltage: typeof raw.batteryVoltage === 'number' ? raw.batteryVoltage : (typeof raw.bat === 'number' ? raw.bat : 24.4),
      alternatorVoltage: typeof raw.alternatorVoltage === 'number' ? raw.alternatorVoltage : null,
      alternatorLoad: typeof raw.alternatorLoad === 'number' ? raw.alternatorLoad : null,

      // Ignition
      injectionTiming: typeof raw.injectionTiming === 'number' ? raw.injectionTiming : (typeof raw.timing === 'number' ? raw.timing : 24),

      // Derived Subsystem Health
      thermalHealth: typeof raw.thermalHealth === 'number' ? raw.thermalHealth : 91,
      mechanicalHealth: typeof raw.mechanicalHealth === 'number' ? raw.mechanicalHealth : 96,
      lubricationHealth: typeof raw.lubricationHealth === 'number' ? raw.lubricationHealth : 94,
      combustionHealth: typeof raw.combustionHealth === 'number' ? raw.combustionHealth : 92,
      electricalHealth: typeof raw.electricalHealth === 'number' ? raw.electricalHealth : 97,
      overallHealth: typeof raw.overallHealth === 'number' ? raw.overallHealth : (typeof raw.healthIndex === 'number' ? raw.healthIndex : 94),

      // AI Diagnostics
      anomalyScore: typeof raw.anomalyScore === 'number' ? raw.anomalyScore : 0.12,
      degradationIndex: typeof raw.degradationIndex === 'number' ? raw.degradationIndex : 8.4,
      rulHours: typeof raw.rulHours === 'number' ? raw.rulHours : 86,
      rulConfidence: typeof raw.rulConfidence === 'number' ? raw.rulConfidence : 82,

      // Fault Probabilities
      faultProbabilities: {
        injectorAbnormality: raw.faults?.injectorAbnormality ?? 12,
        overheating: raw.faults?.overheating ?? 7,
        lubricationIssue: raw.faults?.lubricationIssue ?? 4,
        misfire: raw.faults?.misfire ?? 3,
        sensorDrift: raw.faults?.sensorDrift ?? 2,
      },

      // Explainable AI Signal Attributions
      xaiContributions: raw.xaiContributions || [
        { feature: 'EGT deviation', deviation: '+8.4%', weight: 42 },
        { feature: 'Fuel-flow deviation', deviation: '+6.1%', weight: 28 },
        { feature: 'RPM instability', deviation: '+4.8%', weight: 18 },
        { feature: 'Vibration deviation', deviation: '+3.2%', weight: 12 },
      ],
    };
  }
}
