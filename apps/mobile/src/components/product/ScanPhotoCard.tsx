import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';

interface ScanPhotoCardProps {
  photoUrl: string;
}

export function ScanPhotoCard({ photoUrl }: ScanPhotoCardProps): React.JSX.Element {
  return (
    <View style={styles.wrapper}>
      <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.section,
    marginTop: 10,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    aspectRatio: 4 / 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
