import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';

export function TechnicalSheetCTA({ label, subtitle, onPress }: { label: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button">
      <View style={styles.icon}><FileText size={24} color={colors.red} strokeWidth={2} /></View>
      <View style={styles.copy}><Text variant="body">{label}</Text><Text variant="caption" color={colors.ink3}>{subtitle}</Text></View>
      <Text variant="heading" color={colors.red}>›</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({ card:{ marginHorizontal:20, marginTop:16, padding:16, borderRadius:20, backgroundColor:colors.paper2, borderWidth:1, borderColor:'rgba(26,20,16,0.07)', flexDirection:'row', alignItems:'center', gap:12 }, pressed:{ opacity:.72 }, icon:{ width:44,height:44,borderRadius:14,backgroundColor:'rgba(212,37,28,.08)',alignItems:'center',justifyContent:'center' }, copy:{ flex:1,gap:2 } });
