/**
 * In-app notification types. Mirrors the backend `Notification` / `NotificationResponse`.
 * Named `AppNotification` to avoid clashing with the browser's global `Notification`.
 */
export type NotificationType = 'BID_ACCEPTED' | 'BID_REJECTED' | 'MISSION_OVERDUE';

/** Accent colour per type — matches the mission/email palette. */
export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  BID_ACCEPTED: '#12a06a',
  BID_REJECTED: '#e04a3f',
  MISSION_OVERDUE: '#d9860a'
};

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  missionId?: number | null;
  read: boolean;
  /** ISO-8601 string. */
  createdAt: string;
}
