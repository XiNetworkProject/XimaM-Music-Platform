package com.synaura.music

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.core.app.NotificationCompat
import kotlin.math.abs

class SynauraBubbleService : Service() {
  companion object {
    const val EXTRA_CONVERSATION_ID = "conversationId"
    const val EXTRA_TITLE = "title"
    const val EXTRA_ACCENT = "accent"
    private const val CHANNEL_ID = "synaura-floating-chat"
    private const val NOTIFICATION_ID = 73057
  }

  private lateinit var windowManager: WindowManager
  private var bubbleView: View? = null
  private var conversationId = ""
  private var conversationTitle = "Discussion Synaura"
  private var accentColor = "#7357C6"

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val preferences = getSharedPreferences("synaura_bubble", MODE_PRIVATE)
    conversationId = intent?.getStringExtra(EXTRA_CONVERSATION_ID)
      ?: preferences.getString(EXTRA_CONVERSATION_ID, "").orEmpty()
    conversationTitle = intent?.getStringExtra(EXTRA_TITLE)
      ?: preferences.getString(EXTRA_TITLE, "Discussion Synaura").orEmpty()
    accentColor = intent?.getStringExtra(EXTRA_ACCENT)
      ?: preferences.getString(EXTRA_ACCENT, "#7357C6").orEmpty()
    if (conversationId.isBlank() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this))) {
      stopSelf()
      return START_NOT_STICKY
    }
    preferences.edit()
      .putString(EXTRA_CONVERSATION_ID, conversationId)
      .putString(EXTRA_TITLE, conversationTitle)
      .putString(EXTRA_ACCENT, accentColor)
      .apply()
    startForeground(NOTIFICATION_ID, createNotification())
    showBubble()
    return START_STICKY
  }

  override fun onDestroy() {
    bubbleView?.let { runCatching { windowManager.removeView(it) } }
    bubbleView = null
    super.onDestroy()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, "Bulle de discussion", NotificationManager.IMPORTANCE_LOW)
    channel.description = "Raccourci flottant volontaire vers une discussion Synaura"
    channel.setShowBadge(false)
    (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
  }

  private fun createNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
    .setSmallIcon(R.drawable.notification_icon)
    .setContentTitle(conversationTitle)
    .setContentText("Bulle de discussion active")
    .setContentIntent(conversationIntent())
    .setOngoing(true)
    .setSilent(true)
    .build()

  private fun conversationIntent(): PendingIntent {
    val intent = Intent(this, MainActivity::class.java)
      .setAction(Intent.ACTION_VIEW)
      .setData(Uri.parse("synaura://messages/" + Uri.encode(conversationId)))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(this, 17, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun showBubble() {
    bubbleView?.let { runCatching { windowManager.removeView(it) } }
    val size = dp(68)
    val root = FrameLayout(this)
    root.elevation = dp(12).toFloat()
    val background = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(runCatching { Color.parseColor(accentColor) }.getOrDefault(Color.rgb(115, 87, 198)))
      setStroke(dp(2), Color.argb(220, 247, 246, 243))
    }
    root.background = background

    val icon = ImageView(this).apply {
      setImageResource(applicationInfo.icon)
      scaleType = ImageView.ScaleType.CENTER_INSIDE
      setPadding(dp(13), dp(13), dp(13), dp(13))
    }
    root.addView(icon, FrameLayout.LayoutParams(size, size))

    val close = TextView(this).apply {
      text = "x"
      textSize = 14f
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      val closeBackground = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.rgb(17, 17, 17))
      }
      setBackground(closeBackground)
      setOnClickListener { stopSelf() }
    }
    root.addView(close, FrameLayout.LayoutParams(dp(22), dp(22), Gravity.TOP or Gravity.END))

    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
    val params = WindowManager.LayoutParams(
      size,
      size,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = resources.displayMetrics.widthPixels - size - dp(14)
      y = dp(180)
    }

    root.setOnTouchListener(object : View.OnTouchListener {
      var initialX = 0
      var initialY = 0
      var downX = 0f
      var downY = 0f

      override fun onTouch(view: View, event: MotionEvent): Boolean {
        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            initialX = params.x
            initialY = params.y
            downX = event.rawX
            downY = event.rawY
            return true
          }
          MotionEvent.ACTION_MOVE -> {
            params.x = initialX + (event.rawX - downX).toInt()
            params.y = initialY + (event.rawY - downY).toInt()
            runCatching { windowManager.updateViewLayout(root, params) }
            return true
          }
          MotionEvent.ACTION_UP -> {
            val moved = abs(event.rawX - downX) + abs(event.rawY - downY)
            if (moved < dp(12)) conversationIntent().send()
            else {
              val screenWidth = resources.displayMetrics.widthPixels
              params.x = if (params.x + size / 2 < screenWidth / 2) dp(10) else screenWidth - size - dp(10)
              runCatching { windowManager.updateViewLayout(root, params) }
            }
            return true
          }
        }
        return false
      }
    })

    windowManager.addView(root, params)
    bubbleView = root
  }

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
