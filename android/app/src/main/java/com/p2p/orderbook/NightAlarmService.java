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
    static final String CH_SND = "na_alarm_snd";
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
            o.put("listening", live != null);
            o.put("battery", ignoringBattery(c));
            o.put("lang", p.getString("lang", "en"));
            o.put("err", p.getString("err", ""));
            o.put("diag", p.getString("diag", ""));
            o.put("unk", unknown(c));
            o.put("learnedN", learned(c).length());
            o.put("notif", ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).areNotificationsEnabled());
            o.put("ver", BuildConfig.VERSION_NAME);
            o.put("seenAt", p.getLong("seenAt", 0));
            o.put("seenKind", p.getString("seenKind", ""));
            o.put("seenPkg", p.getString("seenPkg", ""));
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
            if (o.has("lang")) e.putString("lang", "hi".equals(o.getString("lang")) ? "hi" : "en");
            if (o.has("snoozeUntil")) e.putLong("snoozeUntil", o.getLong("snoozeUntil"));
            e.apply();
            if (!o.optBoolean("on", sp(c).getBoolean("on", false)) && live != null) live.stopRing();
        } catch (Exception e) { }
    }

    public static boolean ignoringBattery(Context c) {
        try { return ((PowerManager) c.getSystemService(Context.POWER_SERVICE)).isIgnoringBatteryOptimizations(c.getPackageName()); }
        catch (Exception e) { return false; }
    }

    /** Ask Android to connect the listener again (used when access is given but the service is not connected). */
    public static void rebind(Context c) {
        try { if (Build.VERSION.SDK_INT >= 24) requestRebind(new android.content.ComponentName(c, NightAlarmService.class)); } catch (Exception e) { }
    }

    static boolean hi(Context c) { return "hi".equals(sp(c).getString("lang", "en")); }

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

    // ------------------------------------------------------------------ learning
    /** A notification title made safe to keep: lower case, numbers become #, only letters and a few signs. */
    static String normTitle(String t) {
        if (t == null) return "";
        String x = t.toLowerCase();
        x = x.replaceAll("\\d+", "#").replaceAll("[^\\p{L}#:' \\-]", " ").replaceAll("\\s+", " ").trim();
        return x.length() > 80 ? x.substring(0, 80) : x;
    }

    /** Looks like a KuCoin P2P notification that the app does not know yet. */
    static boolean p2pish(String title, String text) {
        String a = ((title == null ? "" : title) + " " + (text == null ? "" : text)).toLowerCase();
        return a.contains("p2p");
    }

    static JSONObject learned(Context c) {
        try { return new JSONObject(sp(c).getString("learn", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    public static JSONArray unknown(Context c) {
        try { return new JSONArray(sp(c).getString("unk", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    static synchronized void addUnknown(Context c, String norm) {
        try {
            if (norm.length() == 0) return;
            JSONArray a = unknown(c), b = new JSONArray();
            boolean found = false;
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                if (o.optString("title").equals(norm)) { o.put("t", System.currentTimeMillis()); o.put("n", o.optInt("n", 1) + 1); found = true; }
                b.put(o);
            }
            if (!found) { JSONObject o = new JSONObject(); o.put("title", norm); o.put("t", System.currentTimeMillis()); o.put("n", 1); b.put(o); }
            JSONArray out = new JSONArray();
            for (int i = Math.max(0, b.length() - 5); i < b.length(); i++) out.put(b.get(i));
            sp(c).edit().putString("unk", out.toString()).apply();
        } catch (Exception e) { }
    }

    /** The person says what an unknown notification is: BUY, SELL, DONE or IGNORE. */
    public static void learn(Context c, String title, String kind) {
        try {
            String k = "BUY".equals(kind) || "SELL".equals(kind) || "DONE".equals(kind) ? kind : "IGNORE";
            String norm = normTitle(title);
            if (norm.length() == 0) return;
            JSONObject l = learned(c);
            if (!l.has(norm) && l.length() >= 40) return;
            l.put(norm, k);
            JSONArray a = unknown(c), b = new JSONArray();
            for (int i = 0; i < a.length(); i++) if (!a.getJSONObject(i).optString("title").equals(norm)) b.put(a.get(i));
            sp(c).edit().putString("learn", l.toString()).putString("unk", b.toString()).apply();
        } catch (Exception e) { }
    }

    public static void forgetLearned(Context c) { sp(c).edit().putString("learn", "{}").putString("unk", "[]").apply(); }

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
            if (!fromKucoin(this, sbn.getPackageName())) return;
            Notification n = sbn.getNotification();
            if (n == null || n.extras == null) return;
            if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            CharSequence ti = n.extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence tx = n.extras.getCharSequence(Notification.EXTRA_TEXT);
            String kind = classify(ti == null ? "" : ti.toString(), tx == null ? "" : tx.toString());
            if (kind.equals("OTHER")) {
                // something the app does not know: use what the person taught it, or ring once and ask
                String nt = normTitle(ti == null ? "" : ti.toString());
                String lk = nt.length() > 0 ? learned(this).optString(nt, "") : "";
                if (lk.equals("IGNORE")) return;
                if (lk.length() > 0) kind = lk;
                else if (p2pish(ti == null ? "" : ti.toString(), tx == null ? "" : tx.toString())) { kind = "UNK"; if (p.getBoolean("on", false)) addUnknown(this, nt); }
            }
            // only the kind, time and app name are kept (this lets the screen show that KuCoin is being heard)
            p.edit().putLong("seenAt", System.currentTimeMillis()).putString("seenKind", kind).putString("seenPkg", sbn.getPackageName()).apply();
            if (!p.getBoolean("on", false)) return;
            if (kind.equals("CHAT") || kind.equals("OTHER")) return; // never read or kept
            // an update of the same notification (same id and tag) is not a new order
            String key = sbn.getKey();
            long pt = sbn.getPostTime();
            String last = p.getString("lastKey", "");
            if (last.equals(key + "|" + kind + "|" + pt)) return;
            p.edit().putString("lastKey", key + "|" + kind + "|" + pt).apply();

            boolean want = kind.equals("BUY") ? p.getBoolean("buy", true) : kind.equals("SELL") ? p.getBoolean("sell", true) : kind.equals("UNK");
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
            if (ringKind.equals("UNK")) { H.postDelayed(() -> { if (ringKind.equals("UNK")) stopRing(); }, 20000); return; }
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
                // the wake lock only keeps the phone awake; the alarm must still ring if it is refused
                try {
                    if (wl == null) {
                        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                        wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pexai:nightalarm");
                        wl.setReferenceCounted(false);
                    }
                    if (!wl.isHeld()) wl.acquire(125 * 60000L);
                } catch (Throwable e) { err("wakelock: " + e.getClass().getSimpleName()); }
                try { showNote(); } catch (Throwable e) { err("note: " + e.getClass().getSimpleName()); }
                H.removeCallbacks(tick);
                tick.run();
            } catch (Throwable e) { err("start: " + e.getClass().getSimpleName()); }
        });
    }

    private void err(String m) { try { sp(this).edit().putString("err", m).apply(); } catch (Exception e) { } }

    private void playOnce() {
        SharedPreferences p = sp(this);
        AudioManager am = null;
        try { am = (AudioManager) getSystemService(Context.AUDIO_SERVICE); } catch (Throwable e) { }
        // raise the alarm volume; this may be refused in Do Not Disturb, and that must never stop the sound
        try {
            if (am != null && p.getBoolean("loud", true)) am.setStreamVolume(AudioManager.STREAM_ALARM, am.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0);
        } catch (Throwable e) { err("volume: " + e.getClass().getSimpleName()); }
        releasePlayer();
        AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        boolean ok = false;
        int[] types = {RingtoneManager.TYPE_ALARM, RingtoneManager.TYPE_RINGTONE, RingtoneManager.TYPE_NOTIFICATION};
        for (int ty : types) {
            if (ok) break;
            try {
                Uri u = RingtoneManager.getActualDefaultRingtoneUri(this, ty);
                if (u == null) u = RingtoneManager.getDefaultUri(ty);
                if (u == null) continue;
                MediaPlayer m = new MediaPlayer();
                m.setAudioAttributes(aa);
                m.setDataSource(this, u);
                m.setLooping(true);
                m.setVolume(1f, 1f);
                m.prepare();
                m.start();
                mp = m;
                ok = true;
            } catch (Throwable e) { err("sound " + ty + ": " + e.getClass().getSimpleName()); releasePlayer(); }
        }
        if (!ok) {
            // last resort: a built-in beep that needs no sound file
            try {
                final android.media.ToneGenerator tg = new android.media.ToneGenerator(AudioManager.STREAM_ALARM, 100);
                tg.startTone(android.media.ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 12000);
                H.postDelayed(tg::release, 13000);
                ok = true;
            } catch (Throwable e) { err("tone: " + e.getClass().getSimpleName()); }
        }
        if (ok) err("");
        try {
            String d = "alarm vol " + (am != null ? am.getStreamVolume(AudioManager.STREAM_ALARM) + "/" + am.getStreamMaxVolume(AudioManager.STREAM_ALARM) : "?")
                    + ", ringer " + (am != null ? am.getRingerMode() : -1)
                    + ", dnd " + ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).getCurrentInterruptionFilter()
                    + ", " + (mp != null ? "player started" : (ok ? "beep" : "no sound source"));
            sp(this).edit().putString("diag", d).apply();
            final MediaPlayer cur = mp;
            final AudioManager amf = am;
            H.postDelayed(() -> {
                boolean playing = false;
                try { playing = cur != null && cur == mp && cur.isPlaying(); } catch (Throwable e) { }
                boolean quietVol = false;
                try { quietVol = amf != null && amf.getStreamVolume(AudioManager.STREAM_ALARM) == 0; } catch (Throwable e) { }
                try { sp(NightAlarmService.this).edit().putString("diag", sp(NightAlarmService.this).getString("diag", "") + (playing ? ", playing" : ", NOT playing") + (quietVol ? ", alarm volume is 0" : "")).apply(); } catch (Throwable e) { }
                // backup: if the player is not really playing, or the alarm volume is 0, let Android play the alarm sound with a notification
                if (ringing && (!playing || quietVol)) backupSound();
            }, 800);
        } catch (Throwable e) { }
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                long[] pat = {0, 700, 400, 700, 400, 700};
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(pat, -1), aa);
                else v.vibrate(pat, -1);
            }
        } catch (Throwable e) { }
        // sound for 14 seconds, then quiet until the next round
        H.removeCallbacks(quiet);
        H.postDelayed(quiet, 14000);
    }

    private final Runnable quiet = new Runnable() { @Override public void run() { releasePlayer(); } };

    private void releasePlayer() {
        try { if (mp != null) { try { mp.stop(); } catch (Exception e) { } mp.release(); } } catch (Exception e) { }
        mp = null;
    }

    /** Backup sound: a notification on a channel whose sound is the alarm tone (alarm audio attributes, may pass Do Not Disturb). */
    private void backupSound() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH_SND) == null) {
                NotificationChannel ch = new NotificationChannel(CH_SND, "Night order alarm sound", NotificationManager.IMPORTANCE_HIGH);
                Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                ch.setSound(u, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                ch.enableVibration(true);
                ch.setBypassDnd(true);
                nm.createNotificationChannel(ch);
            }
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH_SND) : new Notification.Builder(this);
            b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                    .setContentTitle(hi(this) ? "Order alarm" : "Order alarm")
                    .setContentText(hi(this) ? "Naya order aaya hai. KuCoin kholo." : "A new order arrived. Open KuCoin.")
                    .setCategory(Notification.CATEGORY_ALARM)
                    .setAutoCancel(true);
            if (Build.VERSION.SDK_INT < 26) { b.setPriority(Notification.PRIORITY_MAX); b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), AudioManager.STREAM_ALARM); }
            nm.notify(NID + 1, b.build());
            err("backup sound used");
        } catch (Throwable e) { }
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
            boolean buy = ringKind.equals("BUY"), unk = ringKind.equals("UNK");
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
            b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                    .setContentTitle(unk ? (hi(this) ? "Nayi KuCoin P2P notification" : "New KuCoin P2P notification") : hi(this) ? (buy ? "BUY order: payment karna hai!" : "SELL order aaya: buyer pay kar raha hai") : (buy ? "BUY order: payment needed!" : "SELL order: buyer is paying"))
                    .setContentText(unk ? (hi(this) ? "Pexai kholo aur batao ye BUY hai ya SELL." : "Open Pexai and tell it if this is BUY or SELL.") : hi(this) ? "KuCoin kholo. Dekh liya dabane tak alarm bajega." : "Open KuCoin. The alarm rings until you tap Seen.")
                    .setCategory(Notification.CATEGORY_ALARM)
                    .setContentIntent(pi)
                    .setDeleteIntent(pa)
                    .setAutoCancel(true)
                    .addAction(new Notification.Action.Builder(null, hi(this) ? "Dekh liya" : "Seen", pa).build());
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
            try { ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NID); ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NID + 1); } catch (Exception e) { }
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
