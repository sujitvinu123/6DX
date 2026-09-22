/**
 * VibrationAnimator — SIH 26054 Digital Twin.
 *
 * Subscribes to TwinStateManager vibration state and applies a sinusoidal
 * micro-shake offset to the engine group's position each animation frame.
 *
 * Amplitude is directly proportional to the measured vibration value (g).
 * Frequency is scaled by vibration × structural harmonic factor.
 *
 * Rules:
 *   - Base position of engineGroup is preserved and restored on each frame.
 *   - Does NOT permanently translate the engine group.
 *   - Amplitude 0.13 g → ±0.003 units (subtle, realistic)
 *   - Amplitude > 0.5 g → increasingly visible shake
 */
export class VibrationAnimator {
  /**
   * @param {THREE.Group} engineGroup   — root engine assembly group
   * @param {TwinStateManager} stateManager
   */
  constructor(engineGroup, stateManager) {
    this.engineGroup  = engineGroup;
    this.stateManager = stateManager;

    // Current vibration value (g) — updated from state
    this._vibrationG = 0;

    // Internal time accumulator for sinusoidal phase
    this._time = 0;

    // Base position is always (0, 0, 0) — engineGroup is not translated globally
    this._baseY = engineGroup.position.y;
    this._baseX = engineGroup.position.x;

    this.stateManager.subscribe((state) => {
      if (state?.vibration?.value !== null && state?.vibration?.value !== undefined) {
        this._vibrationG = state.vibration.value;
      }
    });
  }

  /**
   * Call this every animation frame AFTER controls.update() and BEFORE renderer.render().
   * @param {number} deltaTime - seconds since last frame
   */
  update(deltaTime) {
    if (!this.engineGroup) return;

    const vib = this._vibrationG;
    if (vib <= 0.01) {
      // Restore to base — no shake below 0.01 g
      this.engineGroup.position.x = this._baseX;
      this.engineGroup.position.y = this._baseY;
      return;
    }

    // Scale amplitude: 1 g → 0.022 scene units peak
    const amplitude = vib * 0.022;

    // Frequency: structural harmonic = 20 Hz base + 15 Hz per g
    const freq = 20 + vib * 15;

    this._time += deltaTime;

    // Two-axis shake (X + Y) with slightly different phases for realism
    const shakeX = amplitude * Math.sin(2 * Math.PI * freq * this._time);
    const shakeY = amplitude * 0.6 * Math.sin(2 * Math.PI * freq * this._time * 1.37 + 0.9);

    this.engineGroup.position.x = this._baseX + shakeX;
    this.engineGroup.position.y = this._baseY + shakeY;
  }
}
