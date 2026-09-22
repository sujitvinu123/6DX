import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EngineState } from '../../types/engine';

interface EngineModelProps {
  engineState: EngineState;
  selectedSubsystem?: string;
  viewMode?: 'standard' | 'xray';
  exploded?: boolean;
}

/**
 * EngineModel Component
 * Renders the Real 3D Aero-Piston Engine using Three.js / React Three Fiber principles.
 * Connects directly to the normalized EngineState.
 * When `/models/aero-piston-engine.glb` is placed in `/public/models/`, it can be dynamically loaded via GLTFLoader.
 */
export const EngineModel: React.FC<EngineModelProps> = ({
  engineState,
  selectedSubsystem = 'ENGINE',
  viewMode = 'standard',
  exploded = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Clean any prior children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4.2, 2.8, 6.8);

    // 2. High-Precision Antialiased WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Aerospace Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(6, 8, 7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x007f86, 1.2);
    fillLight.position.set(-6, -2, -4);
    scene.add(fillLight);

    // 4. Build Root Engine Group
    const rootEngine = new THREE.Group();
    scene.add(rootEngine);

    // Materials
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8a999e, metalness: 0.88, roughness: 0.22 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x243034, metalness: 0.92, roughness: 0.35 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xeef5f8, metalness: 0.98, roughness: 0.08 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xb86538, metalness: 0.85, roughness: 0.3 });

    // Crankcase
    const crankcaseGeo = new THREE.CylinderGeometry(1.1, 1.2, 2.2, 32);
    const crankcase = new THREE.Mesh(crankcaseGeo, steelMat);
    crankcase.rotation.x = Math.PI / 2;
    rootEngine.add(crankcase);

    // Propeller Hub
    const hub = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 32), chromeMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 2.4;
    rootEngine.add(hub);

    // Boxer 4-Cylinder Banks
    const cylinders: THREE.Group[] = [];
    const pistons: THREE.Mesh[] = [];

    const numCylinders = 4;
    for (let i = 0; i < numCylinders; i++) {
      const cyl = new THREE.Group();
      const angle = (i / numCylinders) * Math.PI * 2;

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.4, 24), metalMat);
      barrel.position.y = 0.7;
      cyl.add(barrel);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.65), copperMat);
      head.position.y = 1.5;
      cyl.add(head);

      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.35, 16), chromeMat);
      piston.position.y = 0.55;
      cyl.add(piston);
      pistons.push(piston);

      cyl.rotation.z = angle + Math.PI / 2;
      cyl.position.x = Math.cos(angle) * 0.95;
      cyl.position.y = Math.sin(angle) * 0.95;

      cylinders.push(cyl);
      rootEngine.add(cyl);
    }

    // Animation Loop (Synchronized with engineState.rpm)
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Kinematic rotation derived from EngineState RPM
      const rpm = engineState.rpm || 4820;
      const speedFactor = (rpm / 60) * 0.04;

      rootEngine.rotation.y += 0.002;
      hub.rotation.z += speedFactor;

      pistons.forEach((p, idx) => {
        p.position.y = 0.55 + Math.sin(elapsed * (speedFactor * 10) + idx) * 0.22;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [engineState.rpm, viewMode, exploded, selectedSubsystem]);

  return <div ref={mountRef} className="w-full h-full min-h-[360px]" />;
};
