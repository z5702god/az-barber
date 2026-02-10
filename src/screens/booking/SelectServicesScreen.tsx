import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../services/supabase';
import { Service } from '../../types';
import { BookingStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectServices'>;

// Service categories for grouping
const SERVICE_CATEGORIES: { [key: string]: string[] } = {
  '剪髮': ['洗剪', '單剪'],
  '燙髮': ['單燙髮（肩上）', '單燙髮（耳下）'],
  '染髮': ['單染髮'],
  '護髮 & 頭皮保養': ['護髮（基礎）', '護髮（標準）', '護髮（深層）', '頭皮精油保養', '頭皮養髮保養'],
};

const getCategoryForService = (serviceName: string): string => {
  for (const [category, services] of Object.entries(SERVICE_CATEGORIES)) {
    if (services.includes(serviceName)) {
      return category;
    }
  }
  return '其他服務';
};

export const SelectServicesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { barberId } = route.params;
  const [services, setServices] = useState<Service[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setFetchError(false);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      if (__DEV__) console.error('Error fetching services:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  // Group services by category
  const groupedServices = useMemo(() => {
    const groups: { [key: string]: Service[] } = {};
    const categoryOrder = Object.keys(SERVICE_CATEGORIES);

    services.forEach(service => {
      const category = getCategoryForService(service.name);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(service);
    });

    // Sort groups by predefined order
    const sortedGroups: { category: string; services: Service[] }[] = [];
    categoryOrder.forEach(cat => {
      if (groups[cat]) {
        sortedGroups.push({ category: cat, services: groups[cat] });
      }
    });
    // Add any remaining categories
    Object.keys(groups).forEach(cat => {
      if (!categoryOrder.includes(cat)) {
        sortedGroups.push({ category: cat, services: groups[cat] });
      }
    });

    return sortedGroups;
  }, [services]);

  const toggleService = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newSelected = new Set(selectedIds);
    const selectedService = services.find(s => s.id === id);

    if (!selectedService) return;

    // Get the category of the selected service
    const selectedCategory = getCategoryForService(selectedService.name);

    if (newSelected.has(id)) {
      // If already selected, just deselect it
      newSelected.delete(id);
    } else {
      // Remove any other service from the same category (radio button behavior within group)
      services.forEach(service => {
        if (getCategoryForService(service.name) === selectedCategory && newSelected.has(service.id)) {
          newSelected.delete(service.id);
        }
      });
      // Add the new selection
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectedServices = services.filter(s => selectedIds.has(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const handleNext = () => {
    navigation.navigate('SelectDateTime', {
      barberId,
      selectedServices,
      totalDuration,
      totalPrice,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.chinese, marginBottom: spacing.md }}>
          載入服務失敗，請稍後再試
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}
          onPress={fetchServices}
        >
          <Text style={{ color: colors.primaryForeground, fontFamily: typography.fontFamily.chineseMedium }}>重試</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        overScrollMode="never"
      >
        {/* Instruction text */}
        <Text style={styles.instructionText}>
          每個類別可選擇一項服務，可跨類別組合
        </Text>

        {groupedServices.map(({ category, services: categoryServices }) => (
          <View key={category} style={styles.categorySection}>
            {/* Category Header */}
            <View style={styles.categoryHeader}>
              <View style={styles.categoryLine} />
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.categoryLine} />
            </View>

            {/* Services in Category */}
            {categoryServices.map((service, index) => {
              const isSelected = selectedIds.has(service.id);
              const isLast = index === categoryServices.length - 1;

              return (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardSelected,
                    !isLast && styles.serviceCardMargin,
                  ]}
                  onPress={() => toggleService(service.id)}
                  activeOpacity={0.7}
                >
                  {/* Selection indicator bar */}
                  {isSelected && <View style={styles.selectedIndicator} />}

                  <View style={styles.serviceContent}>
                    {/* Custom Radio/Check Circle */}
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && (
                        <View style={styles.radioInner}>
                          <Ionicons name="checkmark" size={14} color={colors.background} />
                        </View>
                      )}
                    </View>

                    {/* Service Info */}
                    <View style={styles.serviceInfo}>
                      <Text style={[
                        styles.serviceName,
                        isSelected && styles.serviceNameSelected,
                      ]}>
                        {service.name}
                      </Text>
                      <View style={styles.serviceMeta}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={colors.mutedForeground}
                        />
                        <Text style={styles.serviceDuration}>
                          {formatDuration(service.duration_minutes)}
                        </Text>
                      </View>
                    </View>

                    {/* Price */}
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceCurrency}>$</Text>
                      <Text style={[
                        styles.servicePrice,
                        isSelected && styles.servicePriceSelected,
                      ]}>
                        {service.price.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Bottom spacing for summary bar */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryContent}>
          {/* Left side - Summary info */}
          <View style={styles.summaryLeft}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>
                  {selectedIds.size}
                </Text>
              </View>
              <Text style={styles.summaryLabel}>
                {selectedIds.size === 1 ? '項服務' : '項服務'}
              </Text>
            </View>

            <View style={styles.summaryValues}>
              <Text style={styles.summaryPrice}>
                ${totalPrice.toLocaleString()}
              </Text>
              {totalDuration > 0 && (
                <>
                  <View style={styles.summaryDivider} />
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={colors.mutedForeground}
                  />
                  <Text style={styles.summaryDuration}>
                    {formatDuration(totalDuration)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Right side - Continue button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              selectedIds.size === 0 && styles.continueButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={selectedIds.size === 0}
          >
            <Text style={[
              styles.continueButtonText,
              selectedIds.size === 0 && styles.continueButtonTextDisabled,
            ]}>
              繼續
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={selectedIds.size === 0 ? colors.mutedForeground : colors.primaryForeground}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 140,
  },
  instructionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  categoryLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  categoryTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.primary,
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
  },
  serviceCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(201, 169, 110, 0.08)',
  },
  serviceCardMargin: {
    marginBottom: spacing.sm,
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingVertical: spacing.md + 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  serviceName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: colors.foreground,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDuration: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginRight: 1,
  },
  servicePrice: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.displaySemiBold,
    color: colors.foreground,
  },
  servicePriceSelected: {
    color: colors.primary,
  },
  summaryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xl + spacing.sm,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 6,
  },
  summaryBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.secondarySemiBold,
    color: colors.primaryForeground,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
  },
  summaryValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryPrice: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.primary,
  },
  summaryDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  summaryDuration: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginLeft: 4,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: colors.secondary,
  },
  continueButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.primaryForeground,
  },
  continueButtonTextDisabled: {
    color: colors.mutedForeground,
  },
});
