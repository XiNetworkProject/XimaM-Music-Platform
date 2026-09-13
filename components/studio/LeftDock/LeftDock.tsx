'use client';

import ProjectSwitcher from './ProjectSwitcher';
import GeneratorForm from './GeneratorForm';

export default function LeftDock({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="panel-suno experience-intent-form h-full min-h-0 flex flex-col overflow-hidden">
      <div className="experience-intent-form-heading p-3 border-b border-border-secondary">
        <div className="v2-kicker">01 / Composer</div>
        <h2 className="text-sm font-semibold text-foreground-primary">L’intention musicale</h2>
      </div>

      <div className="min-h-0 overflow-y-auto p-3 space-y-3">
        <GeneratorForm onGenerate={onGenerate} />
        <details className="workspace-projects">
          <summary>Projet & organisation</summary>
          <ProjectSwitcher />
        </details>
      </div>
    </div>
  );
}

