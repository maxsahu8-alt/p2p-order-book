package com.p2p.orderbook;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.Manifest;
import android.content.pm.PackageManager;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

/**
 * P2P Order Book — Android shell.
 * The app itself (web/index.html) is copied into internal storage and served at
 * https://appassets.androidplatform.net/app/. On every start the loader checks
 * web/version.json on GitHub and downloads newer files, so screens and features
 * update without installing a new APK.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/app/index.html";
    static final int FILE_REQ = 7;
    static final int VOICE_REQ = 8;
    TextToSpeech tts;
    boolean ttsReady = false;
    String pendingSpeak = null, pendingLang = "en-IN";

    WebView web;
    ValueCallback<Uri[]> fileCb;
    SharedPreferences prefs;
    volatile boolean checking = false;
    volatile boolean webReady = false;
    final ArrayList<String> sharedQ = new ArrayList<>();

    @Override
    protected void onCreate(Bundle state) {
        // Keep the splash up until the app screen is ready, so there is no blank gap before the opening animation.
        SplashScreen sp = SplashScreen.installSplashScreen(this);
        sp.setKeepOnScreenCondition(() -> !webReady);
        sp.setOnExitAnimationListener(v -> v.getView().animate().alpha(0f).setDuration(280).withEndAction(v::remove).start());
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> webReady = true, 2500);
        super.onCreate(state);
        prefs = getSharedPreferences("p2p", MODE_PRIVATE);
        getWindow().setStatusBarColor(Color.parseColor("#0b0f16"));
        getWindow().setNavigationBarColor(Color.parseColor("#0b0f16"));
        try { installBundled(); } catch (Exception e) { toast("Setup error: " + e.getMessage()); }

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW); // database phone runs on http://100.x.x.x
        s.setSupportMultipleWindows(false);
        s.setTextZoom(100);
        // Match the opening colour to the app theme (light or dark) so there is no dark-to-white flash.
        String tm = prefs.getString("tmode", prefs.getString("theme", "dark"));
        boolean lightNow = "light".equals(tm) || ("system".equals(tm)
                && !phoneIsDark());
        final int bgc = Color.parseColor(lightNow ? "#f4f5f7" : "#0c0d0e");
        web.setBackgroundColor(bgc);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(bgc));

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/app/", new WebViewAssetLoader.InternalStoragePathHandler(this, dir("app")))
                .addPathHandler("/_blob/", new WebViewAssetLoader.InternalStoragePathHandler(this, dir("blobs")))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u.toString());
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                if (!checking) new Thread(() -> checkUpdates(false)).start();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                if (p.isCaptureEnabled()) {
                    try {
                        java.io.File dir = new java.io.File(getCacheDir(), "share");
                        dir.mkdirs();
                        java.io.File f = new java.io.File(dir, "cam_" + System.currentTimeMillis() + ".jpg");
                        camUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", f);
                        Intent c = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        c.putExtra(MediaStore.EXTRA_OUTPUT, camUri);
                        c.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivityForResult(c, CAM_REQ);
                        return true;
                    } catch (Exception e) { camUri = null; }
                }
                Intent i = p.createIntent();
                i.addCategory(Intent.CATEGORY_OPENABLE);
                String[] types = p.getAcceptTypes();
                List<String> mimes = new ArrayList<>();
                for (String t : types) for (String one : t.split(",")) mime(one.trim(), mimes);
                if (mimes.isEmpty() || mimes.contains("*/*")) i.setType("*/*");
                else if (mimes.size() == 1) i.setType(mimes.get(0));
                else { i.setType("*/*"); i.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toArray(new String[0])); }
                if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try { startActivityForResult(i, FILE_REQ); } catch (ActivityNotFoundException e) { fileCb = null; return false; }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "P2PNative");
        web.addJavascriptInterface(new OcrBridge(), "P2POcr");
        setContentView(web);
        web.loadUrl(START);
        if (state == null) handleShare(getIntent());
    }

    // ---------------------------------------------------------------- screenshots shared from the gallery
    /** The phone's real theme (not Pexai's own), because WebView often reports "dark" whatever the phone says. */
    static boolean phoneIsDark() {
        try {
            return (android.content.res.Resources.getSystem().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        } catch (Exception e) { return true; }
    }

    @Override
    public void onConfigurationChanged(Configuration c) {
        super.onConfigurationChanged(c);
        try { if (web != null) web.evaluateJavascript("window.P2PSys&&P2PSys()", null); } catch (Exception e) { }
    }

    @Override
    protected void onNewIntent(Intent it) {
        super.onNewIntent(it);
        setIntent(it);
        handleShare(it);
    }

    /** Copies pictures shared to Pexai (Share > Pexai) into the app's private blob folder and tells the web app. */
    void handleShare(Intent it) {
        if (it == null) return;
        final String act = it.getAction();
        if (!Intent.ACTION_SEND.equals(act) && !Intent.ACTION_SEND_MULTIPLE.equals(act)) return;
        final ArrayList<Uri> uris = new ArrayList<>();
        try {
            if (Intent.ACTION_SEND.equals(act)) {
                Uri u = it.getParcelableExtra(Intent.EXTRA_STREAM);
                if (u != null) uris.add(u);
            } else {
                ArrayList<Uri> l = it.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (l != null) uris.addAll(l);
            }
            ClipData cd = it.getClipData();
            if (uris.isEmpty() && cd != null) for (int i = 0; i < cd.getItemCount(); i++) { Uri u = cd.getItemAt(i).getUri(); if (u != null) uris.add(u); }
        } catch (Exception e) { }
        it.setAction(Intent.ACTION_MAIN); // do not handle the same share twice
        if (uris.isEmpty()) return;
        new Thread(() -> {
            int n = 0;
            try {
                File d = dir("blobs");
                File[] old = d.listFiles();
                if (old != null) for (File f : old) if (f.getName().startsWith("share_") && System.currentTimeMillis() - f.lastModified() > 86400000L) f.delete();
                for (Uri u : uris) {
                    if (n >= 10) break;
                    try {
                        String mt = getContentResolver().getType(u);
                        if (mt != null && !mt.startsWith("image/")) continue;
                        String ext = mt != null && mt.contains("png") ? "png" : mt != null && mt.contains("webp") ? "webp" : "jpg";
                        File out = new File(d, "share_" + System.currentTimeMillis() + "_" + n + "." + ext);
                        try (InputStream in = getContentResolver().openInputStream(u); OutputStream os = new FileOutputStream(out)) {
                            if (in == null) continue;
                            byte[] buf = new byte[16384]; int r; long tot = 0;
                            while ((r = in.read(buf)) > 0) { tot += r; if (tot > 25L * 1024 * 1024) break; os.write(buf, 0, r); }
                        }
                        synchronized (sharedQ) { sharedQ.add(out.getName()); }
                        n++;
                    } catch (Exception e) { }
                }
            } catch (Exception e) { }
            if (n > 0) runOnUiThread(() -> web.evaluateJavascript("window.P2PCheckShared&&P2PCheckShared()", null));
            else runOnUiThread(() -> toast("Could not read the shared picture"));
        }).start();
    }

    static void mime(String t, List<String> out) {
        if (t.isEmpty()) return;
        if (t.contains("/")) { if (!out.contains(t)) out.add(t); return; }
        String m;
        switch (t.toLowerCase(Locale.ROOT)) {
            case ".json": m = "application/json"; break;
            case ".csv": m = "text/comma-separated-values"; break;
            case ".pdf": m = "application/pdf"; break;
            case ".xlsx": m = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; break;
            case ".xls": m = "application/vnd.ms-excel"; break;
            default: m = "*/*";
        }
        if (!out.contains(m)) out.add(m);
        if (m.equals("text/comma-separated-values") && !out.contains("text/csv")) out.add("text/csv");
    }

    // ---- in-app listening (no Google popup): SpeechRecognizer + mic permission
    static final int MIC_PERM_REQ = 7311;
    SpeechRecognizer sr;
    String micLang = null;

    void startListen(String lang) {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { popupListen(lang); return; }
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            micLang = lang == null ? "en-IN" : lang;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_PERM_REQ);
            return;
        }
        try {
            if (sr == null) {
                sr = SpeechRecognizer.createSpeechRecognizer(this);
                sr.setRecognitionListener(new RecognitionListener() {
                    boolean sent = false;
                    public void onReadyForSpeech(Bundle b) { sent = false; js("P2PVoiceEvent", "ready"); }
                    public void onBeginningOfSpeech() { js("P2PVoiceEvent", "speech"); }
                    public void onRmsChanged(float v) { }
                    public void onBufferReceived(byte[] b) { }
                    public void onEndOfSpeech() { js("P2PVoiceEvent", "end"); }
                    public void onError(int e) {
                        if (sent) return; sent = true;
                        if (e == SpeechRecognizer.ERROR_NO_MATCH || e == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) js("P2PVoiceResult", "");
                        else if (e == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) js("P2PVoiceResult", "__ERR__:Microphone not allowed. Allow it in phone settings.");
                        else if (e == SpeechRecognizer.ERROR_NETWORK || e == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) js("P2PVoiceResult", "__ERR__:No internet for voice. Try again.");
                        else js("P2PVoiceResult", "__ERR__:Couldn't hear. Tap the orb and try again.");
                    }
                    public void onResults(Bundle b) {
                        if (sent) return; sent = true;
                        ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        js("P2PVoiceResult", r != null && !r.isEmpty() ? r.get(0) : "");
                    }
                    public void onPartialResults(Bundle b) {
                        ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (r != null && !r.isEmpty()) js("P2PVoicePartial", r.get(0));
                    }
                    public void onEvent(int t, Bundle b) { }
                });
            }
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang == null || lang.isEmpty() ? "en-IN" : lang);
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            sr.cancel();
            sr.startListening(i);
        } catch (Exception e) { popupListen(lang); }
    }

    void popupListen(String lang) {
        try {
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang == null || lang.isEmpty() ? "en-IN" : lang);
            i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Bolo…");
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            startActivityForResult(i, VOICE_REQ);
        } catch (ActivityNotFoundException e) { js("P2PVoiceResult", "__ERR__:No voice app. Install or update the Google app."); }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req == MIC_PERM_REQ) {
            String lang = micLang; micLang = null;
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) startListen(lang);
            else js("P2PVoiceResult", "__ERR__:Microphone not allowed. Allow it in phone settings.");
            return;
        }
        super.onRequestPermissionsResult(req, perms, res);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == VOICE_REQ) {
            String text = "";
            if (res == RESULT_OK && data != null) {
                ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (r != null && !r.isEmpty()) text = r.get(0);
            }
            js("P2PVoiceResult", text);
            return;
        }
        if (req == CAM_REQ) {
            if (fileCb != null) {
                fileCb.onReceiveValue(res == RESULT_OK && camUri != null ? new Uri[]{camUri} : null);
                fileCb = null;
            }
            camUri = null;
            return;
        }
        if (req == FILE_REQ && fileCb != null) {
            Uri[] result = null;
            if (res == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    result = new Uri[n];
                    for (int k = 0; k < n; k++) result[k] = data.getClipData().getItemAt(k).getUri();
                } else if (data.getData() != null) result = new Uri[]{data.getData()};
            }
            fileCb.onReceiveValue(result);
            fileCb = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (sr != null) { try { sr.destroy(); } catch (Exception e) { } }
        super.onDestroy();
    }

    static final int CAM_REQ = 7301;
    Uri camUri = null;

    // Screenshot reader on the phone itself (Google ML Kit, model bundled in the app): no internet, fast.
    // The page calls P2POcr.recognize(id, base64); the answer comes back through window.P2POcrResult(id, text, conf, err).
    TextRecognizer ocrRec;

    class OcrBridge {
        @JavascriptInterface
        public void recognize(final String id, final String b64) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String s = b64 == null ? "" : b64;
                        int comma = s.indexOf(',');
                        if (s.startsWith("data:") && comma > 0) s = s.substring(comma + 1);
                        byte[] raw = Base64.decode(s, Base64.DEFAULT);
                        BitmapFactory.Options bo = new BitmapFactory.Options();
                        bo.inJustDecodeBounds = true;
                        BitmapFactory.decodeByteArray(raw, 0, raw.length, bo);
                        int longSide = Math.max(bo.outWidth, bo.outHeight);
                        int sample = 1;
                        while (longSide / sample > 3200) sample *= 2;
                        BitmapFactory.Options o = new BitmapFactory.Options();
                        o.inSampleSize = sample;
                        Bitmap bmp = BitmapFactory.decodeByteArray(raw, 0, raw.length, o);
                        if (bmp == null) { ocrOut(id, "", 0, "decode"); return; }
                        if (ocrRec == null) ocrRec = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
                        ocrRec.process(InputImage.fromBitmap(bmp, 0))
                            .addOnSuccessListener(new com.google.android.gms.tasks.OnSuccessListener<com.google.mlkit.vision.text.Text>() {
                                @Override
                                public void onSuccess(com.google.mlkit.vision.text.Text result) {
                                    ocrOut(id, result.getText(), 90, null);
                                }
                            })
                            .addOnFailureListener(new com.google.android.gms.tasks.OnFailureListener() {
                                @Override
                                public void onFailure(Exception e) {
                                    ocrOut(id, "", 0, String.valueOf(e.getMessage()));
                                }
                            });
                    } catch (Throwable t) {
                        ocrOut(id, "", 0, String.valueOf(t.getMessage()));
                    }
                }
            }).start();
        }
    }

    void ocrOut(String id, String text, long conf, String err) {
        final String js = "window.P2POcrResult&&P2POcrResult(" + JSONObject.quote(id) + "," + JSONObject.quote(text) + "," + conf + ","
            + (err == null ? "null" : JSONObject.quote(err)) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    static Locale localeOf(String tag) {
        try { return Locale.forLanguageTag(tag == null || tag.isEmpty() ? "en-IN" : tag); } catch (Exception e) { return new Locale("en", "IN"); }
    }

    void doSpeak(String text, String lang) {
        if (tts == null) {
            pendingSpeak = text; pendingLang = lang;
            tts = new TextToSpeech(this, status -> {
                ttsReady = status == TextToSpeech.SUCCESS;
                if (!ttsReady) { js("P2PSpeakDone", "error"); return; }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) {}
                    @Override public void onDone(String id) { js("P2PSpeakDone", ""); }
                    @Override public void onError(String id) { js("P2PSpeakDone", "error"); }
                });
                if (pendingSpeak != null) { String t = pendingSpeak; pendingSpeak = null; doSpeak(t, pendingLang); }
            });
            return;
        }
        if (!ttsReady) { pendingSpeak = text; pendingLang = lang; return; }
        int r = tts.setLanguage(localeOf(lang));
        if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(Locale.ENGLISH);
        tts.setSpeechRate(1.05f);
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "p2p" + System.currentTimeMillis());
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.P2PBack&&window.P2PBack())?'1':'0'", r -> {
            if (r == null || !r.contains("1")) MainActivity.super.onBackPressed();
        });
    }

    // ---------------------------------------------------------------- files
    File dir(String name) { File d = new File(getFilesDir(), name); if (!d.exists()) d.mkdirs(); return d; }

    static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[65536]; int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        in.close();
        return b.toByteArray();
    }

    static void writeAtomic(File f, byte[] data) throws Exception {
        File parent = f.getParentFile(); if (parent != null && !parent.exists()) parent.mkdirs();
        File tmp = new File(f.getPath() + ".tmp");
        try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(data); o.getFD().sync(); }
        if (!tmp.renameTo(f)) { f.delete(); if (!tmp.renameTo(f)) throw new Exception("rename failed"); }
    }

    static String sha1(byte[] b) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        StringBuilder sb = new StringBuilder();
        for (byte x : md.digest(b)) sb.append(String.format("%02x", x));
        return sb.toString();
    }

    static String safeName(String n) { return n.replaceAll("[^A-Za-z0-9._\\-]", "_"); }

    /** Copy the web app shipped inside the APK into storage when it is newer than what is installed. */
    void installBundled() throws Exception {
        AssetManager am = getAssets();
        JSONObject v = new JSONObject(new String(readAll(am.open("web/version.json")), StandardCharsets.UTF_8));
        String bundled = v.optString("web", "0");
        String installed = prefs.getString("webVer", "");
        File index = new File(dir("app"), "index.html");
        if (!installed.isEmpty() && index.exists() && cmp(installed, bundled) >= 0) return;
        JSONObject files = v.getJSONObject("files");
        Iterator<String> it = files.keys();
        while (it.hasNext()) {
            String f = it.next();
            writeAtomic(new File(dir("app"), f), readAll(am.open("web/" + f)));
        }
        writeAtomic(new File(dir("app"), "version.json"), v.toString().getBytes(StandardCharsets.UTF_8));
        prefs.edit().putString("webVer", bundled).putString("webFiles", files.toString()).apply();
    }

    static int cmp(String a, String b) {
        try { return new BigDecimal(a.trim()).compareTo(new BigDecimal(b.trim())); } catch (Exception e) { return a.compareTo(b); }
    }

    // ---------------------------------------------------------------- updates
    static byte[] httpGet(String u) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
        c.setConnectTimeout(8000); c.setReadTimeout(30000);
        c.setRequestProperty("Cache-Control", "no-cache");
        c.setInstanceFollowRedirects(true);
        int code = c.getResponseCode();
        if (code != 200) throw new Exception("HTTP " + code);
        return readAll(c.getInputStream());
    }

    synchronized void checkUpdates(boolean manual) {
        String base = BuildConfig.UPDATE_BASE;
        if (base == null || base.isEmpty()) { if (manual) js("P2PCheckResult", "Updates are not set up in this build"); return; }
        checking = true;
        try {
            JSONObject v = new JSONObject(new String(httpGet(base + "version.json?t=" + System.currentTimeMillis()), StandardCharsets.UTF_8));
            prefs.edit().putLong("lastCheck", System.currentTimeMillis()).apply();
            String remote = v.optString("web", "0");
            String installed = prefs.getString("webVer", "0");
            boolean updated = false;
            if (cmp(remote, installed) > 0) {
                JSONObject files = v.getJSONObject("files");
                JSONObject have = new JSONObject(prefs.getString("webFiles", "{}"));
                File staging = new File(getFilesDir(), "app_new");
                deleteTree(staging); staging.mkdirs();
                List<String> changed = new ArrayList<>();
                Iterator<String> it = files.keys();
                while (it.hasNext()) {
                    String f = it.next();
                    String want = files.getString(f);
                    if (want.equals(have.optString(f)) && new File(dir("app"), f).exists()) continue;
                    byte[] b = httpGet(base + f + "?v=" + remote);
                    if (!want.isEmpty() && !want.equals(sha1(b))) throw new Exception("download check failed: " + f);
                    if (f.equals("index.html")) {
                        String t = new String(b, StandardCharsets.UTF_8);
                        if (b.length < 50000 || !t.contains("P2P Order Book")) throw new Exception("bad app file");
                    }
                    writeAtomic(new File(staging, f), b);
                    changed.add(f);
                }
                for (String f : changed) writeAtomic(new File(dir("app"), f), readAll(new FileInputStream(new File(staging, f))));
                writeAtomic(new File(dir("app"), "version.json"), v.toString().getBytes(StandardCharsets.UTF_8));
                deleteTree(staging);
                prefs.edit().putString("webVer", remote).putString("webFiles", files.toString()).apply();
                updated = true;
                js("P2PUpdated", remote);
            }
            JSONObject apk = v.optJSONObject("apk");
            if (apk != null && apk.optInt("code", 0) > BuildConfig.VERSION_CODE) {
                String day = new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date());
                String key = "apkShown" + apk.optInt("code");
                if (manual || !day.equals(prefs.getString(key, ""))) {
                    prefs.edit().putString(key, day).apply();
                    final String a = apk.toString();
                    runOnUiThread(() -> web.evaluateJavascript("window.P2PApkUpdate&&P2PApkUpdate(" + a + ")", null));
                }
            }
            if (manual && !updated) js("P2PCheckResult", "Pexai is up to date (v" + prefs.getString("webVer", "") + ")");
            else if (manual) js("P2PCheckResult", "Updated to v" + remote + ". Tap Reload.");
        } catch (Exception e) {
            if (manual) js("P2PCheckResult", "Couldn't check for updates: " + e.getMessage());
        } finally { checking = false; }
    }

    static void deleteTree(File f) {
        if (f == null || !f.exists()) return;
        File[] k = f.listFiles();
        if (k != null) for (File c : k) deleteTree(c);
        f.delete();
    }

    void js(String fn, String arg) {
        final String a = JSONObject.quote(arg);
        runOnUiThread(() -> web.evaluateJavascript("window." + fn + "&&" + fn + "(" + a + ")", null));
    }

    void toast(String t) { runOnUiThread(() -> Toast.makeText(this, t, Toast.LENGTH_LONG).show()); }

    void openExternal(String u) {
        try {
            Intent i = u.startsWith("intent:") ? Intent.parseUri(u, Intent.URI_INTENT_SCHEME) : new Intent(Intent.ACTION_VIEW, Uri.parse(u));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) { toast("No app found to open this link"); }
    }

    // ---------------------------------------------------------------- bridge for the web app
    class Bridge {
        @JavascriptInterface
        public void appReady() { webReady = true; }

        /** Names of pictures shared to Pexai that the web app has not picked up yet (JSON array). */
        @JavascriptInterface
        public String takeShared() {
            synchronized (sharedQ) { String r = new JSONArray(sharedQ).toString(); sharedQ.clear(); return r; }
        }

        /** The web app has read the shared pictures; delete the private copies. */
        @JavascriptInterface
        public void dropShared(String json) {
            try {
                JSONArray a = new JSONArray(json);
                for (int i = 0; i < a.length(); i++) {
                    String n = a.getString(i);
                    if (n.startsWith("share_") && n.indexOf('/') < 0 && n.indexOf("..") < 0) new File(dir("blobs"), n).delete();
                }
            } catch (Exception e) { }
        }

        /** The theme chosen inside Pexai ("light", "dark" or "system"). Also tells Android, so the opening screen matches next time. */
        @JavascriptInterface
        public boolean sysDark() { return phoneIsDark(); }

        @JavascriptInterface
        public void setThemeMode(String t) {
            final String m = "light".equals(t) ? "light" : "system".equals(t) ? "system" : "dark";
            try { prefs.edit().putString("tmode", m).apply(); } catch (Exception e) { }
            if (Build.VERSION.SDK_INT < 31) return;
            runOnUiThread(() -> {
                try {
                    android.app.UiModeManager um = (android.app.UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
                    int mode = "light".equals(m) ? 1 : "dark".equals(m) ? 2 : 0; // NIGHT_NO, NIGHT_YES, AUTO (follow phone)
                    java.lang.reflect.Method f = android.app.UiModeManager.class.getMethod("setApplicationNightMode", int.class);
                    f.invoke(um, mode);
                } catch (Throwable e) { /* not allowed on this Android: the opening screen then follows the phone theme */ }
            });
        }

        @JavascriptInterface
        public void setTheme(String t) {
            try { prefs.edit().putString("theme", "light".equals(t) ? "light" : "dark").apply(); } catch (Exception e) { }
        }

        @JavascriptInterface
        public String setWidget(String json) {
            try {
                getSharedPreferences(P2PWidget.PREF, MODE_PRIVATE).edit().putString("json", json).apply();
                P2PWidget.refresh(getApplicationContext());
                return "ok";
            } catch (Exception e) { return "error"; }
        }

        @JavascriptInterface
        public String loadData() {
            try {
                File f = new File(getFilesDir(), "data.json");
                return f.exists() ? new String(readAll(new FileInputStream(f)), StandardCharsets.UTF_8) : "";
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public String saveData(String json) {
            try {
                byte[] b = json.getBytes(StandardCharsets.UTF_8);
                writeAtomic(new File(getFilesDir(), "data.json"), b);
                // one safety copy per day, last 7 days kept
                String day = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
                File daily = new File(dir("daily"), "data-" + day + ".json");
                if (!daily.exists() || daily.length() < b.length / 2 || System.currentTimeMillis() - daily.lastModified() > 3600_000L) writeAtomic(daily, b);
                File[] all = dir("daily").listFiles();
                if (all != null && all.length > 7) {
                    Arrays.sort(all, (x, y) -> x.getName().compareTo(y.getName()));
                    for (int k = 0; k < all.length - 7; k++) all[k].delete();
                }
                return "ok";
            } catch (Exception e) { return e.getMessage() == null ? "error" : e.getMessage(); }
        }

        @JavascriptInterface
        public String saveFile(String name, String b64, String mime) {
            try {
                byte[] b = Base64.decode(b64, Base64.DEFAULT);
                name = safeName(name);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    cv.put(MediaStore.Downloads.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                    cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/P2P Order Book");
                    Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (u == null) return "couldn't create file";
                    try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(b); }
                } else {
                    File d = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "");
                    d.mkdirs();
                    writeAtomic(new File(d, name), b);
                }
                return "ok";
            } catch (Exception e) { return e.getMessage() == null ? "error" : e.getMessage(); }
        }

        @JavascriptInterface
        public String saveBlob(String id, String b64) {
            try { writeAtomic(new File(dir("blobs"), safeName(id)), Base64.decode(b64, Base64.DEFAULT)); return "ok"; }
            catch (Exception e) { return e.getMessage() == null ? "error" : e.getMessage(); }
        }

        @JavascriptInterface
        public String listBlobs() {
            JSONArray a = new JSONArray();
            File[] k = dir("blobs").listFiles();
            if (k != null) for (File f : k) {
                try { a.put(new JSONObject().put("id", f.getName()).put("sizeBytes", f.length())); } catch (Exception ignored) {}
            }
            return a.toString();
        }

        @JavascriptInterface
        public void deleteBlob(String id) { new File(dir("blobs"), safeName(id)).delete(); }

        @JavascriptInterface
        public void shareFile(String name, String b64, String mime, String text) {
            try {
                File d = new File(getCacheDir(), "share"); deleteTree(d); d.mkdirs();
                File f = new File(d, safeName(name));
                writeAtomic(f, Base64.decode(b64, Base64.DEFAULT));
                Uri u = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", f);
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                i.putExtra(Intent.EXTRA_STREAM, u);
                if (text != null && !text.isEmpty()) i.putExtra(Intent.EXTRA_TEXT, text);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(Intent.createChooser(i, "Share"));
            } catch (Exception e) { toast("Couldn't share: " + e.getMessage()); }
        }

        @JavascriptInterface
        public void shareText(String text) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(i, "Share"));
        }

        @JavascriptInterface
        public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("P2P Order Book", text));
        }

        @JavascriptInterface
        public String paste() {
            try {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData c = cm.getPrimaryClip();
                return c != null && c.getItemCount() > 0 ? String.valueOf(c.getItemAt(0).coerceToText(MainActivity.this)) : "";
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public void openUrl(String u) { if (u != null && !u.isEmpty()) openExternal(u); }

        @JavascriptInterface
        public String appInfo() {
            try {
                return new JSONObject()
                        .put("apk", BuildConfig.VERSION_NAME)
                        .put("code", BuildConfig.VERSION_CODE)
                        .put("web", prefs.getString("webVer", ""))
                        .put("lastCheck", prefs.getLong("lastCheck", 0))
                        .put("channel", BuildConfig.UPDATE_BASE)
                        .toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public String hasVoice() { return "2"; }

        @JavascriptInterface
        public void listen(String lang) { runOnUiThread(() -> startListen(lang)); }

        @JavascriptInterface
        public void stopListen() { runOnUiThread(() -> { if (sr != null) try { sr.cancel(); } catch (Exception e) { } }); }

        @JavascriptInterface
        public void speak(String text, String lang) { runOnUiThread(() -> doSpeak(text, lang)); }

        @JavascriptInterface
        public void stopSpeak() { runOnUiThread(() -> { if (tts != null) tts.stop(); }); }

        @JavascriptInterface
        public void checkUpdate() { new Thread(() -> checkUpdates(true)).start(); }
    }
}
