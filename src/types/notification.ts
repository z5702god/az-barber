/**
 * 通知類型定義
 */

export type NotificationType =
  | 'booking_confirmed'    // 預約已確認
  | 'booking_reminder'     // 預約提醒
  | 'booking_cancelled'    // 預約已取消
  | 'booking_modified'     // 預約已修改
  | 'promotion'            // 優惠活動
  | 'announcement';        // 店家公告

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  // 關聯資料
  bookingId?: string;
  barberId?: string;
}
