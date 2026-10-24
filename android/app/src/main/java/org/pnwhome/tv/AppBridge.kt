package org.pnwhome.tv

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/**
 * The window.PNWAndroid object inside the page.
 *
 *   listApps()  -> JSON string: [{ "id": packageName, "name": label, "icon": dataUrl|null }, ...]
 *   launchApp(packageName) -> true if an activity was started
 *
 * Both run on WebView's JavaScript bridge thread; nothing here touches the UI.
 */
class AppBridge(private val ctx: Context) {

    @JavascriptInterface
    fun listApps(): String {
        val pm = ctx.packageManager
        val seen = LinkedHashMap<String, JSONObject>()
        // Leanback (TV) entries first so a TV-flavoured label and icon win over the phone one.
        for (category in listOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)) {
            val probe = Intent(Intent.ACTION_MAIN).addCategory(category)
            val found: List<ResolveInfo> = try {
                pm.queryIntentActivities(probe, PackageManager.MATCH_ALL)
            } catch (e: Exception) { emptyList() }
            for (ri in found) {
                val pkg = ri.activityInfo?.packageName ?: continue
                if (pkg == ctx.packageName || seen.containsKey(pkg)) continue
                val label = try { ri.loadLabel(pm).toString() } catch (e: Exception) { pkg }
                val icon = try { iconDataUrl(ri.loadIcon(pm)) } catch (e: Exception) { null }
                seen[pkg] = JSONObject().put("id", pkg).put("name", label).put("icon", icon ?: JSONObject.NULL)
            }
        }
        return JSONArray(seen.values.toList()).toString()
    }

    @JavascriptInterface
    fun launchApp(packageName: String): Boolean {
        val pm = ctx.packageManager
        val intent = pm.getLeanbackLaunchIntentForPackage(packageName)
            ?: pm.getLaunchIntentForPackage(packageName)
            ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        return try {
            ctx.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun platform(): String = "android"

    /** Renders any drawable to a small PNG data URL (96 px) for the dock tile. */
    private fun iconDataUrl(d: Drawable, size: Int = 96): String {
        val bmp: Bitmap = if (d is BitmapDrawable && d.bitmap != null) {
            Bitmap.createScaledBitmap(d.bitmap, size, size, true)
        } else {
            val b = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val c = Canvas(b)
            d.setBounds(0, 0, size, size)
            d.draw(c)
            b
        }
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 90, out)
        return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }
}
