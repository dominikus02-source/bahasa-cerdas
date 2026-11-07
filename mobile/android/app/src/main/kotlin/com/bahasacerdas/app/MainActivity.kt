package com.bahasacerdas.app

import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var jumpaActive = false
    private val channelName = "com.bahasacerdas.app/jumpa"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
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
                    else -> result.notImplemented()
                }
            }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // Android 12+ handles auto-enter via setAutoEnterEnabled; do not
        // invoke enterPictureInPictureMode a second time.
        if (jumpaActive && Build.VERSION.SDK_INT in Build.VERSION_CODES.O until Build.VERSION_CODES.S && !isInPictureInPictureMode) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
            enterPictureInPictureMode(params)
        }
    }
}
