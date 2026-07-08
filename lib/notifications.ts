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
  | 'general'
  | 'post_like'
  | 'post_comment'
  | 'clip_used_source'
  | 'remix_pending_approval'
  | 'remix_approved'
  | 'remix_rejected';

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
  post_like: 'social',
  post_comment: 'social',
  clip_used_source: 'music',
  remix_pending_approval: 'music',
  remix_approved: 'music',
  remix_rejected: 'music',
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
  post_like: 'new_like',
  post_comment: 'new_comment',
  // Pas de colonne preference dediee pour ces types V1 : cle non presente dans
  // notification_preferences => jamais bloque (comportement permissif par defaut,
  // voir createNotification qui ignore une prefKey sans colonne correspondante).
  clip_used_source: 'clip_used_source',
  remix_pending_approval: 'remix_pending_approval',
  remix_approved: 'remix_approved',
  remix_rejected: 'remix_rejected',
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
  /**
   * Idempotence : si vrai, ne cree pas de nouvelle ligne si une notification du
   * meme type + meme related_id existe deja pour ce destinataire (retry reseau,
   * double appel). N'affecte que les appelants qui l'activent explicitement -
   * ne change rien au comportement des triggers existants (follow/like/comment).
   */
  dedupeOnRelatedId?: boolean;
}

async function getUserPrefs(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function createNotification(opts: CreateNotificationOpts) {
  const {
    userId, type, title, message,
    actionUrl, iconUrl, senderId, relatedId, data,
    skipPrefCheck, dedupeOnRelatedId,
  } = opts;

  if (dedupeOnRelatedId && relatedId) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('related_id', relatedId)
        .limit(1)
        .maybeSingle();
      if (existing) return existing;
    } catch {}
  }

  const prefs = !skipPrefCheck ? await getUserPrefs(userId) : null;
  if (prefs) {
    const prefKey = TYPE_TO_PREF_KEY[type];
    if (prefKey && prefs[prefKey] === false) return null;
  }

  const category = TYPE_TO_CATEGORY[type] || 'general';
  const shouldInsertInApp = prefs?.in_app_enabled !== false;

  if (!shouldInsertInApp) {
    sendPushInBackground(userId, type, title, message, actionUrl);
    return { pushOnly: true };
  }

  const extendedData = {
    ...(data || {}),
    category,
    action_url: actionUrl || null,
    icon_url: iconUrl || null,
    sender_id: senderId || null,
    related_id: relatedId || null,
  };

  // Essayer l'insert avec le schema etendu d'abord
  let notif: any = null;
  let insertError: any = null;

  const { data: result1, error: err1 } = await supabaseAdmin
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

  if (err1) {
    // Fallback: schema de base (sans les colonnes etendues)
    console.warn('[notifications] extended insert failed, trying base schema:', err1.message);
    const { data: result2, error: err2 } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data: extendedData,
        is_read: false,
      })
      .select('id')
      .single();

    if (err2) {
      console.error('[notifications] base insert also failed:', err2.message);
      insertError = err2;
    } else {
      notif = result2;
    }
  } else {
    notif = result1;
  }

  if (insertError || !notif) {
    console.error('[notifications] all insert attempts failed for user', userId);
    // Toujours envoyer le push meme si le DB insert echoue
    sendPushInBackground(userId, type, title, message, actionUrl);
    return null;
  }

  console.log('[notifications] created:', { id: notif.id, type, userId: userId.slice(0, 8) });
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
  try {
    const prefs = await getUserPrefs(userId);
    if (prefs?.push_enabled === false) return;

    await Promise.allSettled([
      sendWebPush(userId, type, title, body, url),
      sendNativePush(userId, type, title, body, url),
    ]);
  } catch (e) {
    console.error('[notifications] push error:', e);
  }
}

async function sendWebPush(userId: string, type: NotifType, title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .neq('p256dh', 'expo');
  if (!subs?.length) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: '/brand/2026/synaura-symbol-2026-white.png',
    badge: '/brand/2026/synaura-symbol-2026-white.png',
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
      } else {
        console.warn('[notifications] web push failed:', err?.statusCode || err?.message);
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
}

async function sendNativePush(userId: string, type: NotifType, title: string, body: string, url?: string) {
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint')
    .eq('user_id', userId)
    .eq('p256dh', 'expo');
  if (error || !subscriptions?.length) return;

  const tokens = subscriptions.map((entry) => entry.endpoint).filter(Boolean);
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tokens.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      priority: 'high',
      channelId: 'synaura-activity',
      data: { type, url: url || '/notifications' },
    }))),
  });
  if (!response.ok) {
    console.warn('[notifications] native push service failed:', response.status);
    return;
  }

  const payload = await response.json().catch(() => null);
  const tickets = Array.isArray(payload?.data) ? payload.data : [payload?.data];
  const expired = tickets
    .map((ticket: any, index: number) => ticket?.details?.error === 'DeviceNotRegistered' ? tokens[index] : null)
    .filter(Boolean);
  if (expired.length) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('p256dh', 'expo')
      .in('endpoint', expired);
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

  const { data: users, error: usersErr } = await query;
  if (usersErr) {
    console.error('[broadcast] users query error:', usersErr.message);
    return { sent: 0, error: usersErr.message };
  }
  if (!users?.length) return { sent: 0 };

  // Tenter d'enregistrer le broadcast (table peut ne pas exister)
  let broadcastId: string | null = null;
  try {
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
    broadcastId = broadcast?.id || null;
  } catch (e) {
    console.warn('[broadcast] admin_broadcasts table may not exist, continuing without logging');
  }

  let successCount = 0;
  const batchSize = 50;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    for (const u of batch) {
      const result = await createNotification({
        userId: u.id,
        type: 'admin_broadcast',
        title,
        message,
        data: broadcastId ? { broadcast_id: broadcastId } : {},
        skipPrefCheck: false,
      });
      if (result) successCount++;
    }
  }

  console.log(`[broadcast] sent to ${successCount}/${users.length} users`);
  return { sent: successCount, broadcastId };
}

