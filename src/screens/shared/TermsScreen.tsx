import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';

export const TermsScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>服務條款</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>最後更新日期：2026 年 2 月 6 日</Text>

        <Text style={styles.sectionTitle}>1. 服務說明</Text>
        <Text style={styles.bodyText}>
          AZ Barber App（以下簡稱「本 App」）由 AZ Barber Shop 提供，用於線上預約理髮服務。使用本 App 即表示您同意遵守以下條款。
        </Text>

        <Text style={styles.sectionTitle}>2. 帳號註冊</Text>
        <Text style={styles.bodyText}>
          • 您可透過電子郵件、Apple、Google 或 LINE 帳號註冊
          {'\n'}• 您有責任保管好您的帳號安全
          {'\n'}• 每人僅限註冊一個帳號
          {'\n'}• 您提供的資料應為真實且正確
        </Text>

        <Text style={styles.sectionTitle}>3. 預約規範</Text>
        <Text style={styles.bodyText}>
          • 預約成功後，請準時到店
          {'\n'}• 如需取消或更改預約，請至少提前 2 小時操作
          {'\n'}• 連續未到（No-show）可能導致帳號被暫停預約功能
          {'\n'}• 預約時段以系統顯示的可用時間為準
        </Text>

        <Text style={styles.sectionTitle}>4. AI 預約助理</Text>
        <Text style={styles.bodyText}>
          • 本 App 提供 AI 預約助理「小安」，協助您查詢資訊及完成預約
          {'\n'}• AI 助理的回覆僅供參考，實際服務內容以店內為準
          {'\n'}• AI 助理使用第三方 AI 技術（OpenAI），您的對話內容將被傳送處理
          {'\n'}• 請勿在對話中提供敏感個人資訊（如身分證號、信用卡號）
        </Text>

        <Text style={styles.sectionTitle}>5. 使用者行為</Text>
        <Text style={styles.bodyText}>
          使用本 App 時，您同意不得：
          {'\n\n'}• 惡意佔用預約時段
          {'\n'}• 利用系統漏洞進行不當操作
          {'\n'}• 騷擾其他使用者或店家人員
          {'\n'}• 使用自動化工具大量操作
        </Text>

        <Text style={styles.sectionTitle}>6. 智慧財產權</Text>
        <Text style={styles.bodyText}>
          本 App 的所有內容，包括但不限於文字、圖片、介面設計、商標等，均為 AZ Barber Shop 或其授權方所有，受著作權法保護。
        </Text>

        <Text style={styles.sectionTitle}>7. 免責聲明</Text>
        <Text style={styles.bodyText}>
          • 本 App 依「現況」提供服務，不保證不會中斷或無錯誤
          {'\n'}• 因不可抗力（如網路故障、系統維護）導致的服務中斷，我們不承擔責任
          {'\n'}• AI 助理的建議不構成專業意見
        </Text>

        <Text style={styles.sectionTitle}>8. 帳號終止</Text>
        <Text style={styles.bodyText}>
          • 您可隨時透過 App 刪除您的帳號
          {'\n'}• 我們保留因違反條款而暫停或終止帳號的權利
          {'\n'}• 帳號刪除後，所有資料將被永久移除
        </Text>

        <Text style={styles.sectionTitle}>9. 條款修改</Text>
        <Text style={styles.bodyText}>
          我們保留修改本服務條款的權利。重大變更將透過 App 通知您。繼續使用本 App 即表示您同意修改後的條款。
        </Text>

        <Text style={styles.sectionTitle}>10. 聯絡我們</Text>
        <Text style={styles.bodyText}>
          如有任何關於服務條款的問題，請透過以下方式聯絡我們：
          {'\n\n'}電話：02-2586-7077
          {'\n'}Instagram：@az_barber_shop2019
          {'\n'}地址：台北市大同區民權西路 9 巷 22 號 1 樓
        </Text>

        <View style={styles.bottomSpacer} />
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
    padding: spacing.lg,
  },
  lastUpdated: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.chineseSemiBold,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.chinese,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
