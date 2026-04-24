import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';

interface AuraProps {
  width: number;
  height: number;
  color: string;   // hex e.g. '#ff5b50'
  opacity?: number; // max opacity at center (default 0.28)
  style?: object;
}

// Simulates CSS radial-gradient + filter:blur using SVG RadialGradient
// which fades smoothly from center to transparent — much closer to the reference
export const Aura: React.FC<AuraProps> = ({
  width,
  height,
  color,
  opacity = 0.28,
  style,
}) => {
  const id = `aura_${color.replace('#', '')}_${Math.round(opacity * 100)}`;
  return (
    <View
      style={[
        {
          position: 'absolute',
          width,
          height,
          pointerEvents: 'none',
        } as any,
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="60%" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={`url(#${id})`}
        />
      </Svg>
    </View>
  );
};
