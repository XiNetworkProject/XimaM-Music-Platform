import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { handleMessageNotificationAction } from '@/notifications/messageNotificationReply';
import { handleCallNotificationResponse } from './callNotificationActions';

const BACKGROUND_NOTIFICATION_TASK = 'synaura_background_notifications';

if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
    if (error || !data || !('actionIdentifier' in data)) return;
    try {
      if (!await handleCallNotificationResponse(data)) await handleMessageNotificationAction(data);
    } catch {
      await Notifications.scheduleNotificationAsync({content:{title:'Action non envoyée',body:'Rouvre Synaura pour vérifier la connexion et réessayer.',data:{url:'/messages'}},trigger:null});
    }
  });
}

void Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {});
