import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ModuleSelectorProps {
  selectedModule: 'ielts' | 'pte' | 'toefl' | 'general';
  onModuleChange: (module: 'ielts' | 'pte' | 'toefl' | 'general') => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  selectedModule,
  onModuleChange
}) => {
  const modules = [
    { value: 'ielts', label: 'IELTS' },
    { value: 'pte', label: 'PTE Academic' },
    { value: 'toefl', label: 'TOEFL iBT' },
    { value: 'general', label: 'General English' }
  ];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-2">
        Select Module
      </label>
      <Select value={selectedModule} onValueChange={onModuleChange}>
        <SelectTrigger className="w-full bg-surface-1/50 border-border/30">
          <SelectValue placeholder="Choose test module" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border shadow-lg z-50">
          {modules.map((module) => (
            <SelectItem 
              key={module.value} 
              value={module.value}
              className="cursor-pointer hover:bg-surface-1/50"
            >
              {module.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModuleSelector;