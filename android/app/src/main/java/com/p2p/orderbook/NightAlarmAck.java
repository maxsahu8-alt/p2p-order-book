package com.p2p.orderbook;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** "Dekh liya" button (or swiping the alarm notification away) stops the night order alarm. */
public class NightAlarmAck extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (i != null && NightAlarmService.ACT_CHECK.equals(i.getAction())) NightAlarmService.runCheck(c);
        else NightAlarmService.ack(c);
    }
}
