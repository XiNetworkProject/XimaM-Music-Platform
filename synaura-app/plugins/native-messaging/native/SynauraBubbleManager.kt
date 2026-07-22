package com.synaura.music

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.content.LocusIdCompat
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.absoluteValue

object SynauraBubbleManager {
  const val PREFERENCES_NAME = "synaura_bubble_v2"
  const val EXTRA_ENABLED = "enabled"
  const val EXTRA_CONVERSATION_ID = "conversationId"
  const val EXTRA_TITLE = "title"
  const val EXTRA_ACCENT = "accent"
  const val EXTRA_AVATAR_URL = "avatarUrl"
  const val EXTRA_MESSAGES_JSON = "messagesJson"
  private const val CHANNEL_ID = "synaura-conversations"
  private val avatarExecutor = Executors.newSingleThreadExecutor()

  fun isSupported() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q

  fun canUse(context: Context): Boolean {
    if (!isSupported() || !NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).areBubblesAllowed()
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val channel = (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).getNotificationChannel(CHANNEL_ID)
      return channel?.canBubble() ?: true
    }
    return false
  }

  fun openSettings(context: Context) {
    createChannel(context)
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      Intent(Settings.ACTION_APP_NOTIFICATION_BUBBLE_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    } else {
      Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  fun configure(context: Context, enabled: Boolean, conversationId: String, title: String, accentColor: String, avatarUrl: String) {
    preferences(context).edit()
      .putBoolean(EXTRA_ENABLED, enabled)
      .putString(EXTRA_CONVERSATION_ID, conversationId)
      .putString(EXTRA_TITLE, title)
      .putString(EXTRA_ACCENT, accentColor)
      .putString(EXTRA_AVATAR_URL, avatarUrl)
      .apply()
    if (!enabled) hide(context, conversationId)
  }

  fun showConfigured(context: Context): Boolean {
    val values = preferences(context)
    if (!values.getBoolean(EXTRA_ENABLED, false)) return false
    val conversationId = values.getString(EXTRA_CONVERSATION_ID, "").orEmpty()
    if (conversationId.isBlank()) return false
    return show(
      context,
      conversationId,
      values.getString(EXTRA_TITLE, "Discussion Synaura").orEmpty(),
      values.getString(EXTRA_ACCENT, "#7357C6").orEmpty(),
      values.getString(EXTRA_AVATAR_URL, "").orEmpty(),
      values.getString(EXTRA_MESSAGES_JSON, "[]").orEmpty(),
    )
  }

  fun show(context: Context, conversationId: String, title: String, accentColor: String, avatarUrl: String, messagesJson: String): Boolean {
    if (!isSupported() || conversationId.isBlank()) return false
    createChannel(context)
    preferences(context).edit()
      .putString(EXTRA_CONVERSATION_ID, conversationId)
      .putString(EXTRA_TITLE, title)
      .putString(EXTRA_ACCENT, accentColor)
      .putString(EXTRA_AVATAR_URL, avatarUrl)
      .putString(EXTRA_MESSAGES_JSON, messagesJson)
      .apply()

    val iconFile = avatarFile(context, conversationId)
    val avatar = BitmapFactory.decodeFile(iconFile.absolutePath) ?: fallbackAvatar(title, accentColor)
    postNotification(context, conversationId, title, accentColor, avatarUrl, messagesJson, avatar)

    if (avatarUrl.startsWith("https://") && !iconFile.exists()) {
      avatarExecutor.execute {
        val downloaded = downloadAvatar(avatarUrl) ?: return@execute
        runCatching { FileOutputStream(iconFile).use { downloaded.compress(Bitmap.CompressFormat.PNG, 92, it) } }
        runCatching { postNotification(context, conversationId, title, accentColor, avatarUrl, messagesJson, downloaded) }
      }
    }
    return true
  }

  fun hide(context: Context, conversationId: String? = null) {
    val id = conversationId?.takeIf { it.isNotBlank() }
      ?: preferences(context).getString(EXTRA_CONVERSATION_ID, "").orEmpty()
    if (id.isNotBlank()) NotificationManagerCompat.from(context).cancel(notificationId(id))
  }

  private fun postNotification(context: Context, conversationId: String, title: String, accentColor: String, avatarUrl: String, messagesJson: String, avatar: Bitmap) {
    val shortcutId = "synaura-conversation-${conversationId.hashCode().absoluteValue}"
    val avatarIcon = IconCompat.createWithAdaptiveBitmap(avatar)
    val peer = Person.Builder().setName(title.ifBlank { "Discussion Synaura" }).setKey(conversationId).setIcon(avatarIcon).build()
    val shortcut = ShortcutInfoCompat.Builder(context, shortcutId)
      .setShortLabel(title.ifBlank { "Discussion Synaura" }.take(40))
      .setLongLived(true)
      .setIcon(avatarIcon)
      .setPerson(peer)
      .setLocusId(LocusIdCompat(conversationId))
      .setIntent(mainConversationIntent(context, conversationId))
      .build()
    runCatching { ShortcutManagerCompat.pushDynamicShortcut(context, shortcut) }

    val style = NotificationCompat.MessagingStyle(Person.Builder().setName("Vous").setKey("self").build())
      .setConversationTitle(title)
      .setGroupConversation(false)
    val messages = runCatching { JSONArray(messagesJson) }.getOrElse { JSONArray() }
    val start = (messages.length() - 8).coerceAtLeast(0)
    for (index in start until messages.length()) {
      val value = messages.optJSONObject(index) ?: continue
      val sender = if (value.optBoolean("own", false)) null else Person.Builder()
        .setName(value.optString("senderName", title))
        .setKey(value.optString("senderId", conversationId))
        .build()
      val timestamp = parseTimestamp(value.optString("createdAt"))
      style.addMessage(value.optString("content", "Message"), timestamp, sender)
    }
    if (messages.length() == 0) style.addMessage("Ouvrir la discussion", System.currentTimeMillis(), peer)

    val bubbleIntent = Intent(context, SynauraBubbleActivity::class.java)
      .setAction(Intent.ACTION_VIEW)
      .setData(Uri.parse("synaura-bubble://conversation/${Uri.encode(conversationId)}"))
      .putExtra(EXTRA_CONVERSATION_ID, conversationId)
      .putExtra(EXTRA_TITLE, title)
      .putExtra(EXTRA_ACCENT, accentColor)
      .putExtra(EXTRA_AVATAR_URL, avatarUrl)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_DOCUMENT or Intent.FLAG_ACTIVITY_MULTIPLE_TASK)
    val mutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
    val bubblePendingIntent = PendingIntent.getActivity(context, notificationId(conversationId), bubbleIntent, PendingIntent.FLAG_UPDATE_CURRENT or mutableFlag)
    val bubble = NotificationCompat.BubbleMetadata.Builder(bubblePendingIntent, avatarIcon)
      .setDesiredHeight(640)
      .setAutoExpandBubble(false)
      .setSuppressNotification(false)
      .build()

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.notification_icon)
      .setColor(parseColor(accentColor))
      .setContentTitle(title)
      .setContentText(messages.optJSONObject(messages.length() - 1)?.optString("content") ?: "Discussion Synaura")
      .setContentIntent(mainConversationPendingIntent(context, conversationId))
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setStyle(style)
      .setShortcutId(shortcutId)
      .setLocusId(LocusIdCompat(conversationId))
      .setBubbleMetadata(bubble)
      .setAutoCancel(false)
      .setOnlyAlertOnce(true)
      .build()
    NotificationManagerCompat.from(context).notify(notificationId(conversationId), notification)
  }

  private fun createChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = manager.getNotificationChannel(CHANNEL_ID) ?: NotificationChannel(CHANNEL_ID, "Conversations Synaura", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Messages et bulles de conversation Synaura"
      setShowBadge(true)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) setAllowBubbles(true)
    }
    manager.createNotificationChannel(channel)
  }

  private fun mainConversationIntent(context: Context, conversationId: String) = Intent(context, MainActivity::class.java)
    .setAction(Intent.ACTION_VIEW)
    .setData(Uri.parse("synaura://messages/${Uri.encode(conversationId)}"))
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)

  private fun mainConversationPendingIntent(context: Context, conversationId: String): PendingIntent = PendingIntent.getActivity(
    context,
    notificationId(conversationId) + 1,
    mainConversationIntent(context, conversationId),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  private fun preferences(context: Context) = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
  private fun notificationId(conversationId: String) = 73000 + (conversationId.hashCode().absoluteValue % 900)
  private fun avatarFile(context: Context, conversationId: String) = File(context.cacheDir, "bubble-avatar-${conversationId.hashCode().absoluteValue}.png")
  private fun parseColor(value: String) = runCatching { Color.parseColor(value) }.getOrDefault(Color.rgb(115, 87, 198))
  private fun parseTimestamp(value: String): Long {
    if (value.isBlank()) return System.currentTimeMillis()
    val normalized = value.replace(Regex("(\\.\\d{3})\\d+(?=Z|[+-])"), "$1")
    return runCatching {
      SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US).parse(normalized)?.time
    }.getOrNull() ?: System.currentTimeMillis()
  }

  private fun fallbackAvatar(title: String, accentColor: String): Bitmap {
    val size = 192
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(parseColor(accentColor))
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      textSize = 82f
      textAlign = Paint.Align.CENTER
      typeface = Typeface.DEFAULT_BOLD
    }
    val letter = title.trim().take(1).uppercase().ifBlank { "S" }
    canvas.drawText(letter, size / 2f, size / 2f - (paint.ascent() + paint.descent()) / 2f, paint)
    return bitmap
  }

  private fun downloadAvatar(url: String): Bitmap? = runCatching {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 5_000
    connection.readTimeout = 7_000
    connection.instanceFollowRedirects = true
    connection.connect()
    connection.inputStream.use { BitmapFactory.decodeStream(it) }
  }.getOrNull()
}
