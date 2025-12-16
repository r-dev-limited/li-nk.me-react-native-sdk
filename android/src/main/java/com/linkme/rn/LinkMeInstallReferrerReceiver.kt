package com.linkme.rn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class LinkMeInstallReferrerReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != "com.android.vending.INSTALL_REFERRER") return
    val referrer = intent.getStringExtra("referrer") ?: return
    val prefs = context.getSharedPreferences(LinkMeInstallReferrerModule.PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit()
      .putString(LinkMeInstallReferrerModule.PREF_KEY_REFERRER, referrer)
      .putLong(LinkMeInstallReferrerModule.PREF_KEY_TS, System.currentTimeMillis())
      .apply()
  }
}

