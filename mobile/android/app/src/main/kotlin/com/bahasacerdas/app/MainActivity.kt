package com.bahasacerdas.app

import android.app.PictureInPictureParams
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import android.util.Rational
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var jumpaActive = false
    private val jumpaChannelName = "com.bahasacerdas.app/jumpa"
    private var jumpaChannel: MethodChannel? = null
    private val authChannelName = "com.bahasacerdas.app/auth"
    private var authChannel: MethodChannel? = null
    private val screenChannelName = "com.bahasacerdas.app/screen"

    // Only accept our dedicated callback. A custom scheme is not an ownership
    // proof; Supabase PKCE still verifies the code against the WebView verifier.
    private fun oauthUrl(uri: Uri?): String? = uri?.takeIf {
        it.scheme == "bahasacerdas" && it.host == "oauth" && it.path == "/callback" &&
            !it.getQueryParameter("code").isNullOrBlank()
    }?.toString()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        jumpaChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, jumpaChannelName)
        jumpaChannel?.setMethodCallHandler { call, result ->
                when (call.method) {
                    "setJumpaActive" -> {
                        jumpaActive = call.argument<Boolean>("active") == true
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            setPictureInPictureParams(
                                PictureInPictureParams.Builder()
                                    .setAspectRatio(Rational(16, 9))
                                    .setAutoEnterEnabled(jumpaActive)
                                    .build()
                            )
                        }
                        result.success(null)
                    }
                    "enterPictureInPicture" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && jumpaActive && !isFinishing && !isInPictureInPictureMode) {
                            val params = PictureInPictureParams.Builder()
                                .setAspectRatio(Rational(16, 9))
                                .build()
                            result.success(enterPictureInPictureMode(params))
                        } else {
                            result.success(false)
                        }
                    }
                    else -> result.notImplemented()
                }
            }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, screenChannelName).setMethodCallHandler { call, result ->
            when (call.method) {
                // Dipanggil Dart hanya setelah persetujuan MediaProjection diberikan.
                "startService" -> {
                    try {
                        ScreenShareService.start(this)
                        result.success(null)
                    } catch (e: Exception) {
                        result.error("SCREEN_SERVICE", e.message, null)
                    }
                }
                "stopService" -> {
                    ScreenShareService.stop(this)
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
        authChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, authChannelName)
        authChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "getInitialAuthCallback" -> {
                    val url = oauthUrl(intent?.data)
                    // Deliver once. Never replay the same one-time code.
                    if (url != null) intent?.data = null
                    result.success(url)
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        oauthUrl(intent.data)?.let { url ->
            authChannel?.invokeMethod("onAuthCallback", url)
            // If the Flutter listener isn't ready, the code stays available
            // through getInitialAuthCallback on next screen startup.
        }
    }

    override fun onDestroy() {
        // Activity/engine berakhir → jangan biarkan service proyeksi tertinggal.
        ScreenShareService.stop(this)
        super.onDestroy()
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        jumpaChannel?.invokeMethod("onPipChanged", isInPictureInPictureMode)
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // Android 12+ uses system-managed auto-enter (no duplicate manual call).
        if (jumpaActive && Build.VERSION.SDK_INT in Build.VERSION_CODES.O until Build.VERSION_CODES.S && !isInPictureInPictureMode) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
            enterPictureInPictureMode(params)
        }
    }
}
