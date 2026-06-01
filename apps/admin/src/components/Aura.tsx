import type { CSSProperties } from 'react';

interface AuraProps {
  size?: number;
  color?: string;
  opacity?: number;
  style?: CSSProperties;
}

/** Tache radiale floutée — reprend la signature visuelle de l'app mobile. */
export function Aura({
  size = 420,
  color = '#ff5b50',
  opacity = 0.25,
  style,
}: AuraProps) {
  return (
    <div
      aria-hidden
      className="aura"
      style={{
        width: size,
        height: size,
        opacity,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        ...style,
      }}
    />
  );
}
