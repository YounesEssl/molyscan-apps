import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Card, Button, Badge, EmptyState } from '@/components/ui';
import { Toggle } from '@/components/ui/Toggle';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { exportService } from '@/services/export.service';
import { MOCK_SCANS } from '@/mocks/scans.mock';
import type { ExportRecord, ExportFormat } from '@/schemas/export.schema';
import { formatRelativeDate } from '@/utils/date';

const STATUS_FILTERS = ['all', 'matched', 'partial', 'no_match'] as const;
const STATUS_LABELS: Record<string, string> = {
  all: 'Tous',
  matched: 'Matchés',
  partial: 'Partiels',
  no_match: 'Sans match',
};

const BRAND_OPTIONS = [...new Set(MOCK_SCANS.map((s) => s.scannedProduct.brand))];

export default function ExportScreen(): React.JSX.Element {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Filters
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());

  useEffect(() => {
    exportService.getExports().then(setExports);
  }, []);

  const filteredScans = useMemo(() => {
    let result = MOCK_SCANS;
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (selectedBrands.size > 0) {
      result = result.filter((s) => selectedBrands.has(s.scannedProduct.brand));
    }
    return result;
  }, [statusFilter, selectedBrands]);

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
    setGenerating(false);
  };

  return (
    <ScreenWrapper scroll padded={false}>
      <Header title="Export & Intelligence" showBack />
      <View style={styles.content}>
        {/* Format selection */}
        <Card style={styles.section}>
          <Text variant="label">Format d'export</Text>
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
          <Text variant="label">Filtrer par statut</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {STATUS_FILTERS.map((s) => (
              <Badge
                key={s}
                label={STATUS_LABELS[s]}
                variant={statusFilter === s ? 'primary' : 'neutral'}
                onPress={() => setStatusFilter(s)}
              />
            ))}
          </ScrollView>
        </Card>

        {/* Brand filter */}
        <Card style={styles.section}>
          <Text variant="label">Filtrer par marque concurrente</Text>
          <View style={styles.chipRow}>
            {BRAND_OPTIONS.map((brand) => (
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
            <Text variant="label">Aperçu des données</Text>
            <Text variant="caption" color={COLORS.textMuted}>
              {filteredScans.length} scan(s)
            </Text>
          </View>
          {filteredScans.slice(0, showPreview ? 20 : 3).map((scan) => (
            <View key={scan.id} style={styles.previewRow}>
              <View style={styles.previewProduct}>
                <Text variant="caption" style={styles.previewName} numberOfLines={1}>
                  {scan.scannedProduct.name}
                </Text>
                <Text variant="caption" color={COLORS.textMuted}>
                  {scan.scannedProduct.brand}
                </Text>
              </View>
              <Badge
                label={scan.status === 'matched' ? 'Match' : scan.status === 'partial' ? 'Partiel' : 'Aucun'}
                variant={scan.status === 'matched' ? 'success' : scan.status === 'partial' ? 'warning' : 'danger'}
              />
              <Text variant="caption" color={COLORS.textMuted} style={styles.previewDate}>
                {new Date(scan.scannedAt).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          ))}
          {filteredScans.length > 3 && (
            <Button
              title={showPreview ? 'Voir moins' : `Voir tout (${filteredScans.length})`}
              variant="ghost"
              size="sm"
              onPress={() => setShowPreview(!showPreview)}
            />
          )}
        </Card>

        {/* Generate */}
        <Button
          title={`Générer le rapport ${format.toUpperCase()}`}
          variant="accent"
          icon="download-outline"
          loading={generating}
          onPress={handleGenerate}
          style={styles.generateBtn}
        />

        {/* Recent exports */}
        <Text variant="label" style={styles.sectionTitle}>Rapports récents</Text>
        {exports.length === 0 ? (
          <EmptyState icon="document-text-outline" title="Aucun export" />
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
                  <Text variant="caption" color={COLORS.accent}>En cours...</Text>
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
