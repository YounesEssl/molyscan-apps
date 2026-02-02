import React from 'react';
import { Toggle } from '@/components/ui/Toggle';
import type { ScanMethod } from '@/schemas/scan.schema';

interface ScanModeSwitchProps {
  mode: ScanMethod;
  onChange: (mode: ScanMethod) => void;
}

export const ScanModeSwitch: React.FC<ScanModeSwitchProps> = ({ mode, onChange }) => (
  <Toggle
    options={[
      { label: 'Caméra', value: 'camera' },
      { label: 'Vocal', value: 'voice' },
    ]}
    value={mode}
    onChange={(v) => onChange(v as ScanMethod)}
  />
);
