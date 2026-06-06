package com.ysclaude.app

import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import android.graphics.Rect
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executor

class FloatingAccessibilityService : AccessibilityService() {
  private val mainHandler = Handler(Looper.getMainLooper())

  data class ScreenContext(
    val imageUri: String?,
    val nodeTree: String
  )

  override fun onServiceConnected() {
    instance = this
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

  override fun onInterrupt() = Unit

  override fun onDestroy() {
    if (instance === this) {
      instance = null
    }
    super.onDestroy()
  }

  private fun collectNodeTree(): String {
    val root = rootInActiveWindow
    val payload = JSONObject()
    payload.put("capturedAt", System.currentTimeMillis())
    payload.put("activePackage", root?.packageName?.toString() ?: "")
    payload.put("windows", JSONArray().also { windowsArray ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        windows.forEachIndexed { index, window ->
          val windowObject = JSONObject()
          windowObject.put("index", index)
          windowObject.put("type", window.type)
          windowObject.put("layer", window.layer)
          windowObject.put("focused", window.isFocused)
          window.root?.let { node ->
            windowObject.put("root", serializeNode(node, "w$index", 0, NodeBudget()))
          }
          windowsArray.put(windowObject)
        }
      } else if (root != null) {
        windowsArray.put(JSONObject().put("index", 0).put("root", serializeNode(root, "root", 0, NodeBudget())))
      }
    })
    return payload.toString()
  }

  private fun serializeNode(
    node: AccessibilityNodeInfo,
    path: String,
    depth: Int,
    budget: NodeBudget
  ): JSONObject {
    budget.count += 1
    val bounds = Rect()
    node.getBoundsInScreen(bounds)

    val objectValue = JSONObject()
    objectValue.put("id", path)
    objectValue.put("className", node.className?.toString() ?: "")
    objectValue.put("packageName", node.packageName?.toString() ?: "")
    objectValue.put("text", node.text?.toString() ?: "")
    objectValue.put("contentDescription", node.contentDescription?.toString() ?: "")
    objectValue.put("viewIdResourceName", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) node.viewIdResourceName ?: "" else "")
    objectValue.put("bounds", JSONObject()
      .put("left", bounds.left)
      .put("top", bounds.top)
      .put("right", bounds.right)
      .put("bottom", bounds.bottom)
      .put("width", bounds.width())
      .put("height", bounds.height()))
    objectValue.put("clickable", node.isClickable)
    objectValue.put("longClickable", node.isLongClickable)
    objectValue.put("scrollable", node.isScrollable)
    objectValue.put("editable", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) node.isEditable else false)
    objectValue.put("enabled", node.isEnabled)
    objectValue.put("visibleToUser", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) node.isVisibleToUser else true)
    objectValue.put("focused", node.isFocused)
    objectValue.put("selected", node.isSelected)
    objectValue.put("checked", node.isChecked)

    if (depth < MAX_NODE_DEPTH && budget.count < MAX_NODE_COUNT) {
      val children = JSONArray()
      for (index in 0 until node.childCount) {
        if (budget.count >= MAX_NODE_COUNT) break
        val child = node.getChild(index) ?: continue
        children.put(serializeNode(child, "$path.$index", depth + 1, budget))
        child.recycle()
      }
      objectValue.put("children", children)
    }

    return objectValue
  }

  private fun saveBitmap(bitmap: Bitmap): String {
    val dir = File(cacheDir, "screen-share")
    if (!dir.exists()) {
      dir.mkdirs()
    }
    val file = File(dir, "screen-${System.currentTimeMillis()}.jpg")
    FileOutputStream(file).use { output ->
      bitmap.compress(Bitmap.CompressFormat.JPEG, 88, output)
    }
    return Uri.fromFile(file).toString()
  }

  private fun captureScreenContext(callback: (Result<ScreenContext>) -> Unit) {
    val nodeTree = collectNodeTree()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      callback(Result.success(ScreenContext(null, nodeTree)))
      return
    }

    takeScreenshot(0, Executor { command -> mainHandler.post(command) }, object : TakeScreenshotCallback {
      override fun onSuccess(screenshot: ScreenshotResult) {
        try {
          val bitmap = Bitmap.wrapHardwareBuffer(screenshot.hardwareBuffer, screenshot.colorSpace)
            ?: throw IllegalStateException("Unable to decode accessibility screenshot")
          val imageUri = saveBitmap(bitmap)
          screenshot.hardwareBuffer.close()
          callback(Result.success(ScreenContext(imageUri, nodeTree)))
        } catch (error: Throwable) {
          callback(Result.failure(error))
        }
      }

      override fun onFailure(errorCode: Int) {
        callback(Result.failure(IllegalStateException("Accessibility screenshot failed: $errorCode")))
      }
    })
  }

  private class NodeBudget {
    var count = 0
  }

  companion object {
    private const val MAX_NODE_DEPTH = 12
    private const val MAX_NODE_COUNT = 320

    @Volatile
    private var instance: FloatingAccessibilityService? = null

    fun isRunning(): Boolean = instance != null

    fun captureCurrentScreenContext(callback: (Result<ScreenContext>) -> Unit) {
      val service = instance
      if (service == null) {
        callback(Result.failure(IllegalStateException("Please enable the YSClaude accessibility service first")))
        return
      }
      service.mainHandler.post {
        service.captureScreenContext(callback)
      }
    }
  }
}
