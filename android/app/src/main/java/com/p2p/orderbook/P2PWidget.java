package com.p2p.orderbook;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Home-screen widget: today's profit, open orders, alerts. The web app pushes the numbers through the bridge. */
public class P2PWidget extends AppWidgetProvider {
    static final String PREF = "p2p_widget";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_p2p);
        String profit = "—", line = "Open the app once", alert = "";
        boolean neg = false;
        try {
            String j = c.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString("json", "");
            if (j != null && !j.isEmpty()) {
                JSONObject o = new JSONObject(j);
                profit = o.optString("profit", "—");
                line = o.optString("line", "");
                alert = o.optString("alert", "");
                neg = o.optBoolean("neg", false);
            }
        } catch (Exception ignored) { }
        v.setTextViewText(R.id.w_profit, profit);
        v.setTextColor(R.id.w_profit, neg ? Color.parseColor("#FF6B6B") : Color.parseColor("#FFFFFF"));
        v.setTextViewText(R.id.w_line, line);
        v.setTextViewText(R.id.w_alert, alert);
        Intent i = new Intent(c, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.w_root, pi);
        return v;
    }

    static void refresh(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, P2PWidget.class));
            if (ids != null) for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Exception ignored) { }
    }
}
