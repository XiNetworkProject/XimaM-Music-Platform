package com.synaura.music

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
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
  fun canDrawOverlays(promise: Promise) {
    promise.resolve(Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context))
  }

  @ReactMethod
  fun requestOverlayPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)) {
      promise.resolve(true)
      return
    }
    try {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + context.packageName))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      promise.resolve(false)
    } catch (error: Exception) {
      promise.reject("overlay_permission", error.message, error)
    }
  }

  @ReactMethod
  fun showChatBubble(conversationId: String, title: String, accentColor: String, promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
      promise.reject("overlay_permission", "Overlay permission is required")
      return
    }
    val intent = Intent(context, SynauraBubbleService::class.java)
      .putExtra(SynauraBubbleService.EXTRA_ENABLED, true)
      .putExtra(SynauraBubbleService.EXTRA_CONVERSATION_ID, conversationId)
      .putExtra(SynauraBubbleService.EXTRA_TITLE, title)
      .putExtra(SynauraBubbleService.EXTRA_ACCENT, accentColor)
    try {
      ContextCompat.startForegroundService(context, intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("bubble_start", error.message, error)
    }
  }

  @ReactMethod
  fun configureChatBubble(enabled: Boolean, conversationId: String, title: String, accentColor: String, promise: Promise) {
    bubblePreferences().edit()
      .putBoolean(SynauraBubbleService.EXTRA_ENABLED, enabled)
      .putString(SynauraBubbleService.EXTRA_CONVERSATION_ID, conversationId)
      .putString(SynauraBubbleService.EXTRA_TITLE, title)
      .putString(SynauraBubbleService.EXTRA_ACCENT, accentColor)
      .apply()
    if (!enabled) context.stopService(Intent(context, SynauraBubbleService::class.java))
    promise.resolve(true)
  }

  @ReactMethod
  fun hideChatBubble(promise: Promise) {
    context.stopService(Intent(context, SynauraBubbleService::class.java))
    promise.resolve(true)
  }

  private fun bubblePreferences() = context.getSharedPreferences(SynauraBubbleService.PREFERENCES_NAME, android.content.Context.MODE_PRIVATE)

  private fun showConfiguredBubble() {
    val preferences = bubblePreferences()
    if (!preferences.getBoolean(SynauraBubbleService.EXTRA_ENABLED, false)) return
    val conversationId = preferences.getString(SynauraBubbleService.EXTRA_CONVERSATION_ID, "").orEmpty()
    if (conversationId.isBlank() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context))) return
    val intent = Intent(context, SynauraBubbleService::class.java)
      .putExtra(SynauraBubbleService.EXTRA_ENABLED, true)
      .putExtra(SynauraBubbleService.EXTRA_CONVERSATION_ID, conversationId)
      .putExtra(SynauraBubbleService.EXTRA_TITLE, preferences.getString(SynauraBubbleService.EXTRA_TITLE, "Discussion Synaura"))
      .putExtra(SynauraBubbleService.EXTRA_ACCENT, preferences.getString(SynauraBubbleService.EXTRA_ACCENT, "#7357C6"))
    runCatching { ContextCompat.startForegroundService(context, intent) }
  }

  override fun onHostResume() {
    context.stopService(Intent(context, SynauraBubbleService::class.java))
  }

  override fun onHostPause() {
    showConfiguredBubble()
  }

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
