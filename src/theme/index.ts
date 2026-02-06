/**
 * AZ Barber Theme - 基於 Pencil 設計風格
 * 深色主題配金色強調色
 */

export const colors = {
  // 主要顏色
  primary: '#C9A96E',           // 金色強調色 (從設計截圖取得)
  primaryForeground: '#111111', // 主色上的文字

  // 背景
  background: '#111111',        // 深色背景
  card: '#1C1C1C',              // 卡片背景 (統一設計規範)
  cardForeground: '#FFFFFF',    // 卡片文字

  // 文字
  foreground: '#FFFFFF',        // 主要文字
  mutedForeground: '#A0A0A0',   // 次要文字 / 灰色文字 (提高對比度)

  // 邊框
  border: '#2A2A2A',            // 邊框顏色 (統一設計規範)
  input: '#2A2A2A',             // 輸入框邊框

  // 次要顏色
  secondary: '#2A2A2A',         // 次要背景
  secondaryForeground: '#FFFFFF',

  // 功能色
  destructive: '#FF5C33',       // 錯誤/刪除
  success: '#4CAF50',           // 成功
  warning: '#FF8400',           // 警告

  // 社群登入按鈕
  line: '#00B900',
  google: '#FFFFFF',
  apple: '#FFFFFF',

  // 其他
  ring: '#C9A96E',              // 使用金色作為 focus ring
  muted: '#2A2A2A',
  overlay: 'rgba(0, 0, 0, 0.8)',

  // 互動狀態
  pressed: 'rgba(201, 169, 110, 0.15)', // 按壓時的金色疊加
  hover: 'rgba(255, 255, 255, 0.05)',   // hover 狀態
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export const typography = {
  fontFamily: {
    // JetBrains Mono - 等寬字體，用於 code-like 元素
    primary: 'JetBrainsMono-Regular',
    primaryMedium: 'JetBrainsMono-Medium',
    primarySemiBold: 'JetBrainsMono-SemiBold',
    primaryBold: 'JetBrainsMono-Bold',
    // Inter - UI 字體，用於按鈕、標籤
    secondary: 'Inter-Regular',
    secondaryMedium: 'Inter-Medium',
    secondarySemiBold: 'Inter-SemiBold',
    secondaryBold: 'Inter-Bold',
    // Playfair Display - 品牌字體，用於 Logo、大標題
    display: 'PlayfairDisplay-Regular',
    displayMedium: 'PlayfairDisplay-Medium',
    displaySemiBold: 'PlayfairDisplay-SemiBold',
    displayBold: 'PlayfairDisplay-Bold',
    // Manrope - 內文字體
    body: 'Manrope-Regular',
    bodyMedium: 'Manrope-Medium',
    bodySemiBold: 'Manrope-SemiBold',
    bodyBold: 'Manrope-Bold',
    // Noto Serif TC - 中文襯線字體 (優雅風格)
    chinese: 'NotoSerifTC-Regular',
    chineseMedium: 'NotoSerifTC-Medium',
    chineseSemiBold: 'NotoSerifTC-SemiBold',
    chineseBold: 'NotoSerifTC-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    hero: 40,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// React Native Paper 主題配置
export const paperTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    onPrimary: colors.primaryForeground,
    primaryContainer: colors.primary,
    onPrimaryContainer: colors.primaryForeground,
    secondary: colors.secondary,
    onSecondary: colors.secondaryForeground,
    secondaryContainer: colors.secondary,
    onSecondaryContainer: colors.secondaryForeground,
    tertiary: colors.primary,
    onTertiary: colors.primaryForeground,
    tertiaryContainer: colors.primary,
    onTertiaryContainer: colors.primaryForeground,
    error: colors.destructive,
    onError: colors.foreground,
    errorContainer: colors.destructive,
    onErrorContainer: colors.foreground,
    background: colors.background,
    onBackground: colors.foreground,
    surface: colors.card,
    onSurface: colors.cardForeground,
    surfaceVariant: colors.secondary,
    onSurfaceVariant: colors.mutedForeground,
    outline: colors.border,
    outlineVariant: colors.border,
    shadow: '#000000',
    scrim: colors.overlay,
    inverseSurface: colors.foreground,
    inverseOnSurface: colors.background,
    inversePrimary: colors.primary,
    elevation: {
      level0: 'transparent',
      level1: colors.card,
      level2: colors.card,
      level3: colors.secondary,
      level4: colors.secondary,
      level5: colors.secondary,
    },
    surfaceDisabled: colors.muted,
    onSurfaceDisabled: colors.mutedForeground,
    backdrop: colors.overlay,
  },
};

// 常用樣式 - 直角設計風格
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.none, // 直角風格
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.none, // 直角風格
    color: colors.foreground,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.none, // 直角風格
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.none, // 直角風格
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.none, // 直角風格
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    primary: {
      color: colors.foreground,
      fontSize: typography.fontSize.md,
      fontFamily: typography.fontFamily.chinese,
    },
    secondary: {
      color: colors.mutedForeground,
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.chinese,
    },
    title: {
      color: colors.foreground,
      fontSize: typography.fontSize.xl,
      fontFamily: typography.fontFamily.chineseBold,
    },
    subtitle: {
      color: colors.mutedForeground,
      fontSize: typography.fontSize.md,
      fontFamily: typography.fontFamily.chinese,
    },
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  paperTheme,
  commonStyles,
};
