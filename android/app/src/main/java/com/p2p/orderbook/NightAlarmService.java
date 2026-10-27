package com.p2p.orderbook;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Night order alarm.
 * Listens to KuCoin notifications only. It decides the TYPE of a notification (BUY / SELL / DONE) and keeps only
 * the type and the time. The text of a notification (names, chat messages) is never saved and chat is ignored.
 * A new BUY or SELL order rings a loud alarm again and again until it is acknowledged (or the time limit is over).
 */
public class NightAlarmService extends NotificationListenerService {
    public static final String PREF = "nightalarm";
    static final String CH = "na_alarm";
    static final int NID = 7301;
    static final String ACT_ACK = "com.p2p.orderbook.NA_ACK";

    private static NightAlarmService live;
    private static final Handler H = new Handler(Looper.getMainLooper());

    private MediaPlayer mp;
    private PowerManager.WakeLock wl;
    private String ringKind = "";
    private long ringStart = 0;
    private boolean ringing = false;

    // ------------------------------------------------------------------ settings
    public static SharedPreferences sp(Context c) { return c.getSharedPreferences(PREF, Context.MODE_PRIVATE); }

    public static JSONObject settings(Context c) {
        SharedPreferences p = sp(c);
        JSONObject o = new JSONObject();
        try {
            o.put("on", p.getBoolean("on", false));
            o.put("buy", p.getBoolean("buy", true));
            o.put("sell", p.getBoolean("sell", true));
            o.put("allday", p.getBoolean("allday", true));
            o.put("from", p.getInt("from", 23 * 60));
            o.put("to", p.getInt("to", 8 * 60));
            o.put("buyEvery", p.getInt("buyEvery", 60));
            o.put("sellEvery", p.getInt("sellEvery", 120));
            o.put("maxMin", p.getInt("maxMin", 30));
            o.put("loud", p.getBoolean("loud", true));
            o.put("snoozeUntil", p.getLong("snoozeUntil", 0));
            o.put("pkg", p.getString("pkg", "kucoin"));
            o.put("access", hasAccess(c));
            o.put("ringing", live != null && live.ringing);
            o.put("kind", live != null ? live.ringKind : "");
        } catch (Exception e) { }
        return o;
    }

    public static void save(Context c, String json) {
        try {
            JSONObject o = new JSONObject(json);
            SharedPreferences.Editor e = sp(c).edit();
            if (o.has("on")) e.putBoolean("on", o.getBoolean("on"));
            if (o.has("buy")) e.putBoolean("buy", o.getBoolean("buy"));
            if (o.has("sell")) e.putBoolean("sell", o.getBoolean("sell"));
            if (o.has("allday")) e.putBoolean("allday", o.getBoolean("allday"));
            if (o.has("loud")) e.putBoolean("loud", o.getBoolean("loud"));
            if (o.has("from")) e.putInt("from", clamp(o.getInt("from"), 0, 1439));
            if (o.has("to")) e.putInt("to", clamp(o.getInt("to"), 0, 1439));
            if (o.has("buyEvery")) e.putInt("buyEvery", clamp(o.getInt("buyEvery"), 20, 600));
            if (o.has("sellEvery")) e.putInt("sellEvery", clamp(o.getInt("sellEvery"), 20, 900));
            if (o.has("maxMin")) e.putInt("maxMin", clamp(o.getInt("maxMin"), 1, 120));
            if (o.has("snoozeUntil")) e.putLong("snoozeUntil", o.getLong("snoozeUntil"));
            e.apply();
            if (!o.optBoolean("on", sp(c).getBoolean("on", false)) && live != null) live.stopRing();
        } catch (Exception e) { }
    }

    static int clamp(int v, int a, int b) { return Math.max(a, Math.min(b, v)); }

    public static boolean hasAccess(Context c) {
        try {
            String s = android.provider.Settings.Secure.getString(c.getContentResolver(), "enabled_notification_listeners");
            return s != null && s.contains(c.getPackageName());
        } catch (Exception e) { return false; }
    }

