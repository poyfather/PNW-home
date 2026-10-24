# Keep the JavaScript bridge's public methods: they are called by name from the page.
-keepclassmembers class org.pnwhome.tv.AppBridge {
    @android.webkit.JavascriptInterface <methods>;
}
