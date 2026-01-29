'use client';

import ProjectSwitcher from './ProjectSwitcher';
import GeneratorForm from './GeneratorForm';

export default function LeftDock({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="panel-suno h-full min-h-0 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border-secondary">
        <div className="text-[11px] text-foreground-tertiary">LEFT DOCK</div>
        <div className="text-sm font-semibold text-foreground-primary">Builder</div>
      </div>

      <div className="min-h-0 overflow-y-auto p-3 space-y-3">
        <ProjectSwitcher />
        <GeneratorForm onGenerate={onGenerate} />
      </div>
    </div>
  );
}

