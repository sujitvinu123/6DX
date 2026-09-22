import * as THREE from 'three';
import { createCylinderAssembly } from './Cylinder.js';

/**
 * Creates a Cylinder Bank group (Left or Right) containing 2 horizontally-opposed cylinders.
 * 
 * @param {string} side - 'Left' or 'Right'
 * @param {Object} materials - PBR engine materials map
 * @return {Object} Object containing bankGroup and references to cylinder assemblies.
 */
export function createCylinderBank(side, materials) {
  const isLeft = side === 'Left';
  const bankGroup = new THREE.Group();
  bankGroup.name = `${side}CylinderBank`;

  // Realistic Boxer engine offset along Z-axis (longitudinal axis)
  const zOffsets = isLeft ? [0.75, -0.75] : [0.55, -0.95];

  const cylinders = [];

  for (let i = 1; i <= 2; i++) {
    const cylAssembly = createCylinderAssembly(side, i, materials);
    cylAssembly.cylinderGroup.position.z = zOffsets[i - 1];
    bankGroup.add(cylAssembly.cylinderGroup);
    cylinders.push(cylAssembly);
  }

  return {
    bankGroup,
    cylinders,
    cyl_1: cylinders[0],
    cyl_2: cylinders[1]
  };
}
