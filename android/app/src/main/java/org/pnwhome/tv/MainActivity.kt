package org.pnwhome.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

/**
 * PNW Home: a full-screen WebView showing the shared web core from assets/www, with a
 * JavaScript bridge (PNWAndroid) that lists and launches the other apps on the TV.
 *
 * The page is served from https://appassets.androidapp.com/ by WebViewAssetLoader so it
 * has a real origin: localStorage persists and the Adobe Fonts kit accepts the request.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.setBackgroundDrawableResource(R.color.ground)

        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#1B2A4A"))
            isFocusable = true
            isFocusableInTouchMode = true
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                allowFileAccess = false
                allowContentAccess = false
                setSupportZoom(false)
                displayZoomControls = false
                builtInZoomControls = false
                // Honour the page's <meta name="viewport" content="width=1920"> and scale that
                // 1920px design to the screen, whatever the device's density.
                useWideViewPort = true
                loadWithOverviewMode = true
                // The TV's accessibility font-size setting must not reflow a fixed layout.
                textZoom = 100
            }
            setInitialScale(0)
            addJavascriptInterface(AppBridge(this@MainActivity), "PNWAndroid")
        }

        val loader = WebViewAssetLoader.Builder()
            .setDomain(ASSET_HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)

            // Keep the page inside the app: no navigation away from the asset host.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.host != ASSET_HOST
        }

        setContentView(web)
        hideSystemBars()
        web.loadUrl("https://$ASSET_HOST/assets/www/index.html")
    }

    /**
     * D-pad and OK keys go straight to the page as synthetic key events with the keyCodes the
     * web core expects (37-40, 13), bypassing WebView focus quirks. Everything else follows
     * the normal path. Back is swallowed: this is a home screen.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val jsCode = when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_LEFT -> 37
            KeyEvent.KEYCODE_DPAD_UP -> 38
            KeyEvent.KEYCODE_DPAD_RIGHT -> 39
            KeyEvent.KEYCODE_DPAD_DOWN -> 40
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_NUMPAD_ENTER, KeyEvent.KEYCODE_BUTTON_A -> 13
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_ESCAPE -> 10009   // Tizen's Back code; the page ignores it at top level
            else -> null
        } ?: return super.dispatchKeyEvent(event)

        val type = when (event.action) {
            KeyEvent.ACTION_DOWN -> "keydown"
            KeyEvent.ACTION_UP -> "keyup"
            else -> return true
        }
        if (::web.isInitialized) {
            web.evaluateJavascript("window.PNWKey && window.PNWKey('$type', $jsCode, ${event.repeatCount > 0});", null)
        }
        return true
    }

    @Deprecated("Back does nothing on a home screen")
    override fun onBackPressed() { /* intentionally empty */ }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        if (::web.isInitialized) {
            web.onResume()
            // The page listens for visibilitychange; nudge it so the dock re-reads installed apps.
            web.evaluateJavascript("document.dispatchEvent(new Event('visibilitychange'));", null)
        }
    }

    override fun onPause() {
        if (::web.isInitialized) web.onPause()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
    }

    companion object {
        const val ASSET_HOST = "appassets.androidapp.com"
    }
}