// ─── Trigger helpers ───────────────────────────────────────────

export async function notifyNewFollower(followerId: string, followedId: string, followerName: string, followerUsername?: string | null) {
  return createNotification({
    userId: followedId,
    type: 'new_follower',
    title: 'Nouvel abonne',
    message: `${followerName} a commence a te suivre`,
    actionUrl: `/profile/${encodeURIComponent(followerUsername || followerName)}`,
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

export async function notifyPostLike(likerId: string, postOwnerId: string, likerName: string, postId: string) {
  return createNotification({
    userId: postOwnerId,
    type: 'post_like',
    title: 'Nouveau like',
    message: `${likerName} a aimé ton post`,
    actionUrl: `/posts/${postId}`,
    senderId: likerId,
    relatedId: postId,
  });
}

export async function notifyPostComment(commenterId: string, postOwnerId: string, commenterName: string, postId: string) {
  return createNotification({
    userId: postOwnerId,
    type: 'post_comment',
    title: 'Nouveau commentaire',
    message: `${commenterName} a commenté ton post`,
    actionUrl: `/posts/${postId}`,
    senderId: commenterId,
    relatedId: postId,
  });
}

export async function notifyForumPostLike(likerId: string, postOwnerId: string, likerName: string, postId: string, postTitle?: string | null) {
  return createNotification({
    userId: postOwnerId,
    type: 'post_like',
    title: 'Nouveau like forum',
    message: `${likerName} a aime ton sujet${postTitle ? ` "${postTitle}"` : ''}`,
    actionUrl: `/community/forum/${postId}`,
    senderId: likerId,
    relatedId: postId,
    data: { surface: 'community_forum' },
  });
}

export async function notifyForumPostReply(replierId: string, postOwnerId: string, replierName: string, postId: string, postTitle?: string | null) {
  return createNotification({
    userId: postOwnerId,
    type: 'post_comment',
    title: 'Nouvelle reponse forum',
    message: `${replierName} a repondu a ton sujet${postTitle ? ` "${postTitle}"` : ''}`,
    actionUrl: `/community/forum/${postId}`,
    senderId: replierId,
    relatedId: postId,
    data: { surface: 'community_forum' },
  });
}

export async function notifyClipUsedSource(
  clipCreatorId: string,
  sourceOwnerId: string,
  clipCreatorName: string,
  clipId: string,
  sourceTrackUrl: string,
) {
  if (!sourceOwnerId || sourceOwnerId === clipCreatorId) return null;
  return createNotification({
    userId: sourceOwnerId,
    type: 'clip_used_source',
    title: 'Ton son a été utilisé',
    message: `${clipCreatorName} a utilisé ton son dans un Clip`,
    actionUrl: sourceTrackUrl,
    senderId: clipCreatorId,
    relatedId: clipId,
    dedupeOnRelatedId: true,
  });
}

export async function notifyRemixPendingApproval(sourceOwnerId: string, remixId: string, actionUrl: string) {
  if (!sourceOwnerId) return null;
  return createNotification({
    userId: sourceOwnerId,
    type: 'remix_pending_approval',
    title: 'Validation demandée',
    message: 'Une variation attend ta validation',
    actionUrl,
    relatedId: remixId,
    dedupeOnRelatedId: true,
  });
}

export async function notifyRemixApproved(remixCreatorId: string, remixId: string, actionUrl: string) {
  if (!remixCreatorId) return null;
  return createNotification({
    userId: remixCreatorId,
    type: 'remix_approved',
    title: 'Variation acceptée',
    message: 'Ta variation a été acceptée',
    actionUrl,
    relatedId: remixId,
    dedupeOnRelatedId: true,
  });
}

export async function notifyRemixRejected(remixCreatorId: string, remixId: string, actionUrl: string) {
  if (!remixCreatorId) return null;
  return createNotification({
    userId: remixCreatorId,
    type: 'remix_rejected',
    title: 'Variation refusée',
    message: "Ta variation n'a pas été acceptée",
    actionUrl,
    relatedId: remixId,
    dedupeOnRelatedId: true,
  });
}

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export function checkMilestone(count: number): number | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (count === MILESTONES[i]) return MILESTONES[i];
  }
  return null;
}
