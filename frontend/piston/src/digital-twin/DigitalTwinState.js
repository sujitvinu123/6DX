/**
 * Digital Twin State Schema for SIH 26054 Aero-Piston Engine Digital Twin.
 * 
 * Serves as the SINGLE SOURCE OF TRUTH for all visual rendering, telemetry overlays,
 * physics computations, and diagnostic monitoring.
 * 
 * Rules:
 * - Only fields populated from the simulator or verified models contain numeric/boolean values.
 * - Unavailable simulator fields are explicitly set to null (not fake physics/random values).
 */

export function createInitialDigitalTwinState() {
  return {
    timestamp: Date.now(),
    source: 'SIMULATOR',

    // 1. UAV State (Flight dynamics & attitude)
    uav: {
      roll: null,      // deg / rad (Unavailable in raw simulator)
      pitch: null,     // deg / rad (Unavailable in raw simulator)
      yaw: null,       // deg / rad (Unavailable in raw simulator)
      altitude: null,  // m (Unavailable in raw simulator)
      velocity: null,  // m/s (Unavailable in raw simulator)
      throttle: null   // % or 0..1 (Unavailable in raw simulator)
    },

    // 2. Engine State (Core rotational drivetrain)
    engine: {
      rpm: null,               // RPM (Available in simulator)
      torque: null,            // N·m (Unavailable in raw simulator)
      load: null,              // % (Unavailable in raw simulator)
      manifoldPressure: null,  // kPa / bar (Unavailable in raw simulator)
      operatingState: null     // 'HEALTHY' / 'STOPPED' / 'RUNNING' (Available)
    },

    // 3. Cylinder & Combustion State (Per-cylinder bank breakdown)
    cylinders: {
      cylinder1: {
        id: 'Piston_Left_1',
        cht: null,             // °C (Populated from baseline or per-cylinder sensor)
        egt: null,             // °C (Populated from baseline or per-cylinder sensor)
        pistonPhase: 0,        // radians offset (Kinematic Boxer firing phase = 0)
        position: 0,           // normalized stroke displacement (-1..1)
        combustionState: null, // 'INTAKE'|'COMPRESSION'|'POWER'|'EXHAUST' (Unavailable)
        misfireState: false    // boolean (Unavailable in raw simulator)
      },
      cylinder2: {
        id: 'Piston_Left_2',
        cht: null,
        egt: null,
        pistonPhase: Math.PI,  // radians offset (Kinematic Boxer firing phase = PI)
        position: 0,
        combustionState: null,
        misfireState: false
      },
      cylinder3: {
        id: 'Piston_Right_1',
        cht: null,
        egt: null,
        pistonPhase: Math.PI,  // radians offset (Kinematic Boxer firing phase = PI)
        position: 0,
        combustionState: null,
        misfireState: false
      },
      cylinder4: {
        id: 'Piston_Right_2',
        cht: null,
        egt: null,
        pistonPhase: 0,        // radians offset (Kinematic Boxer firing phase = 0)
        position: 0,
        combustionState: null,
        misfireState: false
      }
    },

    // 4. Oil System (Lubrication gallery & sump)
    oil: {
      level: null,       // L or % (Unavailable in raw simulator)
      pressure: null,    // bar (Available in simulator)
      temperature: null, // °C (Available in simulator)
      flow: null,        // L/min (Unavailable in raw simulator)
      health: null       // % (Unavailable in raw simulator)
    },

    // 5. Fuel System (Rails & Injectors)
    fuel: {
      flow: null,            // L/h (Available in simulator)
      pressure: null,        // bar (Unavailable in raw simulator)
      injectorHealth: null,  // % or map (Unavailable in raw simulator)
      injectionTiming: null  // °BTDC (Unavailable in raw simulator)
    },

    // 6. Cooling System (Cylinder head fins & heat transfer)
    cooling: {
      cht: null,        // °C global (Available in simulator)
      egt: null,        // °C global (Available in simulator)
      efficiency: null, // % (Unavailable in raw simulator)
      health: null      // % (Unavailable in raw simulator)
    },

    // 7. Turbo System (For supercharged/turbocharged variants)
    turbo: {
      rpm: null,           // RPM (Unavailable - naturally aspirated boxer)
      boostPressure: null, // kPa (Unavailable)
      efficiency: null     // % (Unavailable)
    },

    // 8. Propulsion System (Output shaft & propeller)
    propulsion: {
      propellerRpm: null, // RPM (Derived from engine RPM direct drive)
      torque: null,       // N·m (Unavailable in raw simulator)
      efficiency: null    // % (Unavailable in raw simulator)
    },

    // 9. Vibration System (Structural acceleration & harmonics)
    vibration: {
      value: null,    // g (Available in simulator)
      residual: null, // g variance from model (Unavailable in raw simulator)
      health: null,   // % (Unavailable in raw simulator)
      spectrum: null  // FFT order array (Unavailable in raw simulator)
    },

    // 10. Environment Context (Atmospheric parameters)
    environment: {
      altitude: null,    // m (Unavailable in raw simulator)
      temperature: null, // °C OAT (Unavailable in raw simulator)
      humidity: null,    // % (Unavailable in raw simulator)
      wind: null,        // m/s (Unavailable in raw simulator)
      maritime: null     // salt/corrosion factor (Unavailable in raw simulator)
    },

    // 11. Digital Twin Diagnostics & EKF State
    diagnostics: {
      predicted: null,     // Map of physics model predictions
      residuals: null,     // Model vs measured differences
      ekf: null,           // Extended Kalman Filter state vector
      healthIndices: {
        overall: null      // % (Available in simulator as healthIndex)
      },
      anomalyScore: null,  // 0..1 score (Unavailable in raw simulator)
      faultPrediction: null, // Fault label string (Unavailable)
      predictedRUL: null,  // Hours remaining (Unavailable in raw simulator)
      explanation: null    // Textual reasoning (Unavailable)
    },

    // 12. Sensor Registry Snapshots
    sensors: []
  };
}
