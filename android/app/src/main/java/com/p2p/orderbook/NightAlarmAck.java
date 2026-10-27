package com.p2p.orderbook;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** "Dekh liya" button (or swiping the alarm notification away) stops the night order alarm. */
public class NightAlarmAck extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) { NightAlarmService.ack(c); }
}
