package com.synaura.music

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.*

// These are UI cues only: they never own or reconfigure the communication route,
// acquire the microphone, request audio focus, or enter the music player's queue.
class SynauraCallAudioModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val main = Handler(Looper.getMainLooper())
  private var player: MediaPlayer? = null
  override fun getName() = "SynauraCallAudio"

  @ReactMethod fun startCallSession(promise: Promise) {
    try { ContextCompat.startForegroundService(context, Intent(context, SynauraVoiceService::class.java)); promise.resolve(null) }
    catch (_: Exception) { promise.reject("call_session", "Ouvre Synaura pour démarrer un appel.") }
  }
  @ReactMethod fun stopCallSession() { context.stopService(Intent(context, SynauraVoiceService::class.java)) }

  @ReactMethod fun playCue(cue: String, promise: Promise) {
    main.post {
      stop()
      if (cue !in setOf("incoming", "outgoing", "connected", "missed", "unavailable", "ended")) {
        promise.reject("invalid_cue", "Unknown call cue"); return@post
      }
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      if ((cue == "incoming" || cue == "missed") && audio.ringerMode != AudioManager.RINGER_MODE_NORMAL) {
        promise.resolve(null); return@post
      }
      val id = context.resources.getIdentifier("synaura_call_$cue", "raw", context.packageName)
      if (id == 0) { promise.reject("missing_cue", "Call cue unavailable"); return@post }
      try {
        val next = MediaPlayer()
        player = next
        next.setAudioAttributes(AudioAttributes.Builder()
          .setUsage(if (cue == "incoming" || cue == "missed") AudioAttributes.USAGE_NOTIFICATION_RINGTONE else AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
        context.resources.openRawResourceFd(id).use { fd -> next.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length) }
        next.isLooping = cue == "incoming" || cue == "outgoing"
        next.setOnCompletionListener { if (player === it) stop() }
        next.setOnErrorListener { media, _, _ -> if (player === media) stop(); true }
        next.prepare()
        next.start()
        promise.resolve(null)
      } catch (_: Exception) { stop(); promise.reject("cue_unavailable", "Call sound unavailable") }
    }
  }
  @ReactMethod fun stopCue() { main.post { stop() } }
  private fun stop() {
    val previous = player; player = null
    try { previous?.release() } catch (_: Exception) {}
  }
  override fun invalidate() { main.post { stop() }; stopCallSession(); super.invalidate() }
}
