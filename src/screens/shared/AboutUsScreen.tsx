import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, typography } from '../../theme';

const SHOP_INFO = {
  name: 'AZ BARBER SHOP',
  subtitle: 'Men\'s Grooming Since 2019',
  description: '突破從前美髮的文化和概念，在各領域當中皆有一直的創新和精進。我們提供男士理髮、油頭造型、修容等專業服務，讓您的整體造型更加精神朝氣。',
  address: '台北市大同區民權西路 9 巷 22 號 1 樓',
  phone: '02-2586-7077',
  instagram: 'az_barber_shop2019',
  hours: [
    { day: '週一', time: '公休' },
    { day: '週二 - 週六', time: '12:00 - 21:00' },
    { day: '週日', time: '12:00 - 21:00' },
  ],
};

export const AboutUsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const r = useResponsive();

  const handleCall = () => {
    Linking.openURL(`tel:${SHOP_INFO.phone.replace(/-/g, '')}`);
  };

  const handleInstagram = () => {
    Linking.openURL(`https://instagram.com/${SHOP_INFO.instagram}`);
  };

  const handleMap = () => {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(SHOP_INFO.address)}`);
  };

  const InfoRow = ({ icon, label, value, onPress }: {
    icon: string;
    label: string;
    value: string;
    onPress?: () => void;
  }) => {
    const content = (
      <View style={[styles.infoRow, { padding: r.sp.md, gap: r.sp.md }]}>
        <Ionicons name={icon as any} size={r.scale(20, 24)} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { fontSize: r.fs.xs }]}>{label}</Text>
          <Text style={[styles.infoValue, { fontSize: r.fs.md }, onPress && styles.infoValueLink]}>{value}</Text>
        </View>
        {onPress && (
          <Ionicons name="open-outline" size={r.scale(16, 20)} color={colors.mutedForeground} />
        )}
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Custom Header */}
      <View style={[styles.header, { paddingHorizontal: r.sp.md, paddingVertical: r.sp.md }]}>
        <TouchableOpacity
          style={[styles.backButton, { padding: r.sp.sm }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={r.scale(24, 28)} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: r.fs.lg }]}>關於我們</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: r.sp.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Section */}
        <View style={[styles.brandSection, { paddingVertical: r.sp.xl, paddingHorizontal: r.sp.lg }]}>
          <Text style={[styles.brandName, { fontSize: r.fs.xxl, marginBottom: r.sp.xs }]}>{SHOP_INFO.name}</Text>
          <Text style={[styles.brandSubtitle, { fontSize: r.fs.sm, marginBottom: r.sp.lg }]}>{SHOP_INFO.subtitle}</Text>
          <View style={[styles.dividerGold, { marginBottom: r.sp.lg }]} />
          <Text style={[styles.description, { fontSize: r.fs.md, lineHeight: r.scale(26, 32) }]}>{SHOP_INFO.description}</Text>
        </View>

        {/* Contact Info */}
        <Text style={[styles.sectionTitle, { fontSize: r.fs.xs, marginBottom: r.sp.md, marginTop: r.sp.md, paddingHorizontal: r.sp.lg }]}>CONTACT</Text>
        <View style={[styles.card, { marginHorizontal: r.sp.lg }]}>
          <InfoRow
            icon="location"
            label="地址"
            value={SHOP_INFO.address}
            onPress={handleMap}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="call"
            label="電話"
            value={SHOP_INFO.phone}
            onPress={handleCall}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="logo-instagram"
            label="Instagram"
            value={`@${SHOP_INFO.instagram}`}
            onPress={handleInstagram}
          />
        </View>

        {/* Business Hours */}
        <Text style={[styles.sectionTitle, { fontSize: r.fs.xs, marginBottom: r.sp.md, marginTop: r.sp.md, paddingHorizontal: r.sp.lg }]}>HOURS</Text>
        <View style={[styles.card, { marginHorizontal: r.sp.lg }]}>
          {SHOP_INFO.hours.map((item, index) => (
            <View key={item.day}>
              {index > 0 && <View style={styles.divider} />}
              <View style={[styles.hoursRow, { padding: r.sp.md }]}>
                <Text style={[styles.hoursDay, { fontSize: r.fs.md }]}>{item.day}</Text>
                <Text style={[
                  styles.hoursTime,
                  { fontSize: r.fs.md },
                  item.time === '公休' && styles.hoursTimeClosed,
                ]}>
                  {item.time}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Legal Links */}
        <Text style={[styles.sectionTitle, { fontSize: r.fs.xs, marginBottom: r.sp.md, marginTop: r.sp.md, paddingHorizontal: r.sp.lg }]}>LEGAL</Text>
        <View style={[styles.card, { marginHorizontal: r.sp.lg }]}>
          <TouchableOpacity
            style={[styles.infoRow, { padding: r.sp.md, gap: r.sp.md }]}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={r.scale(20, 24)} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoValue, { fontSize: r.fs.md }]}>隱私權政策</Text>
            </View>
            <Ionicons name="chevron-forward" size={r.scale(16, 20)} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={[styles.infoRow, { padding: r.sp.md, gap: r.sp.md }]}
            onPress={() => navigation.navigate('Terms')}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text" size={r.scale(20, 24)} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoValue, { fontSize: r.fs.md }]}>服務條款</Text>
            </View>
            <Ionicons name="chevron-forward" size={r.scale(16, 20)} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[styles.appInfo, { marginTop: r.sp.xl, gap: r.sp.xs }]}>
          <Text style={[styles.appVersion, { fontSize: r.fs.xs }]}>AZ Barber App v1.0.0</Text>
          <Text style={[styles.appCopyright, { fontSize: r.fs.xs }]}>Made with care in Taipei</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.foreground,
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  brandSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  brandName: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.displayBold,
    color: colors.primary,
    letterSpacing: 6,
    marginBottom: spacing.xs,
  },
  brandSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.primaryMedium,
    color: colors.mutedForeground,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  dividerGold: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    lineHeight: 26,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.primaryMedium,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  infoValueLink: {
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  hoursDay: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseMedium,
    color: colors.foreground,
  },
  hoursTime: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.primary,
    color: colors.foreground,
  },
  hoursTimeClosed: {
    color: colors.mutedForeground,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  appVersion: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.primary,
    color: colors.mutedForeground,
  },
  appCopyright: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.secondary,
    color: colors.mutedForeground,
  },
});