    static boolean inWindow(SharedPreferences p) {
        if (p.getBoolean("allday", true)) return true;
        Calendar c = Calendar.getInstance();
        int now = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
        int a = p.getInt("from", 23 * 60), b = p.getInt("to", 8 * 60);
        if (a == b) return true;
        return a < b ? (now >= a && now < b) : (now >= a || now < b);
    }

    // ------------------------------------------------------------------ event log (type and time only)
    public static JSONArray log(Context c) {
        try { return new JSONArray(sp(c).getString("log", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    static synchronized void addLog(Context c, String kind, boolean rang) {
        try {
            JSONArray a = log(c);
            JSONObject o = new JSONObject();
            o.put("t", System.currentTimeMillis());
            o.put("k", kind);
            o.put("r", rang ? 1 : 0);
            a.put(o);
            JSONArray b = new JSONArray();
            for (int i = Math.max(0, a.length() - 400); i < a.length(); i++) b.put(a.get(i));
            sp(c).edit().putString("log", b.toString()).apply();
        } catch (Exception e) { }
    }

    public static void clearLog(Context c) { sp(c).edit().putString("log", "[]").apply(); }

    // ------------------------------------------------------------------ listener
    @Override
    public void onListenerConnected() { live = this; }

    @Override
    public void onListenerDisconnected() {
        if (live == this) live = null;
        try { if (Build.VERSION.SDK_INT >= 24) requestRebind(new android.content.ComponentName(this, NightAlarmService.class)); } catch (Exception e) { }
    }

    @Override
    public void onDestroy() { stopRing(); if (live == this) live = null; super.onDestroy(); }

    /** Which kind of KuCoin notification is this? Only the title and text are looked at, and they are not kept. */
    static String classify(String title, String text) {
        String t = (title == null ? "" : title).toLowerCase();
        String x = (text == null ? "" : text).toLowerCase();
        if (t.contains("[p2p]") && (t.contains("message") || t.contains("sent"))) return "CHAT";
        boolean p2p = t.contains("p2p") || x.contains("p2p");
        if (!p2p) return "OTHER";
        if (t.contains("complete") || x.contains("you've received") || x.contains("you have received")) return "DONE";
        if (t.contains("action needed") || x.contains("waiting for your payment")) return "BUY";
        if (t.contains("new p2p order") || x.contains("release crypto") || x.contains("buyer is paying")) return "SELL";
        return "OTHER";
    }

    static boolean fromKucoin(Context c, String pkg) {
        if (pkg == null) return false;
        String want = sp(c).getString("pkg", "kucoin").toLowerCase();
        if (c.getPackageName().equals(pkg)) return false;
        return pkg.toLowerCase().contains(want) || pkg.toLowerCase().startsWith("com.kubi");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            SharedPreferences p = sp(this);
            if (!p.getBoolean("on", false)) return;
            if (!fromKucoin(this, sbn.getPackageName())) return;
            Notification n = sbn.getNotification();
            if (n == null || n.extras == null) return;
            if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            CharSequence ti = n.extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence tx = n.extras.getCharSequence(Notification.EXTRA_TEXT);
            String kind = classify(ti == null ? "" : ti.toString(), tx == null ? "" : tx.toString());
            if (kind.equals("CHAT") || kind.equals("OTHER")) return; // never read or kept
            // an update of the same notification (same id and tag) is not a new order
            String key = sbn.getKey();
            long pt = sbn.getPostTime();
            String last = p.getString("lastKey", "");
            if (last.equals(key + "|" + kind + "|" + pt)) return;
            p.edit().putString("lastKey", key + "|" + kind + "|" + pt).apply();

            boolean want = kind.equals("BUY") ? p.getBoolean("buy", true) : kind.equals("SELL") ? p.getBoolean("sell", true) : false;
            boolean snoozed = System.currentTimeMillis() < p.getLong("snoozeUntil", 0);
            boolean ring = want && !snoozed && inWindow(p);
            addLog(this, kind, ring);
            if (ring) startRing(kind);
        } catch (Throwable e) { }
    }

    // ------------------------------------------------------------------ ringing
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (!ringing) return;
            SharedPreferences p = sp(NightAlarmService.this);
            long maxMs = p.getInt("maxMin", 30) * 60000L;
            if (System.currentTimeMillis() - ringStart > maxMs) { stopRing(); return; }
            playOnce();
            int every = ringKind.equals("BUY") ? p.getInt("buyEvery", 60) : p.getInt("sellEvery", 120);
            H.postDelayed(this, every * 1000L);
        }
    };

    private void startRing(String kind) {
        H.post(() -> {
            try {
                // a BUY order is more urgent than a SELL one
                if (ringing && ringKind.equals("BUY") && !kind.equals("BUY")) { showNote(); return; }
                boolean wasRinging = ringing;
                ringKind = kind;
                ringStart = System.currentTimeMillis();
                ringing = true;
                if (wl == null) {
                    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pexai:nightalarm");
                    wl.setReferenceCounted(false);
                }
                if (!wl.isHeld()) wl.acquire(125 * 60000L);
                showNote();
                H.removeCallbacks(tick);
                tick.run();
            } catch (Throwable e) { }
        });
    }

    private void playOnce() {
        try {
            SharedPreferences p = sp(this);
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (p.getBoolean("loud", true)) {
                int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                am.setStreamVolume(AudioManager.STREAM_ALARM, max, 0);
            }
            releasePlayer();
            Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            mp.setDataSource(this, u);
            mp.setLooping(true);
            mp.prepare();
            mp.start();
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                long[] pat = {0, 700, 400, 700, 400, 700};
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(pat, -1), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
                else v.vibrate(pat, -1);
            }
            // sound for 14 seconds, then quiet until the next round
            H.removeCallbacks(quiet);
            H.postDelayed(quiet, 14000);
        } catch (Throwable e) { }
    }

