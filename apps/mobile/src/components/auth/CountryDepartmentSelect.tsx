import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react-native';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { radius } from '@/design/tokens/radius';
import type { Department } from '@/schemas/auth.schema';

export const FRANCE = 'France';

export interface CountryDepartmentValue {
  country: string;
  departmentId: string | null;
}

interface Props {
  departments: Department[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  value: CountryDepartmentValue;
  onChange: (next: CountryDepartmentValue) => void;
}

// France → on choisit un département (entrées avec code INSEE).
// Autres pays/zones → ce sont les départements sans code (Maroc, Espagne…).
export function CountryDepartmentSelect({
  departments,
  loading,
  error = false,
  onRetry,
  value,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const zones = useMemo(
    () => departments.filter((d) => d.code === null),
    [departments],
  );
  const frenchDepartments = useMemo(
    () => departments.filter((d) => d.code !== null),
    [departments],
  );
  const countries = useMemo(
    () => [FRANCE, ...zones.map((z) => z.name)],
    [zones],
  );

  const selectedFrench =
    value.country === FRANCE && value.departmentId
      ? frenchDepartments.find((d) => d.id === value.departmentId) ?? null
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return frenchDepartments;
    return frenchDepartments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code ?? '').toLowerCase().includes(q),
    );
  }, [frenchDepartments, query]);

  const selectCountry = (country: string) => {
    if (country === FRANCE) {
      onChange({ country: FRANCE, departmentId: null });
    } else {
      const zone = zones.find((z) => z.name === country);
      onChange({ country, departmentId: zone?.id ?? null });
    }
  };

  return (
    <View style={styles.container}>
      {/* Pays */}
      <RNText style={styles.label}>{t('auth.country')}</RNText>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.red} />
          <RNText style={styles.loadingText}>{t('common.loading')}</RNText>
        </View>
      ) : error ? (
        <View style={styles.errorRow}>
          <RNText style={styles.errorText}>
            {t('auth.departmentsLoadError')}
          </RNText>
          {onRetry && (
            <TouchableOpacity
              onPress={onRetry}
              activeOpacity={0.85}
              style={styles.retryBtn}
              accessibilityRole="button"
            >
              <RNText style={styles.retryText}>{t('common.retry')}</RNText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.pills}>
          {countries.map((country) => {
            const active = value.country === country;
            return (
              <TouchableOpacity
                key={country}
                onPress={() => selectCountry(country)}
                activeOpacity={0.85}
                style={[styles.pill, active && styles.pillActive]}
              >
                <RNText style={[styles.pillText, active && styles.pillTextActive]}>
                  {country}
                </RNText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Département (France uniquement) */}
      {value.country === FRANCE && !loading && !error && (
        <View style={styles.deptBlock}>
          <RNText style={styles.label}>{t('auth.department')}</RNText>
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setPickerOpen(true);
            }}
            activeOpacity={0.85}
            style={styles.field}
          >
            <RNText
              style={[
                styles.fieldText,
                !selectedFrench && styles.fieldPlaceholder,
              ]}
              numberOfLines={1}
            >
              {selectedFrench
                ? `${selectedFrench.code} · ${selectedFrench.name}`
                : t('auth.departmentPlaceholder')}
            </RNText>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de sélection du département */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setPickerOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <RNText style={styles.sheetTitle}>{t('auth.department')}</RNText>
            <TouchableOpacity
              onPress={() => setPickerOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X width={24} height={24} color={colors.ink3} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Search width={18} height={18} color={colors.ink3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('auth.departmentSearch')}
              placeholderTextColor={colors.ink3}
              style={styles.searchInput}
              autoCorrect={false}
              autoFocus
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(d) => d.id}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={
              <RNText style={styles.emptyText}>
                {t('auth.departmentNoResult')}
              </RNText>
            }
            renderItem={({ item }) => {
              const active = item.id === value.departmentId;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onChange({ country: FRANCE, departmentId: item.id });
                    setPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <RNText style={styles.rowCode}>{item.code}</RNText>
                  <RNText style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </RNText>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  loadingText: { fontFamily: typography.fonts.sans, fontSize: 13, color: colors.ink2 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    color: colors.red,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.paper2,
  },
  retryText: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 13,
    color: colors.red,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink4,
    backgroundColor: colors.paper2,
  },
  pillActive: { backgroundColor: colors.red, borderColor: colors.red },
  pillText: { fontFamily: typography.fonts.sansSemibold, fontSize: 14, color: colors.ink2 },
  pillTextActive: { color: '#fff' },
  deptBlock: { gap: 8, marginTop: 4 },
  field: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink4,
    backgroundColor: colors.paper2,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  fieldText: { fontFamily: typography.fonts.sans, fontSize: 15, color: colors.ink },
  fieldPlaceholder: { color: colors.ink3 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,20,16,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    backgroundColor: colors.paper1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink4,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink4,
    backgroundColor: colors.paper2,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  list: { marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.ink4,
  },
  rowActive: { backgroundColor: colors.redSoft, borderRadius: 12 },
  rowCode: {
    width: 34,
    fontFamily: typography.fonts.mono ?? typography.fonts.sansSemibold,
    fontSize: 13,
    color: colors.ink3,
  },
  rowName: { flex: 1, fontFamily: typography.fonts.sans, fontSize: 15, color: colors.ink },
  emptyText: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    color: colors.ink3,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
