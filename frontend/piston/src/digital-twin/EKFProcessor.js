/**
 * EKFProcessor — Extended Kalman Filter for SIH 26054 Aero-Piston Engine Digital Twin.
 *
 * Implements a scalar linearised EKF over 6 engine state channels.
 * Computes:
 *   - predicted state  (from nominal physics model)
 *   - innovation/residuals  (measured − predicted)
 *   - Kalman-corrected estimated state
 *   - per-subsystem health indices
 *   - overall weighted health index
 *
 * Rules:
 *   - No random or fake values — all outputs are deterministic functions of measured telemetry.
 *   - When a measured channel is null, its residual is null and health contribution is skipped.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Nominal (healthy) cruise operating point used as prediction baseline
// ──────────────────────────────────────────────────────────────────────────────
const NOMINAL = {
  rpm:         4800,
  cht:         155,     // °C
  egt:         695,     // °C
  oilPressure: 4.5,     // bar
  fuelFlow:    18.0,    // L/h
  vibration:   0.10,    // g
};

// Allowable deviation before health degrades to 0 (full-scale range for each channel)
const FULL_SCALE = {
  rpm:         3000,   // RPM deviation that maps to 100% degradation contribution
  cht:         100,    // °C
  egt:         300,    // °C
  oilPressure: 2.5,    // bar
  fuelFlow:    10,     // L/h
  vibration:   1.0,    // g
};

// Per-channel weight for overall health index (must sum to 1.0)
const WEIGHTS = {
  rpm:         0.20,
  cht:         0.20,
  egt:         0.20,
  oilPressure: 0.15,
  fuelFlow:    0.10,
  vibration:   0.15,
};

// Kalman filter process noise (Q) and measurement noise (R) per channel
// Higher R → less trust in measurement, slower response.
const KF_Q = { rpm: 100, cht: 2, egt: 5, oilPressure: 0.02, fuelFlow: 0.1, vibration: 0.001 };
const KF_R = { rpm: 400, cht: 8, egt: 20, oilPressure: 0.08, fuelFlow: 0.4, vibration: 0.004 };

export class EKFProcessor {
  constructor() {
    // EKF estimated state — initialised from nominal
    this.ekfState = { ...NOMINAL };

    // EKF error covariance P (scalar per channel)
    this._P = {
      rpm: 1000, cht: 10, egt: 40, oilPressure: 0.1, fuelFlow: 0.5, vibration: 0.01
    };
  }

  /**
   * Physics prediction model — linearised aero-piston cruise model.
   * All predictions are deterministic functions of measured RPM.
   * Returns a predicted state object.
   *
   * @param {Object} measured — measured telemetry values
   * @returns {Object} predicted state
   */
  _predict(measured) {
    const rpm = measured.rpm ?? NOMINAL.rpm;

    return {
      rpm:         rpm,                                           // RPM: no drift model (RPM IS the input)
      cht:         150 + rpm * 0.00350,                          // thermal load model
      egt:         640 + rpm * 0.01050,                          // exhaust model
      oilPressure: 4.8  - (rpm / 6000) * 0.7,                   // oil gallery pressure model
      fuelFlow:    rpm  * 0.00385,                               // stoichiometric mixture model
      vibration:   0.07 + rpm * 0.000018,                        // structural vibration model
    };
  }

  /**
   * Runs one EKF update step.
   * @param {Object} measured — raw measured channel values (nulls allowed for missing)
   * @returns {Object} { predicted, residuals, ekfState, healthIndices, overallHealth }
   */
  update(measured) {
    const channels = Object.keys(NOMINAL);
    const predicted = this._predict(measured);
    const residuals  = {};
    const healthIndices = {};
    let weightedDegradation = 0;
    let activeWeight = 0;

    channels.forEach(ch => {
      const meas = measured[ch];
      const pred = predicted[ch];

      if (meas === null || meas === undefined) {
        residuals[ch] = null;
        // Channel unavailable — skip from health computation
        return;
      }

      // Innovation (residual): measured − predicted
      const innov = meas - pred;
      residuals[ch] = innov;

      // ── Kalman update ──────────────────────────────────────────────────────
      const Q = KF_Q[ch];
      const R = KF_R[ch];
      let P = this._P[ch];

      // Predict step: P_k|k-1 = P_k-1 + Q
      P = P + Q;

      // Kalman gain: K = P / (P + R)
      const K = P / (P + R);

      // State update: x_k = x_pred + K * innov
      this.ekfState[ch] = pred + K * innov;

      // Covariance update: P_k = (1 - K) * P
      this._P[ch] = (1 - K) * P;

      // ── Health index per channel ───────────────────────────────────────────
      // Degradation = |residual| / fullScaleRange, clamped to [0,1]
      const normDeviation = Math.min(1.0, Math.abs(innov) / FULL_SCALE[ch]);
      const channelHealth = Math.round((1 - normDeviation) * 100);
      healthIndices[ch] = channelHealth;

      weightedDegradation += normDeviation * WEIGHTS[ch];
      activeWeight += WEIGHTS[ch];
    });

    // Overall health index — weighted across active channels
    const normWeight = activeWeight > 0 ? activeWeight : 1;
    const overallHealth = Math.max(0, Math.min(100,
      Math.round((1 - weightedDegradation / normWeight) * 100)
    ));

    return {
      predicted,
      residuals,
      ekfState: { ...this.ekfState },
      healthIndices: {
        ...healthIndices,
        overall: overallHealth,
        engine:  healthIndices.rpm  ?? null,
        thermal: healthIndices.cht  ?? null,
        oil:     healthIndices.oilPressure ?? null,
        fuel:    healthIndices.fuelFlow ?? null,
      },
      overallHealth,
    };
  }
}
