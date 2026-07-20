package com.synaura.music

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import kotlin.math.abs

class SynauraBubbleService : Service() {
  companion object {
    const val PREFERENCES_NAME = "synaura_bubble"
    const val ACTION_UPDATE = "com.synaura.music.BUBBLE_UPDATE"
    const val EXTRA_ENABLED = "enabled"
    const val EXTRA_CONVERSATION_ID = "conversationId"
    const val EXTRA_TITLE = "title"
    const val EXTRA_ACCENT = "accent"
    const val EXTRA_AVATAR_URL = "avatarUrl"
    const val EXTRA_MESSAGES_JSON = "messagesJson"
    private const val CHANNEL_ID = "synaura-floating-chat"
    private const val NOTIFICATION_ID = 73057
  }

  private lateinit var windowManager: WindowManager
  private var bubbleView: View? = null
  private var panelView: View? = null
  private var bubbleAvatar: ImageView? = null
  private var bubbleFallback: TextView? = null
  private var panelMessages: LinearLayout? = null
  private var panelScroll: ScrollView? = null
  private var panelStatus: TextView? = null
  private var panelInput: EditText? = null
  private var bubbleParams: WindowManager.LayoutParams? = null
  private var conversationId = ""
  private var conversationTitle = "Discussion"
  private var accentColor = "#7357C6"
  private var avatarUrl = ""
  private var messagesJson = "[]"

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val preferences = getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE)
    val enabled = intent?.getBooleanExtra(EXTRA_ENABLED, preferences.getBoolean(EXTRA_ENABLED, false))
      ?: preferences.getBoolean(EXTRA_ENABLED, false)
    conversationId = intent?.getStringExtra(EXTRA_CONVERSATION_ID)
      ?: preferences.getString(EXTRA_CONVERSATION_ID, "").orEmpty()
    conversationTitle = intent?.getStringExtra(EXTRA_TITLE)
      ?: preferences.getString(EXTRA_TITLE, "Discussion").orEmpty()
    accentColor = intent?.getStringExtra(EXTRA_ACCENT)
      ?: preferences.getString(EXTRA_ACCENT, "#7357C6").orEmpty()
    avatarUrl = intent?.getStringExtra(EXTRA_AVATAR_URL)
      ?: preferences.getString(EXTRA_AVATAR_URL, "").orEmpty()
    messagesJson = intent?.getStringExtra(EXTRA_MESSAGES_JSON)
      ?: preferences.getString(EXTRA_MESSAGES_JSON, messagesJson).orEmpty()
    if (!enabled || conversationId.isBlank() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this))) {
      stopSelf()
      return START_NOT_STICKY
    }
    preferences.edit()
      .putBoolean(EXTRA_ENABLED, true)
      .putString(EXTRA_CONVERSATION_ID, conversationId)
      .putString(EXTRA_TITLE, conversationTitle)
      .putString(EXTRA_ACCENT, accentColor)
      .putString(EXTRA_AVATAR_URL, avatarUrl)
      .putString(EXTRA_MESSAGES_JSON, messagesJson)
      .apply()
    startForeground(NOTIFICATION_ID, createNotification())
    if (bubbleView == null) showBubble() else refreshBubbleIdentity()
    if (panelView != null) renderMessages()
    return START_STICKY
  }

  override fun onDestroy() {
    panelView?.let { runCatching { windowManager.removeView(it) } }
    bubbleView?.let { runCatching { windowManager.removeView(it) } }
    panelView = null
    bubbleView = null
    super.onDestroy()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, "Bulle de discussion", NotificationManager.IMPORTANCE_LOW)
    channel.description = "Mini discussion Synaura disponible au-dessus des autres applications"
    channel.setShowBadge(false)
    (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
  }

  private fun createNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
    .setSmallIcon(R.drawable.notification_icon)
    .setContentTitle(conversationTitle)
    .setContentText("Mini discussion active")
    .setContentIntent(conversationIntent())
    .setOngoing(true)
    .setSilent(true)
    .build()

  private fun conversationIntent(): PendingIntent {
    val intent = Intent(this, MainActivity::class.java)
      .setAction(Intent.ACTION_VIEW)
      .setData(Uri.parse("synaura://messages/" + Uri.encode(conversationId)))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(this, conversationId.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun showBubble() {
    val size = dp(68)
    val root = FrameLayout(this).apply {
      elevation = dp(14).toFloat()
      background = ovalDrawable(Color.rgb(25, 23, 26), dp(2), parseAccent())
    }
    val fallback = TextView(this).apply {
      text = conversationTitle.trim().take(1).uppercase(Locale.FRANCE).ifBlank { "?" }
      textSize = 23f
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      setTypeface(typeface, Typeface.BOLD)
    }
    root.addView(fallback, FrameLayout.LayoutParams(size, size))
    val avatar = ImageView(this).apply {
      scaleType = ImageView.ScaleType.CENTER_CROP
      background = ovalDrawable(Color.TRANSPARENT)
      clipToOutline = true
      setPadding(dp(3), dp(3), dp(3), dp(3))
    }
    root.addView(avatar, FrameLayout.LayoutParams(size, size))

    val close = TextView(this).apply {
      text = "×"
      textSize = 15f
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      background = ovalDrawable(Color.rgb(17, 17, 17), dp(1), Color.argb(100, 255, 255, 255))
    }
    root.addView(close, FrameLayout.LayoutParams(dp(23), dp(23), Gravity.TOP or Gravity.END))

    val unreadDot = View(this).apply { background = ovalDrawable(Color.rgb(74, 158, 170), dp(2), Color.WHITE) }
    root.addView(unreadDot, FrameLayout.LayoutParams(dp(15), dp(15), Gravity.BOTTOM or Gravity.END).apply {
      rightMargin = dp(2)
      bottomMargin = dp(2)
    })

    val params = WindowManager.LayoutParams(
      size,
      size,
      overlayType(),
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      val preferences = getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE)
      x = if (preferences.getBoolean("position_left", false)) dp(10) else resources.displayMetrics.widthPixels - size - dp(10)
      val maxY = (resources.displayMetrics.heightPixels - size - dp(72)).coerceAtLeast(dp(40))
      y = preferences.getInt("position_y", dp(180)).coerceIn(dp(40), maxY)
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
            params.x = (initialX + (event.rawX - downX).toInt()).coerceIn(0, (resources.displayMetrics.widthPixels - size).coerceAtLeast(0))
            params.y = (initialY + (event.rawY - downY).toInt()).coerceIn(dp(32), (resources.displayMetrics.heightPixels - size - dp(52)).coerceAtLeast(dp(32)))
            runCatching { windowManager.updateViewLayout(root, params) }
            return true
          }
          MotionEvent.ACTION_UP -> {
            val moved = abs(event.rawX - downX) + abs(event.rawY - downY)
            if (moved < dp(12) && event.x >= (size - dp(27)).toFloat() && event.y <= dp(27).toFloat()) {
              closePanel()
              getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE).edit().putBoolean(EXTRA_ENABLED, false).apply()
              stopSelf()
            } else if (moved < dp(12)) {
              togglePanel()
            } else {
              val screenWidth = resources.displayMetrics.widthPixels
              val left = params.x + size / 2 < screenWidth / 2
              params.x = if (left) dp(10) else screenWidth - size - dp(10)
              getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE).edit()
                .putBoolean("position_left", left)
                .putInt("position_y", params.y)
                .apply()
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
    bubbleParams = params
    bubbleAvatar = avatar
    bubbleFallback = fallback
    refreshBubbleIdentity()
  }

  private fun refreshBubbleIdentity() {
    bubbleFallback?.text = conversationTitle.trim().take(1).uppercase(Locale.FRANCE).ifBlank { "?" }
    loadAvatar(bubbleAvatar)
  }

  private fun togglePanel() {
    if (panelView == null) showPanel() else closePanel()
  }

  private fun showPanel() {
    if (panelView != null) return
    val panelWidth = minOf(dp(372), resources.displayMetrics.widthPixels - dp(20))
    val panelHeight = minOf(dp(540), resources.displayMetrics.heightPixels - dp(120))
    val panel = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      elevation = dp(22).toFloat()
      setPadding(dp(12), dp(12), dp(12), dp(10))
      background = roundedDrawable(Color.rgb(24, 22, 25), dp(24), dp(1), Color.rgb(67, 61, 68))
    }

    val header = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(2), 0, 0, dp(10))
    }
    val headerFallback = TextView(this).apply {
      text = conversationTitle.take(1).uppercase(Locale.FRANCE)
      gravity = Gravity.CENTER
      textSize = 16f
      setTextColor(Color.WHITE)
      setTypeface(typeface, Typeface.BOLD)
      background = ovalDrawable(parseAccent())
    }
    val avatarFrame = FrameLayout(this)
    avatarFrame.addView(headerFallback, FrameLayout.LayoutParams(dp(42), dp(42)))
    val headerAvatar = ImageView(this).apply {
      scaleType = ImageView.ScaleType.CENTER_CROP
      background = ovalDrawable(Color.TRANSPARENT)
      clipToOutline = true
    }
    avatarFrame.addView(headerAvatar, FrameLayout.LayoutParams(dp(42), dp(42)))
    header.addView(avatarFrame, LinearLayout.LayoutParams(dp(42), dp(42)))
    val titleCopy = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(10), 0, dp(8), 0)
    }
    titleCopy.addView(TextView(this).apply {
      text = conversationTitle
      textSize = 15f
      maxLines = 1
      setTextColor(Color.WHITE)
      setTypeface(typeface, Typeface.BOLD)
    })
    titleCopy.addView(TextView(this).apply {
      text = "Discussion compacte"
      textSize = 10f
      setTextColor(Color.rgb(170, 164, 173))
    })
    header.addView(titleCopy, LinearLayout.LayoutParams(0, dp(42), 1f))
    header.addView(iconButton("↗", "Ouvrir dans Synaura") { conversationIntent().send() }, LinearLayout.LayoutParams(dp(38), dp(38)))
    header.addView(iconButton("−", "Réduire") { closePanel() }, LinearLayout.LayoutParams(dp(38), dp(38)).apply { leftMargin = dp(6) })
    panel.addView(header, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)))

    val scroll = ScrollView(this).apply {
      isFillViewport = true
      overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
      background = roundedDrawable(Color.rgb(14, 14, 15), dp(17))
    }
    val messageList = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.BOTTOM
      setPadding(dp(10), dp(12), dp(10), dp(12))
    }
    scroll.addView(messageList, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
    panel.addView(scroll, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))

    val status = TextView(this).apply {
      textSize = 10f
      setTextColor(Color.rgb(170, 164, 173))
      setPadding(dp(4), dp(5), dp(4), 0)
      visibility = View.GONE
    }
    panel.addView(status, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(25)))

    val composer = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.BOTTOM
      setPadding(0, dp(7), 0, 0)
    }
    val input = EditText(this).apply {
      hint = "Écrire un message…"
      setHintTextColor(Color.rgb(132, 126, 136))
      setTextColor(Color.WHITE)
      textSize = 14f
      minHeight = dp(42)
      maxLines = 3
      inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or InputType.TYPE_TEXT_FLAG_MULTI_LINE
      setPadding(dp(13), dp(9), dp(13), dp(9))
      background = roundedDrawable(Color.rgb(39, 36, 41), dp(20), dp(1), Color.rgb(70, 65, 73))
    }
    composer.addView(input, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
    val send = iconButton("↑", "Envoyer") {
      val content = input.text?.toString()?.trim().orEmpty().take(2_000)
      if (content.isNotBlank()) {
        input.setText("")
        status.text = "Envoi…"
        status.visibility = View.VISIBLE
        SynauraMessagingModule.emitBubbleReply(conversationId, content)
        appendPendingMessage(content)
      }
    }.apply {
      textSize = 22f
      background = ovalDrawable(parseAccent())
    }
    composer.addView(send, LinearLayout.LayoutParams(dp(44), dp(44)).apply { leftMargin = dp(7) })
    panel.addView(composer, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

    val params = WindowManager.LayoutParams(
      panelWidth,
      panelHeight,
      overlayType(),
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.CENTER
      softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
    }
    windowManager.addView(panel, params)
    panelView = panel
    panelMessages = messageList
    panelScroll = scroll
    panelStatus = status
    panelInput = input
    loadAvatar(headerAvatar)
    renderMessages()
    panel.alpha = 0f
    panel.scaleX = 0.92f
    panel.scaleY = 0.92f
    panel.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(170).start()
  }

  private fun closePanel() {
    val panel = panelView ?: return
    panelInput?.clearFocus()
    (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(panel.windowToken, 0)
    panel.animate().alpha(0f).scaleX(0.94f).scaleY(0.94f).setDuration(130).withEndAction {
      runCatching { windowManager.removeView(panel) }
    }.start()
    panelView = null
    panelMessages = null
    panelScroll = null
    panelStatus = null
    panelInput = null
  }

  private fun renderMessages() {
    val container = panelMessages ?: return
    container.removeAllViews()
    val messages = runCatching { JSONArray(messagesJson) }.getOrDefault(JSONArray())
    if (messages.length() == 0) {
      container.addView(TextView(this).apply {
        text = "Les derniers messages apparaîtront ici."
        gravity = Gravity.CENTER
        setPadding(dp(10), dp(50), dp(10), dp(50))
        textSize = 12f
        setTextColor(Color.rgb(154, 148, 158))
      })
      return
    }
    var previousDay = ""
    for (index in 0 until messages.length()) {
      val message = messages.optJSONObject(index) ?: continue
      val createdAt = message.optString("createdAt")
      val currentDay = createdAt.take(10)
      if (currentDay.isNotBlank() && currentDay != previousDay) {
        previousDay = currentDay
        container.addView(TextView(this).apply {
          text = compactDay(currentDay)
          gravity = Gravity.CENTER
          setPadding(0, if (index == 0) dp(2) else dp(12), 0, dp(7))
          textSize = 9f
          setTextColor(Color.rgb(143, 137, 147))
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
      }
      container.addView(messageRow(message), LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(5) })
    }
    panelStatus?.visibility = View.GONE
    panelScroll?.post { panelScroll?.fullScroll(View.FOCUS_DOWN) }
  }

  private fun messageRow(message: JSONObject): View {
    val own = message.optBoolean("own")
    val row = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = if (own) Gravity.END or Gravity.CENTER_VERTICAL else Gravity.START or Gravity.CENTER_VERTICAL
    }
    val body = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(11), dp(8), dp(11), dp(6))
      background = roundedDrawable(if (own) parseAccent() else Color.rgb(43, 40, 45), dp(15), if (own) 0 else dp(1), Color.rgb(72, 67, 75))
    }
    if (!own) body.addView(TextView(this).apply {
      text = message.optString("senderName", "Synaura")
      textSize = 9f
      setTextColor(Color.rgb(116, 207, 217))
      setTypeface(typeface, Typeface.BOLD)
    })
    body.addView(TextView(this).apply {
      text = message.optString("content", "Message")
      textSize = 13f
      setTextColor(Color.WHITE)
      setPadding(0, if (own) 0 else dp(2), 0, 0)
    })
    body.addView(TextView(this).apply {
      text = message.optString("createdAt").let { if (it.length >= 16) it.substring(11, 16) else "" }
      textSize = 8f
      gravity = Gravity.END
      setTextColor(Color.argb(175, 255, 255, 255))
      setPadding(0, dp(3), 0, 0)
    })
    row.addView(body, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
      weight = 0.82f
      if (own) leftMargin = dp(42) else rightMargin = dp(42)
    })
    var reaction = message.optString("reaction")
    val heart = TextView(this).apply {
      text = if (reaction == "heart") "♥" else "♡"
      textSize = 16f
      gravity = Gravity.CENTER
      setTextColor(if (reaction == "heart") Color.rgb(217, 109, 99) else Color.rgb(150, 143, 154))
      contentDescription = if (reaction == "heart") "Retirer la réaction" else "Aimer le message"
      setOnClickListener {
        val next = if (reaction == "heart") null else "heart"
        reaction = next.orEmpty()
        SynauraMessagingModule.emitBubbleReaction(conversationId, message.optString("id"), next)
        text = if (next == "heart") "♥" else "♡"
        setTextColor(if (next == "heart") Color.rgb(217, 109, 99) else Color.rgb(150, 143, 154))
        animate().scaleX(1.3f).scaleY(1.3f).setDuration(110).withEndAction { animate().scaleX(1f).scaleY(1f).setDuration(120).start() }.start()
      }
    }
    if (own) row.addView(heart, 0, LinearLayout.LayoutParams(dp(34), dp(34)).apply { rightMargin = dp(4) })
    else row.addView(heart, LinearLayout.LayoutParams(dp(34), dp(34)).apply { leftMargin = dp(4) })
    return row
  }

  private fun appendPendingMessage(content: String) {
    val messages = runCatching { JSONArray(messagesJson) }.getOrDefault(JSONArray())
    messages.put(JSONObject().apply {
      put("id", "pending-${System.currentTimeMillis()}")
      put("senderName", "Moi")
      put("content", content)
      put("createdAt", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(java.util.Date()))
      put("own", true)
      put("reaction", JSONObject.NULL)
    })
    messagesJson = messages.toString()
    renderMessages()
  }

  private fun loadAvatar(target: ImageView?) {
    if (target == null) return
    target.setImageDrawable(null)
    if (avatarUrl.isBlank()) return
    val expected = avatarUrl
    Thread {
      val bitmap = runCatching {
        val connection = URL(expected).openConnection().apply {
          connectTimeout = 4_000
          readTimeout = 5_000
        }
        connection.getInputStream().use(BitmapFactory::decodeStream)
      }.getOrNull()
      if (bitmap != null && avatarUrl == expected) target.post { target.setImageBitmap(bitmap) }
    }.start()
  }

  private fun compactDay(value: String): String = runCatching {
    val input = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val output = SimpleDateFormat("EEEE d MMMM", Locale.FRANCE)
    output.format(input.parse(value)!!).replaceFirstChar { it.uppercase(Locale.FRANCE) }
  }.getOrDefault(value)

  private fun iconButton(label: String, description: String, action: () -> Unit) = TextView(this).apply {
    text = label
    textSize = 18f
    gravity = Gravity.CENTER
    setTextColor(Color.WHITE)
    contentDescription = description
    background = ovalDrawable(Color.rgb(47, 43, 49))
    setOnClickListener { action() }
  }

  private fun parseAccent() = runCatching { Color.parseColor(accentColor) }.getOrDefault(Color.rgb(115, 87, 198))

  private fun roundedDrawable(color: Int, radius: Int, stroke: Int = 0, strokeColor: Int = Color.TRANSPARENT) = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = radius.toFloat()
    setColor(color)
    if (stroke > 0) setStroke(stroke, strokeColor)
  }

  private fun ovalDrawable(color: Int, stroke: Int = 0, strokeColor: Int = Color.TRANSPARENT) = GradientDrawable().apply {
    shape = GradientDrawable.OVAL
    setColor(color)
    if (stroke > 0) setStroke(stroke, strokeColor)
  }

  private fun overlayType() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
