import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@synaura.fr';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export type NotifCategory =
  | 'social'
  | 'music'
  | 'message'
  | 'milestone'
  | 'boost'
  | 'admin'
  | 'general';

export type NotifType =
  | 'new_follower'
  | 'new_like'
  | 'like_milestone'
  | 'new_comment'
  | 'new_message'
  | 'new_track_followed'
  | 'view_milestone'
  | 'boost_reminder'
  | 'admin_broadcast'
  | 'weekly_recap'
  | 'general';

const TYPE_TO_CATEGORY: Record<NotifType, NotifCategory> = {
  new_follower: 'social',
  new_like: 'social',
  like_milestone: 'milestone',
  new_comment: 'social',
  new_message: 'message',
  new_track_followed: 'music',
  view_milestone: 'milestone',
  boost_reminder: 'boost',
  admin_broadcast: 'admin',
  weekly_recap: 'general',
  general: 'general',
};

const TYPE_TO_PREF_KEY: Record<NotifType, string> = {
  new_follower: 'new_follower',
  new_like: 'new_like',
  like_milestone: 'like_milestone',
  new_comment: 'new_comment',
  new_message: 'new_message',
  new_track_followed: 'new_track_followed',
  view_milestone: 'view_milestone',
  boost_reminder: 'boost_reminder',
  admin_broadcast: 'admin_broadcast',
  weekly_recap: 'weekly_recap',
  general: 'admin_broadcast',
};

interface CreateNotificationOpts {
  userId: string;
  type: NotifType;
  title: string;
  message: string;
  actionUrl?: string;
  iconUrl?: string;
  senderId?: string;
  relatedId?: string;
  data?: Record<string, any>;
  skipPrefCheck?: boolean;
}

async function getUserPrefs(userId: string) {
  try {
    const { data } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function createNotification(opts: CreateNotificationOpts) {
  const {
    userId, type, title, message,
    actionUrl, iconUrl, senderId, relatedId, data,
    skipPrefCheck,
  } = opts;

  if (!skipPrefCheck) {
    const prefs = await getUserPrefs(userId);
    if (prefs) {
      const prefKey = TYPE_TO_PREF_KEY[type];
      if (prefKey && prefs[prefKey] === false) return null;
      if (prefs.in_app_enabled === false) return null;
    }
  }

  const category = TYPE_TO_CATEGORY[type] || 'general';

  const { data: notif, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      category,
      action_url: actionUrl || null,
      icon_url: iconUrl || null,
      sender_id: senderId || null,
      related_id: relatedId || null,
      data: data || {},
      is_read: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[notifications] insert error:', error);
    return null;
  }

  sendPushInBackground(userId, type, title, message, actionUrl);

  return notif;
}

async function sendPushInBackground(
  userId: string,
  type: NotifType,
  title: string,
  body: string,
  url?: string,
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  try {
    const prefs = await getUserPrefs(userId);
    if (prefs?.push_enabled === false) return;

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (!subs?.length) return;

    const payload = JSON.stringify({
      title,
      body,
      icon: '/synaura_symbol.svg',
      badge: '/synaura_symbol.svg',
      url: url || '/',
      tag: `synaura-${type}-${Date.now()}`,
      data: { type },
    });

    const expired: string[] = [];
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400 },
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expired.push(sub.endpoint);
        }
      }
    }

    if (expired.length) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .in('endpoint', expired);
    }
  } catch (e) {
    console.error('[notifications] push error:', e);
  }
}

export async function createBroadcast(opts: {
  adminId: string;
  title: string;
  message: string;
  target?: 'all' | 'premium' | 'artists';
  category?: string;
}) {
  const { adminId, title, message, target = 'all', category = 'announcement' } = opts;

  let query = supabaseAdmin.from('profiles').select('id');
  if (target === 'premium') {
    query = query.in('subscription_tier', ['premium', 'pro']);
  } else if (target === 'artists') {
    query = query.eq('is_artist', true);
  }

  const { data: users } = await query;
  if (!users?.length) return { sent: 0 };

  const { data: broadcast } = await supabaseAdmin
    .from('admin_broadcasts')
    .insert({
      admin_id: adminId,
      title,
      message,
      category,
      target,
      sent_count: users.length,
    })
    .select('id')
    .single();

  const batchSize = 50;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const inserts = batch.map(u => ({
      user_id: u.id,
      type: 'admin_broadcast',
      title,
      message,
      category: 'admin',
      data: { broadcast_id: broadcast?.id },
      is_read: false,
    }));

    await supabaseAdmin.from('notifications').insert(inserts);

    for (const u of batch) {
      sendPushInBackground(u.id, 'admin_broadcast', title, message);
    }
  }

  return { sent: users.length, broadcastId: broadcast?.id };
}

// ─── Trigger helpers ───────────────────────────────────────────

export async function notifyNewFollower(followerId: string, followedId: string, followerName: string) {
  return createNotification({
    userId: followedId,
    type: 'new_follower',
    title: 'Nouvel abonne',
    message: `${followerName} a commence a te suivre`,
    actionUrl: `/profile/${followerName}`,
    senderId: followerId,
  });
}

export async function notifyNewLike(likerId: string, trackOwnerId: string, likerName: string, trackTitle: string, trackId: string) {
  return createNotification({
    userId: trackOwnerId,
    type: 'new_like',
    title: 'Nouveau like',
    message: `${likerName} a aime "${trackTitle}"`,
    actionUrl: `/track/${trackId}`,
    senderId: likerId,
    relatedId: trackId,
  });
}

export async function notifyLikeMilestone(userId: string, trackTitle: string, count: number, trackId: string) {
  return createNotification({
    userId,
    type: 'like_milestone',
    title: `${count} likes !`,
    message: `"${trackTitle}" a atteint ${count} likes`,
    actionUrl: `/track/${trackId}`,
    relatedId: trackId,
  });
}

export async function notifyNewComment(commenterId: string, trackOwnerId: string, commenterName: string, trackTitle: string, trackId: string) {
  return createNotification({
    userId: trackOwnerId,
    type: 'new_comment',
    title: 'Nouveau commentaire',
    message: `${commenterName} a commente "${trackTitle}"`,
    actionUrl: `/track/${trackId}`,
    senderId: commenterId,
    relatedId: trackId,
  });
}

export async function notifyNewTrackFromFollowed(followerId: string, artistName: string, trackTitle: string, trackId: string, artistId: string) {
  return createNotification({
    userId: followerId,
    type: 'new_track_followed',
    title: 'Nouvelle musique',
    message: `${artistName} a publie "${trackTitle}"`,
    actionUrl: `/track/${trackId}`,
    senderId: artistId,
    relatedId: trackId,
  });
}

export async function notifyViewMilestone(userId: string, trackTitle: string, count: number, trackId: string) {
  return createNotification({
    userId,
    type: 'view_milestone',
    title: `${count} ecoutes !`,
    message: `"${trackTitle}" a atteint ${count} ecoutes`,
    actionUrl: `/track/${trackId}`,
    relatedId: trackId,
  });
}

export async function notifyNewMessage(senderId: string, recipientId: string, senderName: string) {
  return createNotification({
    userId: recipientId,
    type: 'new_message',
    title: 'Nouveau message',
    message: `${senderName} t'a envoye un message`,
    actionUrl: '/messages',
    senderId,
  });
}

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export function checkMilestone(count: number): number | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (count === MILESTONES[i]) return MILESTONES[i];
  }
  return null;
}
