import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Card, Button, Badge, EmptyState } from '@/components/ui';
import { Toggle } from '@/components/ui/Toggle';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { exportService } from '@/services/export.service';
import { scanService } from '@/services/scan.service';
import type { ExportRecord, ExportFormat } from '@/schemas/export.schema';
import type { ScanRecord } from '@/schemas/scan.schema';
import { formatRelativeDate } from '@/utils/date';

const STATUS_FILTERS = ['all', 'matched', 'partial', 'no_match'] as const;
const STATUS_LABEL_KEYS: Record<string, string> = {
  all: 'export.statusAll',
  matched: 'export.statusMatched',
  partial: 'export.statusPartial',
  no_match: 'export.statusNoMatch',
};

export default function ExportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Filters
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());

  useEffect(() => {
    exportService.getExports().then(setExports).catch(() => {});
    scanService.getHistory().then(setScans).catch(() => {});
  }, []);

  const brandOptions = useMemo(() => {
    return [...new Set(scans.map((s) => s.scannedProduct?.brand).filter(Boolean))];
  }, [scans]);

  const filteredScans = useMemo(() => {
    let result = scans;
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (selectedBrands.size > 0) {
      result = result.filter((s) => s.scannedProduct && selectedBrands.has(s.scannedProduct.brand));
    }
    return result;
  }, [statusFilter, selectedBrands, scans]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await exportService.generate({
        format,
        dateRange: {
          from: '2025-01-01T00:00:00.000Z',
          to: new Date().toISOString(),
        },
        includeCharts: true,
        filters: {
          status: statusFilter === 'all' ? undefined : [statusFilter],
          categories: selectedBrands.size > 0 ? [...selectedBrands] : undefined,
        },
      });
      setExports((prev) => [result, ...prev]);
    } catch {}
    setGenerating(false);
  };

  return (
    <ScreenWrapper scroll padded={false}>
      <Header title={t('export.title')} showBack />
      <View style={styles.content}>
        {/* Format selection */}
        <Card style={styles.section}>
          <Text variant="label">{t('export.formatLabel')}</Text>
          <Toggle
            options={[
              { label: 'PDF', value: 'pdf' },
              { label: 'Excel', value: 'xlsx' },
              { label: 'CSV', value: 'csv' },
            ]}
            value={format}
            onChange={(v) => setFormat(v as ExportFormat)}
          />
        </Card>

        {/* Status filter */}
        <Card style={styles.section}>
          <Text variant="label">{t('export.filterByStatus')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {STATUS_FILTERS.map((s) => (
              <Badge
                key={s}
                label={t(STATUS_LABEL_KEYS[s])}
                variant={statusFilter === s ? 'primary' : 'neutral'}
                onPress={() => setStatusFilter(s)}
              />
            ))}
          </ScrollView>
        </Card>

        {/* Brand filter */}
        <Card style={styles.section}>
          <Text variant="label">{t('export.filterByBrand')}</Text>
          <View style={styles.chipRow}>
            {brandOptions.map((brand) => (
              <Badge
                key={brand}
                label={brand}
                variant={selectedBrands.has(brand) ? 'primary' : 'neutral'}
                onPress={() => toggleBrand(brand)}
              />
            ))}
          </View>
        </Card>

        {/* Preview */}
        <Card style={styles.section}>
          <View style={styles.previewHeader}>
            <Text variant="label">{t('export.dataPreview')}</Text>
            <Text variant="caption" color={COLORS.textMuted}>
              {t('export.scanCount', { count: filteredScans.length })}
            </Text>
          </View>
          {filteredScans.slice(0, showPreview ? 20 : 3).map((scan) => (
            <View key={scan.id} style={styles.previewRow}>
              <View style={styles.previewProduct}>
                <Text variant="caption" style={styles.previewName} numberOfLines={1}>
                  {scan.scannedProduct?.name ?? t('product.unknownProduct')}
                </Text>
                <Text variant="caption" color={COLORS.textMuted}>
                  {scan.scannedProduct?.brand ?? ''}
                </Text>
              </View>
              <Badge
                label={scan.status === 'matched' ? t('product.statusBadgeMatch') : scan.status === 'partial' ? t('product.statusBadgePartial') : t('product.statusBadgeNone')}
                variant={scan.status === 'matched' ? 'success' : scan.status === 'partial' ? 'warning' : 'danger'}
              />
              <Text variant="caption" color={COLORS.textMuted} style={styles.previewDate}>
                {new Date(scan.scannedAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR')}
              </Text>
            </View>
          ))}
          {filteredScans.length > 3 && (
            <Button
              title={showPreview ? t('common.seeLess') : t('common.seeAllCount', { count: filteredScans.length })}
              variant="ghost"
              size="sm"
              onPress={() => setShowPreview(!showPreview)}
            />
          )}
        </Card>

        {/* Generate */}
        <Button
          title={t('export.generateReport', { format: format.toUpperCase() })}
          variant="accent"
          icon="download-outline"
          loading={generating}
          onPress={handleGenerate}
          style={styles.generateBtn}
        />

        {/* Recent exports */}
        <Text variant="label" style={styles.sectionTitle}>{t('export.recentReports')}</Text>
        {exports.length === 0 ? (
          <EmptyState icon="document-text-outline" title={t('export.noExport')} />
        ) : (
          exports.map((item) => (
            <Card key={item.id} style={styles.exportCard}>
              <View style={styles.exportRow}>
                <Ionicons
                  name={item.format === 'pdf' ? 'document' : item.format === 'xlsx' ? 'grid' : 'list'}
                  size={24}
                  color={COLORS.primary}
                />
                <View style={styles.exportInfo}>
                  <Text variant="body" style={styles.fileName}>{item.fileName}</Text>
                  <Text variant="caption" color={COLORS.textMuted}>
                    {item.size} · {formatRelativeDate(item.generatedAt)}
                  </Text>
                </View>
                {item.status === 'generating' ? (
                  <Text variant="caption" color={COLORS.accent}>{t('export.generating')}</Text>
                ) : (
                  <Ionicons name="cloud-download-outline" size={22} color={COLORS.accent} />
                )}
              </View>
            </Card>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.lg,
  },
  section: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  previewProduct: {
    flex: 1,
    gap: 1,
  },
  previewName: {
    fontWeight: '600',
    color: COLORS.text,
  },
  previewDate: {
    width: 70,
    textAlign: 'right',
    fontSize: 11,
  },
  generateBtn: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    marginBottom: SPACING.sm,
  },
  exportCard: {
    gap: 0,
    marginBottom: SPACING.sm,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  exportInfo: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontWeight: '600',
  },
  bottomSpacer: {
    height: SPACING.xxl,
  },
});
