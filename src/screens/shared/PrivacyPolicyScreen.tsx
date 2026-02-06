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

export const PrivacyPolicyScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>隱私權政策</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>最後更新日期：2026 年 2 月 6 日</Text>

        <Text style={styles.sectionTitle}>1. 資料蒐集</Text>
        <Text style={styles.bodyText}>
          AZ Barber App（以下簡稱「本 App」）在您使用服務時，可能蒐集以下個人資料：
          {'\n\n'}• 帳號資料：電子郵件地址、姓名、電話號碼
          {'\n'}• 第三方登入資料：透過 Apple、Google 或 LINE 登入時，取得您的公開個人資料
          {'\n'}• 預約紀錄：您的預約時間、選擇的服務項目
          {'\n'}• 裝置資訊：推播通知 token（用於發送預約提醒）
        </Text>

        <Text style={styles.sectionTitle}>2. 資料使用目的</Text>
        <Text style={styles.bodyText}>
          我們蒐集的資料僅用於以下目的：
          {'\n\n'}• 提供預約服務及管理
          {'\n'}• 發送預約確認、提醒及變更通知
          {'\n'}• AI 預約助理對話服務
          {'\n'}• 改善 App 使用體驗
          {'\n'}• 統計分析（匿名化處理）
        </Text>

        <Text style={styles.sectionTitle}>3. AI 服務說明</Text>
        <Text style={styles.bodyText}>
          本 App 提供 AI 預約助理功能，使用第三方 AI 服務（OpenAI）處理您的對話訊息。您與 AI 助理的對話內容將傳送至 OpenAI 伺服器進行處理，僅用於生成回覆，不會用於訓練 AI 模型。
        </Text>

        <Text style={styles.sectionTitle}>4. 資料儲存與安全</Text>
        <Text style={styles.bodyText}>
          • 您的資料儲存於 Supabase 雲端平台，採用業界標準的加密技術保護
          {'\n'}• 認證 token 使用裝置安全儲存空間保存
          {'\n'}• 我們不會將您的個人資料出售予第三方
        </Text>

        <Text style={styles.sectionTitle}>5. 第三方服務</Text>
        <Text style={styles.bodyText}>
          本 App 使用以下第三方服務：
          {'\n\n'}• Supabase：資料庫及使用者認證
          {'\n'}• OpenAI：AI 對話功能
          {'\n'}• Apple Sign In：Apple 帳號登入
          {'\n'}• Google Sign In：Google 帳號登入
          {'\n'}• LINE Login：LINE 帳號登入
          {'\n\n'}各第三方服務有其自身的隱私權政策，建議您詳閱相關內容。
        </Text>

        <Text style={styles.sectionTitle}>6. 您的權利</Text>
        <Text style={styles.bodyText}>
          您擁有以下權利：
          {'\n\n'}• 查閱：您可在「個人資料」頁面查看您的帳號資料
          {'\n'}• 修改：您可隨時修改您的個人資料
          {'\n'}• 刪除：您可透過 App 內的「刪除帳號」功能，永久刪除您的帳號及所有相關資料
          {'\n'}• 撤回同意：您可隨時登出或刪除帳號
        </Text>

        <Text style={styles.sectionTitle}>7. Cookie 與追蹤</Text>
        <Text style={styles.bodyText}>
          本 App 不使用 Cookie。我們不進行跨 App 追蹤。
        </Text>

        <Text style={styles.sectionTitle}>8. 兒童隱私</Text>
        <Text style={styles.bodyText}>
          本 App 不針對 13 歲以下的兒童提供服務。我們不會刻意蒐集兒童的個人資料。
        </Text>

        <Text style={styles.sectionTitle}>9. 政策變更</Text>
        <Text style={styles.bodyText}>
          我們可能不定期更新本隱私權政策。變更後的政策將在 App 內公布，繼續使用本 App 即表示您同意更新後的政策。
        </Text>

        <Text style={styles.sectionTitle}>10. 聯絡我們</Text>
        <Text style={styles.bodyText}>
          如有任何關於隱私權政策的問題，請透過以下方式聯絡我們：
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
