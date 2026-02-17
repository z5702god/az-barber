/**
 * useResponsive - 平板自適應佈局 Hook
 * 根據螢幕寬度提供縮放後的 spacing、fontSize、grid columns 等
 */
import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
import { spacing, typography, breakpoints } from '../theme';

export interface ResponsiveValues {
  isTablet: boolean;
  windowWidth: number;

  // 縮放後的 spacing (phone: 1x, tablet: 1.3x)
  sp: typeof spacing;

  // 縮放後的 fontSize (phone: 1x, tablet: 1.2x)
  fs: typeof typography.fontSize;

  // Grid helper: 根據裝置回傳欄數
  gridColumns: (phoneCols: number, tabletCols: number) => number;

  // 元件尺寸
  avatarSize: number;      // 小 avatar (barber cards): 72 → 100
  avatarLarge: number;     // 大 avatar (profile): 88 → 120
  featuredHeight: number;  // featured card: 180 → 260
  iconSize: number;        // icon container: 48 → 64
  iconSmall: number;       // small icon: 40 → 52

  // Modal
  modalMaxWidth: number | undefined;  // phone: undefined, tablet: 500

  // 通用縮放函數
  scale: (phoneValue: number, tabletValue: number) => number;
}

export function useResponsive(): ResponsiveValues {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const isTablet = width >= breakpoints.tablet;
    const spScale = isTablet ? 1.3 : 1;
    const fsScale = isTablet ? 1.2 : 1;

    const sp = {
      xs: Math.round(spacing.xs * spScale),
      sm: Math.round(spacing.sm * spScale),
      md: Math.round(spacing.md * spScale),
      lg: Math.round(spacing.lg * spScale),
      xl: Math.round(spacing.xl * spScale),
      xxl: Math.round(spacing.xxl * spScale),
    };

    const fs = {
      xs: Math.round(typography.fontSize.xs * fsScale),
      sm: Math.round(typography.fontSize.sm * fsScale),
      md: Math.round(typography.fontSize.md * fsScale),
      lg: Math.round(typography.fontSize.lg * fsScale),
      xl: Math.round(typography.fontSize.xl * fsScale),
      xxl: Math.round(typography.fontSize.xxl * fsScale),
      hero: Math.round(typography.fontSize.hero * fsScale),
    };

    return {
      isTablet,
      windowWidth: width,
      sp,
      fs,
      gridColumns: (phoneCols: number, tabletCols: number) =>
        isTablet ? tabletCols : phoneCols,
      avatarSize: isTablet ? 100 : 72,
      avatarLarge: isTablet ? 120 : 88,
      featuredHeight: isTablet ? 260 : 180,
      iconSize: isTablet ? 64 : 48,
      iconSmall: isTablet ? 52 : 40,
      modalMaxWidth: isTablet ? 500 : undefined,
      scale: (phoneValue: number, tabletValue: number) =>
        isTablet ? tabletValue : phoneValue,
    };
  }, [width]);
}
