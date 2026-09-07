package com.linkme.rn

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.atomic.AtomicBoolean

class LinkMeInstallReferrerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LinkMeInstallReferrer"

  @ReactMethod
  fun getInstallReferrer(promise: Promise) {
    val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val cached = prefs.getString(PREF_KEY_REFERRER, null)
    if (!cached.isNullOrBlank()) {
      // Consume cached referrer (typically set via INSTALL_REFERRER broadcast for testing).
      prefs.edit().remove(PREF_KEY_REFERRER).remove(PREF_KEY_TS).apply()
      promise.resolve(cached)
      return
    }

    // Try Play Install Referrer API (works only for Play Store installs).
    try {
      val client = InstallReferrerClient.newBuilder(reactApplicationContext).build()
      val handler = Handler(Looper.getMainLooper())
      val settled = AtomicBoolean(false)
      lateinit var timeout: Runnable
      fun finish(value: String?) {
        if (!settled.compareAndSet(false, true)) return
        handler.removeCallbacks(timeout)
        try {
          client.endConnection()
        } catch (_: Exception) {
          // ignore
        }
        promise.resolve(value)
      }
      timeout = Runnable { finish(null) }
      handler.postDelayed(timeout, 5000L)
      client.startConnection(object : InstallReferrerStateListener {
        override fun onInstallReferrerSetupFinished(responseCode: Int) {
          try {
            if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
              val details = client.installReferrer
              val referrer = details.installReferrer
              finish(referrer?.takeIf { it.isNotBlank() })
            } else {
              finish(null)
            }
          } catch (_: Exception) {
            finish(null)
          }
        }

        override fun onInstallReferrerServiceDisconnected() {
          // Resolve so the JS controller can continue with fingerprint fallback.
          finish(null)
        }
      })
    } catch (_: Exception) {
      promise.resolve(null)
    }
  }

  companion object {
    const val PREFS_NAME = "linkme_install_referrer"
    const val PREF_KEY_REFERRER = "referrer"
    const val PREF_KEY_TS = "ts"
  }
}
