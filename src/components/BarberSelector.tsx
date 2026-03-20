import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useBarbers } from '../hooks/useBarbers';
import { useResponsive } from '../hooks/useResponsive';
import { colors, spacing, typography } from '../theme';

interface BarberSelectorProps {
  selectedBarberId: string;
  onSelect: (barberId: string) => void;
  showAll?: boolean; // 是否顯示「全部」選項
}

export const BARBER_ALL = 'all';

export const BarberSelector: React.FC<BarberSelectorProps> = ({ selectedBarberId, onSelect, showAll = true }) => {
  const { barbers } = useBarbers();
  const r = useResponsive();

  if (barbers.length <= 1) return null;

  return (
    <View style={[styles.container, { paddingHorizontal: r.sp.lg, paddingVertical: r.sp.sm }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {showAll && (
          <TouchableOpacity
            style={[
              styles.chip,
              { paddingVertical: r.sp.sm, paddingHorizontal: r.sp.md },
              selectedBarberId === BARBER_ALL && styles.chipActive,
            ]}
            onPress={() => onSelect(BARBER_ALL)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.chipText,
              { fontSize: r.fs.sm },
              selectedBarberId === BARBER_ALL && styles.chipTextActive,
            ]}>
              全部
            </Text>
          </TouchableOpacity>
        )}
        {barbers.map((barber) => {
          const isSelected = barber.id === selectedBarberId;
          return (
            <TouchableOpacity
              key={barber.id}
              style={[
                styles.chip,
                { paddingVertical: r.sp.sm, paddingHorizontal: r.sp.md },
                isSelected && styles.chipActive,
              ]}
              onPress={() => onSelect(barber.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.chipText,
                { fontSize: r.fs.sm },
                isSelected && styles.chipTextActive,
              ]}>
                {barber.display_name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.mutedForeground,
  },
  chipTextActive: {
    color: colors.primary,
  },
});
