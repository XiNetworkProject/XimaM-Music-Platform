const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MEDIA_PROVIDER_KOTLIN = `package com.anonymous.synauramobile

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL

class MediaBrowserContentProvider : ContentProvider() {

    companion object {
        private const val BASE_URL = "https://xima-m-music-platform.vercel.app"

        private val ROOT_CATEGORIES = listOf(
            mapOf("id" to "pour-toi", "title" to "Pour toi"),
            mapOf("id" to "tendances", "title" to "Tendances"),
            mapOf("id" to "nouveautes", "title" to "Nouveautés"),
            mapOf("id" to "populaires", "title" to "Populaires")
        )
    }

    override fun onCreate(): Boolean = true

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor {
        val parentId = uri.getQueryParameter("parentId") ?: "root"
        val cursor = MatrixCursor(arrayOf("id", "title", "subtitle", "artwork", "playable", "audio_url"))

        if (parentId == "root") {
            ROOT_CATEGORIES.forEach { cat ->
                cursor.addRow(arrayOf(cat["id"], cat["title"], "", "", "false", ""))
            }
        } else {
            val endpoint = when (parentId) {
                "pour-toi" -> "/api/ranking/feed?limit=30&ai=0&cursor=0&strategy=reco"
                "tendances" -> "/api/tracks/trending?limit=30"
                "nouveautes" -> "/api/tracks/recent?limit=30"
                "populaires" -> "/api/tracks/popular?limit=30"
                else -> return cursor
            }
            try {
                val json = URL(BASE_URL + endpoint).readText()
                val obj = JSONObject(json)
                val tracks: JSONArray = obj.optJSONArray("tracks") ?: return cursor
                for (i in 0 until tracks.length()) {
                    val t = tracks.getJSONObject(i)
                    val artist = t.optJSONObject("artist")
                    val artistName = artist?.optString("artistName")
                        ?: artist?.optString("name")
                        ?: artist?.optString("username")
                        ?: "Artiste"
                    cursor.addRow(arrayOf(
                        t.optString("_id"),
                        t.optString("title", "Sans titre"),
                        artistName,
                        t.optString("coverUrl", ""),
                        "true",
                        t.optString("audioUrl", "")
                    ))
                }
            } catch (_: Exception) {
                // Network error — return empty
            }
        }
        return cursor
    }

    override fun getType(uri: Uri): String = "vnd.android.cursor.dir/media"
    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0
}
`;

module.exports = function withMediaBrowser(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const pkg = 'com.anonymous.synauramobile';
      const javaDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...pkg.split('.')
      );

      if (!fs.existsSync(javaDir)) {
        fs.mkdirSync(javaDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(javaDir, 'MediaBrowserContentProvider.kt'),
        MEDIA_PROVIDER_KOTLIN,
        'utf-8'
      );

      return mod;
    },
  ]);
};
