/**
 * Engine Mechanical Animation Controller for AERO-TWIN.
 * Simulates real-time 4-cylinder Horizontally-Opposed Boxer engine kinematics
 * using a slider-crank mathematical model driven by engine RPM.
 */
export class EngineAnimation {
  /**
   * @param {Object} engineComponents - References to animated engine groups and piston assemblies.
   */
  constructor(engineComponents) {
    this.crankshaft = engineComponents.Crankshaft;
    this.outputShaft = engineComponents.OutputShaft;
    this.pistons = engineComponents.pistons; // Map of named piston assemblies

    this.engineRPM = 1200;
    this.isRunning = true;
    this.crankAngle = 0;

    // Kinematic parameters
    this.crankRadius = 0.35; // Crankshaft throw radius
    this.conRodLength = 0.90; // Connecting rod length
  }

  /**
   * Sets the engine rotational speed in Revolutions Per Minute (RPM).
   * @param {number} rpm - Target RPM (e.g. 0 to 6000)
   */
  setRPM(rpm) {
    this.engineRPM = Math.max(0, rpm);
  }

  /**
   * Starts mechanical rotation animation.
   */
  startEngine() {
    this.isRunning = true;
  }

  /**
   * Stops mechanical rotation animation.
   */
  stopEngine() {
    this.isRunning = false;
  }

  /**
   * Updates the mechanical animation state for the current frame.
   * Calculates precise crankshaft rotation and horizontal slider-crank piston stroke.
   * 
   * @param {number} deltaTime - Time elapsed since last frame in seconds.
   */
  updateEngine(deltaTime) {
    if (!this.isRunning || this.engineRPM === 0) return;

    // Convert RPM to radians per second: (RPM * 2 * PI) / 60
    const angularVelocity = (this.engineRPM * 2 * Math.PI) / 60;
    this.crankAngle += angularVelocity * deltaTime;

    // Keep crank angle within 0 to 2*PI range
    this.crankAngle %= (Math.PI * 2);

    // 1. Rotate Crankshaft & OutputShaft along Z-axis
    if (this.crankshaft) {
      this.crankshaft.rotation.z = this.crankAngle;
    }

    // 2. Animate Piston Strokes (Horizontally along X-axis)
    // Kinematic equation for slider-crank displacement:
    // x(theta) = r * cos(theta) + sqrt(L^2 - r^2 * sin^2(theta))
    const r = this.crankRadius;
    const L = this.conRodLength;

    const calcDisplacement = (theta) => {
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      return r * cosT + Math.sqrt(Math.max(0, L * L - r * r * sinT * sinT)) - L;
    };

    // Phase offsets for Boxer 4-cylinder firing order
    const phases = {
      Piston_Left_1: 0,
      Piston_Left_2: Math.PI,
      Piston_Right_1: Math.PI,
      Piston_Right_2: 0
    };

    // Update each piston's X-axis displacement inside its cylinder barrel
    Object.keys(phases).forEach((pistonName) => {
      const pistonObj = this.pistons[pistonName];
      if (pistonObj && pistonObj.pistonGroup) {
        const phase = phases[pistonName];
        const theta = this.crankAngle + phase;
        const strokeDisplacement = calcDisplacement(theta);

        // Apply displacement relative to cylinder rest position
        const dirSign = pistonObj.dirSign;
        pistonObj.pistonGroup.position.x = pistonObj.defaultPistonX + dirSign * strokeDisplacement * 0.8;
      }
    });
  }
}
