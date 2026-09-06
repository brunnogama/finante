package org.finante.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Set;

@CapacitorPlugin(
    name = "FinanteNotifications",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class NotificationPlugin extends Plugin {

    private static final String CHANNEL_DUE_ID = "finante_due_reminders";
    private static final String CHANNEL_DUE_NAME = "Lembretes de Vencimento";

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        // Verifica se a permissão de Acesso a Notificações (NotificationListenerService) está concedida
        Context context = getContext();
        Set<String> packageNames = NotificationManagerCompat.getEnabledListenerPackages(context);
        boolean isGranted = packageNames.contains(context.getPackageName());

        JSObject ret = new JSObject();
        ret.put("granted", isGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void isPostNotificationsGranted(PluginCall call) {
        Context context = getContext();
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            granted = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        } else {
            granted = NotificationManagerCompat.from(context).areNotificationsEnabled();
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPostNotificationsPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("notifications", call, "notificationsPermCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void notificationsPermCallback(PluginCall call) {
        isPostNotificationsGranted(call);
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
            call.reject("Erro ao abrir configurações de acesso a notificações", e);
        }
    }

    @PluginMethod
    public void openAppDetailsSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", context.getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Erro ao abrir detalhes do aplicativo", e);
        }
    }

    @PluginMethod
    public void sendDueReminder(PluginCall call) {
        Context context = getContext();
        String title = call.getString("title", "⚠️ Finante: Conta Vencendo Hoje");
        String body = call.getString("body", "Você possui despesas com vencimento hoje.");
        int notifId = call.getInt("id", (int) (System.currentTimeMillis() % 100000));

        createNotificationChannel(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                notifId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_DUE_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(notifId, builder.build());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (SecurityException se) {
            call.reject("Permissão de notificação não concedida", se);
        } catch (Exception e) {
            call.reject("Erro ao enviar notificação de vencimento", e);
        }
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_DUE_ID,
                    CHANNEL_DUE_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alertas e notificações de despesas no dia do vencimento");
            channel.enableVibration(true);
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
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
