import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { handleMessageNotificationAction } from '@/notifications/messageNotificationReply';

const BACKGROUND_NOTIFICATION_TASK = 'synaura_background_notifications';

if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
    if (error || !data || !('actionIdentifier' in data)) return;
    await handleMessageNotificationAction(data).catch(() => {});
  });
}

void Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {});