    private final Runnable quiet = new Runnable() { @Override public void run() { releasePlayer(); } };

    private void releasePlayer() {
        try { if (mp != null) { try { mp.stop(); } catch (Exception e) { } mp.release(); } } catch (Exception e) { }
        mp = null;
    }

    private void showNote() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH) == null) {
                NotificationChannel ch = new NotificationChannel(CH, "Night order alarm", NotificationManager.IMPORTANCE_HIGH);
                ch.setSound(null, null);
                ch.enableVibration(false);
                ch.setBypassDnd(true);
                nm.createNotificationChannel(ch);
            }
            Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            open.putExtra("na_ack", true);
            int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent pi = PendingIntent.getActivity(this, 1, open, fl);
            Intent ack = new Intent(this, NightAlarmAck.class).setAction(ACT_ACK);
            PendingIntent pa = PendingIntent.getBroadcast(this, 2, ack, fl);
            boolean buy = ringKind.equals("BUY");
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
            b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                    .setContentTitle(buy ? "BUY order: payment karna hai!" : "SELL order aaya: buyer pay kar raha hai")
                    .setContentText("KuCoin kholo. Dekh liya dabane tak alarm bajega.")
                    .setCategory(Notification.CATEGORY_ALARM)
                    .setContentIntent(pi)
                    .setDeleteIntent(pa)
                    .setAutoCancel(true)
                    .addAction(new Notification.Action.Builder(null, "Dekh liya", pa).build());
            if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_MAX);
            nm.notify(NID, b.build());
        } catch (Throwable e) { }
    }

    public void stopRing() {
        H.post(() -> {
            ringing = false;
            H.removeCallbacks(tick);
            H.removeCallbacks(quiet);
            releasePlayer();
            try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) { }
            try { ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NID); } catch (Exception e) { }
        });
    }

    /** "Dekh liya": stop the alarm. */
    public static void ack(Context c) {
        if (live != null) live.stopRing();
        else { try { ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NID); } catch (Exception e) { } }
    }

    /** A test ring from the settings screen. */
    public static boolean test(Context c) {
        if (live == null) return false;
        addLog(c, "TEST", true);
        live.startRing("BUY");
        return true;
    }

    public static boolean isRinging() { return live != null && live.ringing; }
}
