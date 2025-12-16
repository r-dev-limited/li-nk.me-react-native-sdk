package com.linkme.rn

import android.content.Context
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

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
      client.startConnection(object : InstallReferrerStateListener {
        override fun onInstallReferrerSetupFinished(responseCode: Int) {
          try {
            if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
              val details = client.installReferrer
              val referrer = details.installReferrer
              if (!referrer.isNullOrBlank()) {
                promise.resolve(referrer)
              } else {
                promise.resolve(null)
              }
            } else {
              promise.resolve(null)
            }
          } catch (_: Exception) {
            promise.resolve(null)
          } finally {
            try {
              client.endConnection()
            } catch (_: Exception) {
              // ignore
            }
          }
        }

        override fun onInstallReferrerServiceDisconnected() {
          // No-op; we'll just resolve null if we can't connect.
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

