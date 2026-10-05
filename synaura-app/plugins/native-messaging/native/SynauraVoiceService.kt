package com.synaura.music

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

// Started only by the explicit accept/call gesture after RECORD_AUDIO permission.
// This maintains an already joined call; it does not impersonate incoming push.
class SynauraVoiceService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val manager = getSystemService(NotificationManager::class.java)
    val channel = "synaura-voice-session"
    if (Build.VERSION.SDK_INT >= 26) {
      manager.createNotificationChannel(NotificationChannel(channel, "Appel en cours", NotificationManager.IMPORTANCE_LOW).apply {
        setSound(null, null); enableVibration(false); description = "Retourner à ton appel Synaura"
      })
    }
    val open = packageManager.getLaunchIntentForPackage(packageName)?.apply { addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP) }
    val pending = open?.let { PendingIntent.getActivity(this, 418, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, channel) else Notification.Builder(this)
    val notification = builder.setSmallIcon(android.R.drawable.sym_action_call)
      .setContentTitle("Appel Synaura en cours").setContentText("Toucher pour revenir à l’appel")
      .setCategory(Notification.CATEGORY_CALL).setOngoing(true).setContentIntent(pending)
      .setVisibility(Notification.VISIBILITY_PRIVATE).build()
    if (Build.VERSION.SDK_INT >= 29) startForeground(418, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
    else startForeground(418, notification)
    if (wakeLock == null) {
      val power = getSystemService(POWER_SERVICE) as PowerManager
      wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Synaura:VoiceCall").apply { acquire(2 * 60 * 60 * 1000L) }
    }
    return START_NOT_STICKY
  }
  override fun onTaskRemoved(rootIntent: Intent?) { stopSelf(); super.onTaskRemoved(rootIntent) }
  override fun onDestroy() {
    wakeLock?.let { if (it.isHeld) it.release() }; wakeLock = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
}
