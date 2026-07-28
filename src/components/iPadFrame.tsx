import React from 'react';

interface IPadFrameProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
  syncStatus: 'synced' | 'unsynced' | 'saving';
  syncCode: string;
}

export const IPadFrame: React.FC<IPadFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      <div className="w-full flex-1 flex flex-col min-h-screen bg-slate-950">
        {children}
      </div>
    </div>
  );
};
