package com.synaura.music

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.LifecycleEventListener
import java.io.File

class SynauraMessagingModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), LifecycleEventListener {
  private var recorder: MediaRecorder? = null
  private var recordingFile: File? = null
  private var recordingStartedAt = 0L

  init {
    context.addLifecycleEventListener(this)
  }

  override fun getName() = "SynauraMessaging"

  @ReactMethod
  fun startVoiceRecording(promise: Promise) {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("microphone_permission", "Microphone permission is required")
      return
    }
    releaseRecorder(true)
    try {
      val file = File(context.cacheDir, "synaura-voice-" + System.currentTimeMillis() + ".m4a")
      val next = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(context) else MediaRecorder()
      next.setAudioSource(MediaRecorder.AudioSource.MIC)
      next.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
      next.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      next.setAudioEncodingBitRate(96000)
      next.setAudioSamplingRate(44100)
      next.setOutputFile(file.absolutePath)
      next.prepare()
      next.start()
      recorder = next
      recordingFile = file
      recordingStartedAt = SystemClock.elapsedRealtime()
      promise.resolve(Uri.fromFile(file).toString())
    } catch (error: Exception) {
      releaseRecorder(true)
      promise.reject("recording_start", error.message, error)
    }
  }

  @ReactMethod
  fun stopVoiceRecording(promise: Promise) {
    val current = recorder
    val file = recordingFile
    if (current == null || file == null) {
      promise.reject("recording_missing", "No voice recording is active")
      return
    }
    val duration = (SystemClock.elapsedRealtime() - recordingStartedAt).coerceAtLeast(0L)
    try {
      current.stop()
      val result = Arguments.createMap()
      result.putString("uri", Uri.fromFile(file).toString())
      result.putDouble("durationMs", duration.toDouble())
      releaseRecorder(false)
      promise.resolve(result)
    } catch (error: Exception) {
      releaseRecorder(true)
      promise.reject("recording_stop", error.message, error)
    }
  }

  @ReactMethod
  fun cancelVoiceRecording(promise: Promise) {
    releaseRecorder(true)
    promise.resolve(null)
  }

  @ReactMethod
  fun getVoiceAmplitude(promise: Promise) {
    val amplitude = runCatching { recorder?.maxAmplitude ?: 0 }.getOrDefault(0)
    promise.resolve((amplitude.toDouble() / 32767.0).coerceIn(0.0, 1.0))
  }

  @ReactMethod
  fun canDrawOverlays(promise: Promise) {
    promise.resolve(SynauraBubbleManager.canUse(context))
  }

  @ReactMethod
  fun requestOverlayPermission(promise: Promise) {
    if (!SynauraBubbleManager.isSupported()) {
      promise.resolve(false)
      return
    }
    if (SynauraBubbleManager.canUse(context)) {
      promise.resolve(true)
      return
    }
    try {
      SynauraBubbleManager.openSettings(context)
      promise.resolve(false)
    } catch (error: Exception) {
      promise.reject("bubble_settings", error.message, error)
    }
  }

  @ReactMethod
  fun supportsBubbles(promise: Promise) {
    promise.resolve(SynauraBubbleManager.isSupported())
  }

  @ReactMethod
  fun showChatBubble(conversationId: String, title: String, accentColor: String, promise: Promise) {
    try {
      val preferences = bubblePreferences()
      promise.resolve(SynauraBubbleManager.show(
        context,
        conversationId,
        title,
        accentColor,
        preferences.getString(SynauraBubbleManager.EXTRA_AVATAR_URL, "").orEmpty(),
        preferences.getString(SynauraBubbleManager.EXTRA_MESSAGES_JSON, "[]").orEmpty(),
      ))
    } catch (error: Exception) {
      promise.reject("bubble_start", error.message, error)
    }
  }

  @ReactMethod
  fun configureChatBubble(enabled: Boolean, conversationId: String, title: String, accentColor: String, avatarUrl: String, promise: Promise) {
    SynauraBubbleManager.configure(context, enabled, conversationId, title, accentColor, avatarUrl)
    promise.resolve(true)
  }

  @ReactMethod
  fun updateChatBubble(conversationId: String, title: String, accentColor: String, avatarUrl: String, messagesJson: String, promise: Promise) {
    bubblePreferences().edit()
      .putString(SynauraBubbleManager.EXTRA_TITLE, title)
      .putString(SynauraBubbleManager.EXTRA_ACCENT, accentColor)
      .putString(SynauraBubbleManager.EXTRA_AVATAR_URL, avatarUrl)
      .putString(SynauraBubbleManager.EXTRA_MESSAGES_JSON, messagesJson)
      .apply()
    try {
      promise.resolve(SynauraBubbleManager.show(context, conversationId, title, accentColor, avatarUrl, messagesJson))
    } catch (error: Exception) {
      promise.reject("bubble_update", error.message, error)
    }
  }

  @ReactMethod
  fun hideChatBubble(promise: Promise) {
    SynauraBubbleManager.hide(context)
    promise.resolve(true)
  }

  private fun bubblePreferences() = context.getSharedPreferences(SynauraBubbleManager.PREFERENCES_NAME, android.content.Context.MODE_PRIVATE)

  override fun onHostResume() = Unit

  override fun onHostPause() = Unit

  override fun onHostDestroy() = Unit

  private fun releaseRecorder(deleteFile: Boolean) {
    try { recorder?.reset() } catch (_: Exception) {}
    try { recorder?.release() } catch (_: Exception) {}
    recorder = null
    if (deleteFile) recordingFile?.delete()
    recordingFile = null
    recordingStartedAt = 0L
  }

  override fun invalidate() {
    context.removeLifecycleEventListener(this)
    releaseRecorder(true)
    super.invalidate()
  }
}
