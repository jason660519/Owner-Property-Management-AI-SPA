'use client';

import { useState } from 'react';
import { Eye, X, Monitor, ShieldAlert } from 'lucide-react';
import { setSimulationRole, exitSimulation } from './actions';

const ROLES = [
  { id: 'contract_tenant', label: 'Contract Tenant (合約承租人)' },
  { id: 'contract_buyer', label: 'Contract Buyer (合約買方)' },
  { id: 'potential_tenant', label: 'Potential Tenant (潛在承租人)' },
  { id: 'potential_buyer', label: 'Potential Buyer (潛在買方)' },
  { id: 'vendor', label: 'Vendor (供應商)' },
  { id: 'auditor', label: 'Auditor (稽核人員)' },
  { id: 'system_engineer', label: 'System Engineer (系統工程師)' },
  { id: 'cybersecurity_engineer', label: 'Cybersecurity Engineer (資安工程師)' },
  { id: 'landlord', label: 'Landlord (房東 - Legacy)' },
];

export default function RoleSimulationPage() {
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const handleSimulate = async (roleId: string) => {
    await setSimulationRole(roleId);
    setCurrentRole(roleId);
    setIframeKey(prev => prev + 1); // Force iframe refresh
  };

  const handleExit = async () => {
    await exitSimulation();
    setCurrentRole(null);
    setIframeKey(prev => prev + 1);
  };

  // Map roles to their likely starting URLs in the Web App
  const getStartUrl = (role: string) => {
    const map: Record<string, string> = {
      contract_tenant: '/tenant/dashboard',
      potential_tenant: '/tenant/potential/dashboard',
      contract_buyer: '/buyer/dashboard',
      potential_buyer: '/buyer/dashboard',
      landlord: '/landlord/dashboard',
      vendor: '/vendor/dashboard',
      auditor: '/admin/reports', // Example
    };
    return `http://localhost:3000${map[role] || '/'}`;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#1A1A1A]">
      {/* Simulation Toolbar */}
      <div className="bg-[#2A2A2A] border-b border-[#333333] p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Monitor className="text-[#7C3AED]" />
            <span>Role Simulation View</span>
          </div>
          
          <select 
            className="bg-[#1A1A1A] text-white border border-[#333333] rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#7C3AED]"
            value={currentRole || ''}
            onChange={(e) => handleSimulate(e.target.value)}
          >
            <option value="" disabled>Select a role to simulate...</option>
            {ROLES.map(role => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>

          {currentRole && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded text-amber-500 text-xs font-mono animate-pulse">
              <Eye size={14} />
              SIMULATING: {currentRole}
            </div>
          )}
        </div>

        {currentRole && (
          <button
            onClick={handleExit}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded transition-colors text-sm"
          >
            <X size={16} />
            Exit Simulation
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {currentRole ? (
          <div className={`w-full h-full border-[6px] border-amber-500 box-border relative`}>
            {/* Watermark */}
            <div className="absolute top-0 left-0 w-full h-8 bg-amber-500 text-black text-xs font-bold flex items-center justify-center uppercase tracking-widest z-10 pointer-events-none opacity-90">
              <ShieldAlert size={14} className="mr-2" />
              Simulation Mode - Actions are logged
            </div>
            
            <iframe
              key={iframeKey}
              src={getStartUrl(currentRole)}
              className="w-full h-full bg-white pt-8" // Add padding top for watermark
              title="Role Simulation Preview"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#666666] gap-4">
            <Monitor size={64} strokeWidth={1} />
            <div className="text-center">
              <h3 className="text-xl font-medium text-white mb-2">Ready to Simulate</h3>
              <p className="max-w-md">
                Select a role from the dropdown above to preview the application interface 
                from that user&apos;s perspective.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 bg-[#2A2A2A] rounded border border-[#333333]">
                <h4 className="text-white font-medium mb-1">Safe Environment</h4>
                <p className="text-xs">Your admin session remains active. Exiting restores full access immediately.</p>
              </div>
              <div className="p-4 bg-[#2A2A2A] rounded border border-[#333333]">
                <h4 className="text-white font-medium mb-1">Audit Logging</h4>
                <p className="text-xs">All simulation activities are recorded for security compliance.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
