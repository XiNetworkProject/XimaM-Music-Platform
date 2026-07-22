package com.synaura.music

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class SynauraBubbleActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "SynauraBubble"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    val activity = this
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions(): Bundle = Bundle().apply {
          putString(SynauraBubbleManager.EXTRA_CONVERSATION_ID, activity.intent?.getStringExtra(SynauraBubbleManager.EXTRA_CONVERSATION_ID).orEmpty())
          putString(SynauraBubbleManager.EXTRA_TITLE, activity.intent?.getStringExtra(SynauraBubbleManager.EXTRA_TITLE) ?: "Discussion Synaura")
          putString(SynauraBubbleManager.EXTRA_ACCENT, activity.intent?.getStringExtra(SynauraBubbleManager.EXTRA_ACCENT) ?: "#7357C6")
          putString(SynauraBubbleManager.EXTRA_AVATAR_URL, activity.intent?.getStringExtra(SynauraBubbleManager.EXTRA_AVATAR_URL).orEmpty())
        }
      },
    )
  }
}
