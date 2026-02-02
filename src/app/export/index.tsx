import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, type ViewStyle } from 'react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Card, Button, EmptyState } from '@/components/ui';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { COLORS, SPACING, SHADOW } from '@/constants/theme';
import { exportService } from '@/services/export.service';
import type { ExportRecord } from '@/schemas/export.schema';
import { formatRelativeDate } from '@/utils/date';
import { Ionicons } from '@expo/vector-icons';

export default function ExportScreen(): React.JSX.Element {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    exportService.getExports().then(setExports);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await exportService.generate({
      format: 'pdf',
      dateRange: {
        from: '2025-01-01T00:00:00.000Z',
        to: new Date().toISOString(),
      },
      includeCharts: true,
    });
    setExports((prev) => [result, ...prev]);
    setGenerating(false);
  };

  return (
    <ScreenWrapper padded={false}>
      <Header title="Export & Intelligence" showBack />
      <View style={styles.content}>
        <Button
          title="Générer un rapport"
          variant="accent"
          icon="download-outline"
          loading={generating}
          onPress={handleGenerate}
          style={styles.generateBtn}
        />
        <Text variant="label" style={styles.sectionTitle}>Rapports récents</Text>
        <FlatList
          data={exports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Card style={styles.exportCard}>
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
          )}
          ListEmptyComponent={
            <EmptyState icon="document-text-outline" title="Aucun export" />
          }
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  generateBtn: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    marginBottom: SPACING.sm,
  },
  list: {
    paddingBottom: SPACING.xl,
  },
  separator: {
    height: SPACING.sm,
  },
  exportCard: {
    gap: 0,
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
});
