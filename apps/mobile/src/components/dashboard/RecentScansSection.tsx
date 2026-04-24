import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  type ViewStyle,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import type { ScanRecord, ScanStatus } from '@/schemas/scan.schema';

interface RecentScansSectionProps {
  scans: ScanRecord[];
  onScanPress: (id: string) => void;
  onSeeAllPress: () => void;
}

const STATUS_LABEL: Record<ScanStatus, string> = {
  matched: '● Matched',
  partial: '● Partial',
  no_match: '○ None',
};

const STATUS_VARIANT: Record<
  ScanStatus,
  'ok' | 'warn' | 'default'
> = {
  matched: 'ok',
  partial: 'warn',
  no_match: 'default',
};

export function RecentScansSection({
  scans,
  onScanPress,
  onSeeAllPress,
}: RecentScansSectionProps): React.JSX.Element {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent</Text>
        <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {scans.slice(0, 4).map((s) => (
          <RecentScanCard key={s.id} scan={s} onPress={() => onScanPress(s.id)} />
        ))}
        {scans.length === 0 ? (
          <View style={styles.empty}>
            <RNText style={styles.emptyText}>
              No scans yet
            </RNText>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

interface RecentScanCardProps {
  scan: ScanRecord;
  onPress: () => void;
}

function RecentScanCard({
  scan,
  onPress,
}: RecentScanCardProps): React.JSX.Element {
  const status = scan.status;
  const confidence = scan.molydalMatch?.confidence ?? 0;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <Pill variant={STATUS_VARIANT[status]} size="sm">
          {STATUS_LABEL[status]}
        </Pill>
        {confidence > 0 ? (
          <RNText style={styles.confidence}>
            {confidence}
            <RNText style={styles.confidenceSub}>%</RNText>
          </RNText>
        ) : null}
      </View>
      <RNText style={styles.competitor}>{scan.scannedProduct?.brand ?? ''}</RNText>
      <RNText style={styles.equivalent} numberOfLines={2}>
        {scan.molydalMatch?.name ?? 'No equivalent'}
      </RNText>
      <RNText style={styles.place}>{scan.location?.label ?? ''}</RNText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.section,
    marginTop: 28,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: typography.fonts.sansMedium,
    color: colors.ink2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.section,
    paddingTop: 12,
    paddingBottom: 4,
  },
  card: {
    width: 220,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    shadowColor: '#3c2814',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  } as ViewStyle,
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidence: {
    fontFamily: typography.fonts.mono,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  confidenceSub: {
    fontSize: 9,
    color: colors.ink3,
  },
  competitor: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    marginTop: 14,
    letterSpacing: -0.1,
  },
  equivalent: {
    fontFamily: typography.fonts.display,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 20,
    marginTop: 4,
  },
  place: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    color: colors.ink3,
    marginTop: 12,
    letterSpacing: -0.1,
  },
  empty: {
    width: 220,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  emptyText: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    color: colors.ink3,
  },
});
