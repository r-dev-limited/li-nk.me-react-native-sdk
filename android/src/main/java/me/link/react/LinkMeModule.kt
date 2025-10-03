package me.link.react

import com.facebook.react.bridge.*
import me.link.sdk.LinkMe
import me.link.sdk.LinkPayload
import android.content.Intent
import android.net.Uri

class LinkMeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "LinkMe"
    }

    @ReactMethod
    fun configure(config: ReadableMap, promise: Promise) {
        try {
            val baseUrl = config.getString("baseUrl")
            if (baseUrl == null) {
                promise.reject("INVALID_ARGS", "baseUrl is required")
                return
            }

            val linkMeConfig = LinkMe.Config(
                baseUrl = baseUrl,
                appId = config.getString("appId"),
                appKey = config.getString("appKey"),
                enablePasteboard = config.getBoolean("enablePasteboard") ?: false,
                sendDeviceInfo = config.getBoolean("sendDeviceInfo") ?: true,
                includeVendorId = config.getBoolean("includeVendorId") ?: true,
                includeAdvertisingId = config.getBoolean("includeAdvertisingId") ?: false
            )

            LinkMe.shared.configure(reactApplicationContext, linkMeConfig)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CONFIG_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getInitialLink(promise: Promise) {
        LinkMe.shared.getInitialLink { payload ->
            promise.resolve(dictionaryFromPayload(payload))
        }
    }

    @ReactMethod
    fun claimDeferredIfAvailable(promise: Promise) {
        LinkMe.shared.claimDeferredIfAvailable(reactApplicationContext) { payload ->
            promise.resolve(dictionaryFromPayload(payload))
        }
    }

    @ReactMethod
    fun setUserId(userId: String, promise: Promise) {
        LinkMe.shared.setUserId(userId)
        promise.resolve(null)
    }

    @ReactMethod
    fun setAdvertisingConsent(granted: Boolean, promise: Promise) {
        LinkMe.shared.setAdvertisingConsent(granted)
        promise.resolve(null)
    }

    @ReactMethod
    fun track(event: String, properties: ReadableMap?, promise: Promise) {
        val props = properties?.toHashMap()
        LinkMe.shared.track(event, props)
        promise.resolve(null)
    }

    @ReactMethod
    fun setReady(promise: Promise) {
        // Android processes links immediately after configure
        promise.resolve(null)
    }

    @ReactMethod
    fun handleUrl(url: String, promise: Promise) {
        try {
            val uri = Uri.parse(url)
            val intent = Intent(Intent.ACTION_VIEW, uri)
            LinkMe.shared.handleIntent(intent)
            // Return true to indicate the URL was forwarded for handling
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("HANDLE_URL_ERROR", e.message, e)
        }
    }

    private fun dictionaryFromPayload(payload: LinkPayload?): WritableMap? {
        if (payload == null) return null
        
        val map = Arguments.createMap()
        payload.linkId?.let { map.putString("linkId", it) }
        payload.path?.let { map.putString("path", it) }
        payload.params?.let { params ->
            val paramsMap = Arguments.createMap()
            params.forEach { (key, value) -> paramsMap.putString(key, value) }
            map.putMap("params", paramsMap)
        }
        payload.utm?.let { utm ->
            val utmMap = Arguments.createMap()
            utm.forEach { (key, value) -> utmMap.putString(key, value) }
            map.putMap("utm", utmMap)
        }
        payload.custom?.let { custom ->
            val customMap = Arguments.createMap()
            custom.forEach { (key, value) -> customMap.putString(key, value) }
            map.putMap("custom", customMap)
        }
        return map
    }
}
