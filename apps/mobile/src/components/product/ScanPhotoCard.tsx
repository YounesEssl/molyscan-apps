import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';

interface ScanPhotoCardProps {
  photoUrl: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - spacing.section * 2;
const IMAGE_HEIGHT = Math.round(IMAGE_WIDTH * (3 / 4));

export function ScanPhotoCard({ photoUrl }: ScanPhotoCardProps): React.JSX.Element {
  return (
    <View style={styles.wrapper}>
      <Image
        source={{ uri: photoUrl }}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.section,
    marginTop: 10,
    borderRadius: radius.lg,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    overflow: 'hidden',
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  },
});
