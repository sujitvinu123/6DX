import React, { useState } from 'react';
import { EngineState } from '../../types/engine';

interface EngineViewportProps {
  engineState: EngineState;
  selectedSubsystem: string;
  onSelectSubsystem: (subsystem: string) => void;
}

/**
 * EngineViewport Component
 * Renders the 3D Aero-Piston Engine Digital Twin Viewport.
 * Architecture is prepared for:
 *   const { scene } = useGLTF('/models/aero-piston-engine.glb');
 *   <primitive object={scene} />
 */
export const EngineViewport: React.FC<EngineViewportProps> = ({
  engineState,
  selectedSubsystem,
  onSelectSubsystem,
}) => {
  const [viewMode, setViewMode] = useState<'standard' | 'xray'>('standard');
  const subsystems = ['ENGINE', 'CYLINDERS', 'FUEL', 'OIL', 'EXHAUST', 'ELECTRICAL'];

  return (
    <div className="bg-white rounded-md border border-[#DDE3E2] shadow-xs flex flex-col h-full overflow-hidden">
      {/* Viewport Header */}
      <div className="px-4 py-2.5 border-b border-[#DDE3E2] flex flex-wrap justify-between items-center bg-[#FAFCFB] gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold font-['IBM_Plex_Mono'] text-[#172022] tracking-wider uppercase">
            LIVE DIGITAL TWIN
          </span>
          <span className="text-[10px] font-['IBM_Plex_Mono'] text-[#667276] px-2 py-0.5 bg-[#E5E9E8] rounded-xs">
            {engineState.engineId} / {engineState.uavId}
          </span>
        </div>

        {/* Subsystem Selection Tabs */}
        <div className="flex items-center gap-1 font-['IBM_Plex_Mono'] text-[10px]">
          {subsystems.map((sub) => (
            <button
              key={sub}
              onClick={() => onSelectSubsystem(sub)}
              className={`px-2 py-1 uppercase rounded-xs transition-colors font-semibold ${
                selectedSubsystem === sub
                  ? 'bg-[#007F86] text-white'
                  : 'text-[#667276] hover:text-[#172022] hover:bg-[#E5E9E8]'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas / Viewport Area */}
      <div className="relative flex-1 min-h-[380px] bg-gradient-to-b from-[#ebf4f6] to-[#F4F6F5] flex items-center justify-center overflow-hidden">
        {/* Subtle Technical Datum Grid & Coordinates */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0, 127, 134, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 127, 134, 0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top-Left Live Status Overlay */}
        <div className="absolute top-3 left-3 z-10 font-['IBM_Plex_Mono'] text-[9px] text-[#667276] bg-white/90 px-2 py-1 rounded-xs border border-[#DDE3E2] shadow-xs">
          <span className="text-[#007F86] font-bold">DIGITAL TWIN:</span> LIVE SYNCHRONIZATION
        </div>

        {/* Top-Right Synchronization Badge */}
        <div className="absolute top-3 right-3 z-10 font-['IBM_Plex_Mono'] text-[9px] text-[#2E7D5B] bg-white/90 px-2 py-1 rounded-xs border border-[#DDE3E2] shadow-xs flex items-center gap-1.5 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D5B] animate-pulse" />
          SYNCHRONIZED (50Hz)
        </div>

        {/* Center 3D Engine Asset (Seamless High-Resolution Twin Cutout) */}
        <div className="relative z-0 w-[84%] max-w-[500px] flex items-center justify-center">
          <img
            src={viewMode === 'standard' ? '/aero_engine.png' : '/aero_engine_xray.png'}
            alt="Aero-Piston Engine Model"
            className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-md transition-opacity duration-300"
          />
        </div>

        {/* View Mode Toggle: Standard vs X-Ray */}
        <div className="absolute bottom-3 left-3 z-10 flex gap-1 font-['IBM_Plex_Mono'] text-[9px]">
          <button
            onClick={() => setViewMode('standard')}
            className={`px-2 py-1 rounded-xs border uppercase font-bold transition-colors ${
              viewMode === 'standard'
                ? 'bg-[#007F86] text-white border-[#007F86]'
                : 'bg-white/90 text-[#667276] border-[#DDE3E2] hover:text-[#172022]'
            }`}
          >
            PBR Metal
          </button>
          <button
            onClick={() => setViewMode('xray')}
            className={`px-2 py-1 rounded-xs border uppercase font-bold transition-colors ${
              viewMode === 'xray'
                ? 'bg-[#007F86] text-white border-[#007F86]'
                : 'bg-white/90 text-[#667276] border-[#DDE3E2] hover:text-[#172022]'
            }`}
          >
            X-Ray / Sensors
          </button>
        </div>

        {/* Bottom-Right Controls Hint */}
        <div className="absolute bottom-3 right-3 z-10 font-['IBM_Plex_Mono'] text-[9px] text-[#667276] bg-white/90 px-2.5 py-1 rounded-xs border border-[#DDE3E2]">
          <span className="text-[#172022] font-semibold">CAD VIEW:</span> 3D ORBIT / ZOOM READY
        </div>
      </div>
    </div>
  );
};
export default EngineViewport;
