package org.finante.app;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Set;

@CapacitorPlugin(name = "FinanteNotifications")
public class NotificationPlugin extends Plugin {

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        Context context = getContext();
        Set<String> packageNames = NotificationManagerCompat.getEnabledListenerPackages(context);
        boolean isGranted = packageNames.contains(context.getPackageName());

        JSObject ret = new JSObject();
        ret.put("granted", isGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Erro ao abrir configurações de notificação", e);
        }
    }

    @PluginMethod
    public void getPendingNotifications(PluginCall call) {
        Context context = getContext();
        boolean clear = call.getBoolean("clear", true);

        JSONArray jsonArray;
        if (clear) {
            jsonArray = FinanteNotificationListener.getAndClearPending(context);
        } else {
            jsonArray = FinanteNotificationListener.peekPending(context);
        }

        try {
            JSArray jsArray = new JSArray();
            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject obj = jsonArray.getJSONObject(i);
                JSObject item = new JSObject();
                item.put("id", obj.optString("id"));
                item.put("packageName", obj.optString("packageName"));
                item.put("title", obj.optString("title"));
                item.put("text", obj.optString("text"));
                item.put("timestamp", obj.optLong("timestamp"));
                jsArray.put(item);
            }

            JSObject ret = new JSObject();
            ret.put("notifications", jsArray);
            call.resolve(ret);
        } catch (JSONException e) {
            call.reject("Erro ao converter notificações", e);
        }
    }

    @PluginMethod
    public void clearPendingNotifications(PluginCall call) {
        Context context = getContext();
        FinanteNotificationListener.getAndClearPending(context);
        call.resolve();
    }

    @PluginMethod
    public void addSimulatedNotification(PluginCall call) {
        String packageName = call.getString("packageName", "com.nu.production");
        String title = call.getString("title", "Nubank");
        String text = call.getString("text", "Compra aprovada no Nubank de R$ 45,90 no Supermercado Extra.");

        Context context = getContext();
        FinanteNotificationListener.addSimulatedNotification(context, packageName, title, text);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
