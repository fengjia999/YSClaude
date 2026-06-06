package com.ysclaude.app

import android.content.ComponentName
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.IBinder
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import rikka.shizuku.Shizuku
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class ShizukuFileModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ShizukuFile"

  private val executor = Executors.newSingleThreadExecutor()
  private val lock = Object()
  private var pendingPermissionPromise: Promise? = null
  private var permissionListenerRegistered = false
  @Volatile private var service: IShizukuFileService? = null
  @Volatile private var bindLatch: CountDownLatch? = null

  private val userServiceArgs = Shizuku.UserServiceArgs(
    ComponentName(reactContext.packageName, ShizukuFileUserService::class.java.name)
  )
    .daemon(false)
    .processNameSuffix("shizuku_file")
    .debuggable(false)
    .version(3)

  private val serviceConnection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName, binder: IBinder) {
      service = IShizukuFileService.Stub.asInterface(binder)
      bindLatch?.countDown()
    }

    override fun onServiceDisconnected(name: ComponentName) {
      service = null
    }
  }

  private val permissionListener =
    Shizuku.OnRequestPermissionResultListener { requestCode, grantResult ->
      if (requestCode != REQUEST_SHIZUKU_PERMISSION) return@OnRequestPermissionResultListener
      val promise = pendingPermissionPromise ?: return@OnRequestPermissionResultListener
      pendingPermissionPromise = null
      promise.resolve(buildStatusMap(grantResult == PackageManager.PERMISSION_GRANTED))
    }

  init {
    ensurePermissionListener()
  }

  override fun invalidate() {
    try {
      if (permissionListenerRegistered) {
        Shizuku.removeRequestPermissionResultListener(permissionListener)
        permissionListenerRegistered = false
      }
    } catch (_: Throwable) {
      // Older devices or an unavailable Shizuku binder can throw during cleanup.
    }
    super.invalidate()
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      promise.resolve(buildStatusMap())
    } catch (error: Throwable) {
      val result = WritableNativeMap()
      result.putBoolean("available", false)
      result.putBoolean("running", false)
      result.putBoolean("permissionGranted", false)
      result.putString("error", error.message ?: "Shizuku 状态检测失败")
      promise.resolve(result)
    }
  }

  @ReactMethod
  fun requestPermission(promise: Promise) {
    try {
      if (!Shizuku.pingBinder()) {
        promise.reject("SHIZUKU_NOT_RUNNING", "Shizuku 未运行，请先启动 Shizuku")
        return
      }
      if (hasPermission()) {
        promise.resolve(buildStatusMap(true))
        return
      }
      if (pendingPermissionPromise != null) {
        promise.reject("REQUEST_BUSY", "已有 Shizuku 授权请求正在进行")
        return
      }

      ensurePermissionListener()
      pendingPermissionPromise = promise
      Shizuku.requestPermission(REQUEST_SHIZUKU_PERMISSION)
    } catch (error: Throwable) {
      pendingPermissionPromise = null
      promise.reject("REQUEST_PERMISSION_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun listDirectory(path: String, promise: Promise) {
    executor.execute {
      try {
        val output = getServiceBlocking().listDirectory(path)
        promise.resolve(output)
      } catch (error: Throwable) {
        promise.reject("SHIZUKU_LIST_FAILED", error.message, error)
      }
    }
  }

  @ReactMethod
  fun readFile(path: String, maxBytes: Double, promise: Promise) {
    executor.execute {
      try {
        val byteLimit = maxBytes.toInt().coerceIn(1, MAX_READ_BYTES)
        val output = getServiceBlocking().readFile(path, byteLimit)
        promise.resolve(output)
      } catch (error: Throwable) {
        promise.reject("SHIZUKU_READ_FAILED", error.message, error)
      }
    }
  }

  @ReactMethod
  fun writeFile(path: String, content: String, append: Boolean, createParents: Boolean, promise: Promise) {
    executor.execute {
      try {
        val output = getServiceBlocking().writeFile(path, content, append, createParents)
        promise.resolve(output)
      } catch (error: Throwable) {
        promise.reject("SHIZUKU_WRITE_FAILED", error.message, error)
      }
    }
  }

  @ReactMethod
  fun replaceText(path: String, oldText: String, newText: String, replaceAll: Boolean, promise: Promise) {
    executor.execute {
      try {
        val output = getServiceBlocking().replaceText(path, oldText, newText, replaceAll)
        promise.resolve(output)
      } catch (error: Throwable) {
        promise.reject("SHIZUKU_REPLACE_FAILED", error.message, error)
      }
    }
  }

  @ReactMethod
  fun copyFile(sourcePath: String, targetPath: String, overwrite: Boolean, createParents: Boolean, promise: Promise) {
    executor.execute {
      try {
        val output = getServiceBlocking().copyFile(sourcePath, targetPath, overwrite, createParents)
        promise.resolve(output)
      } catch (error: Throwable) {
        promise.reject("SHIZUKU_COPY_FAILED", error.message, error)
      }
    }
  }

  @ReactMethod
  fun moveFile(sourcePath: String, targetPath: String, overwrite: Boolean, createParents: Boolean, promise: Promise) {
    executor.execute {
      try {
        val output = getServiceBlocking().moveFile(sourcePath, targetPath, overwrite, createParents)
        promise.resolve(output)
      } catch (error: Throwable) {
        promise.reject("SHIZUKU_MOVE_FAILED", error.message, error)
      }
    }
  }

  private fun buildStatusMap(permissionOverride: Boolean? = null): WritableNativeMap {
    val result = WritableNativeMap()
    val running = try {
      Shizuku.pingBinder()
    } catch (_: Throwable) {
      false
    }
    val granted = permissionOverride ?: (running && hasPermission())
    result.putBoolean("available", true)
    result.putBoolean("running", running)
    result.putBoolean("permissionGranted", granted)
    result.putInt("uid", if (running) Shizuku.getUid() else -1)
    result.putInt("version", if (running) Shizuku.getVersion() else -1)
    return result
  }

  private fun hasPermission(): Boolean {
    return Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED
  }

  private fun ensurePermissionListener() {
    if (permissionListenerRegistered) return
    try {
      Shizuku.addRequestPermissionResultListener(permissionListener)
      permissionListenerRegistered = true
    } catch (_: Throwable) {
      // Shizuku may not be installed or available yet. Request/status calls will retry later.
    }
  }

  private fun ensureReady() {
    if (!Shizuku.pingBinder()) {
      throw IllegalStateException("Shizuku 未运行，请先启动 Shizuku")
    }
    if (!hasPermission()) {
      throw IllegalStateException("未获得 Shizuku 授权，请先在设置页请求授权")
    }
  }

  private fun getServiceBlocking(): IShizukuFileService {
    ensureReady()
    service?.let { return it }

    synchronized(lock) {
      service?.let { return it }
      val latch = CountDownLatch(1)
      bindLatch = latch
      Shizuku.bindUserService(userServiceArgs, serviceConnection)
    }

    val connected = bindLatch?.await(10, TimeUnit.SECONDS) == true
    if (!connected) {
      throw IllegalStateException("Shizuku 文件服务连接超时")
    }
    return service ?: throw IllegalStateException("Shizuku 文件服务未连接")
  }

  companion object {
    private const val REQUEST_SHIZUKU_PERMISSION = 6201
    private const val MAX_READ_BYTES = 1024 * 1024
  }
}
