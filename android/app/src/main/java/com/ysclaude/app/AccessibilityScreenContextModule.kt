package com.ysclaude.app

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AccessibilityScreenContextModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "AccessibilityScreenContext"

  @ReactMethod
  fun openAccessibilitySettings(promise: Promise) {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
    promise.resolve(true)
  }

  @ReactMethod
  fun isAccessibilityServiceEnabled(promise: Promise) {
    promise.resolve(FloatingAccessibilityService.isRunning())
  }

  @ReactMethod
  fun captureScreenContext(promise: Promise) {
    FloatingAccessibilityService.captureCurrentScreenContext { result ->
      result
        .onSuccess { context ->
          val map = Arguments.createMap()
          map.putString("imageUri", context.imageUri)
          map.putString("nodeTree", context.nodeTree)
          promise.resolve(map)
        }
        .onFailure { error -> promise.reject("CAPTURE_SCREEN_CONTEXT_FAILED", error) }
    }
  }
}
