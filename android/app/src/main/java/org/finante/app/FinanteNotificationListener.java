package org.finante.app;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class FinanteNotificationListener extends NotificationListenerService {

    private static final String TAG = "FinanteNotification";
    private static final String PREFS_NAME = "FinanteNotificationPrefs";
    private static final String KEY_PENDING = "pending_bank_notifications";

    // Conhecidos pacotes de bancos e carteiras digitais no Brasil
    private static final Set<String> SUPPORTED_PACKAGES = new HashSet<>(Arrays.asList(
            "com.nu.production",                      // Nubank
            "com.itau",                               // Itaú
            "com.itau.personnalite",                  // Itaú Personnalité
            "com.itau.cartoes",                       // Itaú Cartões
            "br.com.intermedium",                     // Banco Inter
            "com.santander.app",                      // Santander
            "com.santander.way",                      // Santander Way
            "br.com.bradesco",                        // Bradesco
            "br.com.bradesco.cartoes",                // Bradesco Cartões
            "br.com.bb",                              // Banco do Brasil
            "br.com.gabba.Caixa",                     // Caixa Econômica Federal
            "com.c6bank.app",                         // C6 Bank
            "com.mercadopago.wallet",                 // Mercado Pago
            "com.picpay",                             // PicPay
            "com.neondigitalbank",                    // Neon
            "br.com.original.bank",                   // Banco Original
            "com.next.mobile"                         // Next
    ));

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) {
            return;
        }

        String packageName = sbn.getPackageName();
        if (packageName == null) {
            return;
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) {
            return;
        }

        CharSequence titleSeq = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textSeq = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextSeq = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String title = titleSeq != null ? titleSeq.toString() : "";
        String text = textSeq != null ? textSeq.toString() : "";
        if (bigTextSeq != null && bigTextSeq.length() > text.length()) {
            text = bigTextSeq.toString();
        }

        String fullContent = (title + " " + text).toLowerCase();

        // Verifica se é de um banco suportado ou se tem indicação clara de compra/transação financeira em R$
        boolean isBank = SUPPORTED_PACKAGES.contains(packageName);
        boolean hasCurrency = fullContent.contains("r$") || fullContent.contains("reais");
        boolean hasTransactionKeywords = fullContent.contains("compra") ||
                fullContent.contains("aprovada") ||
                fullContent.contains("pago") ||
                fullContent.contains("pagamento") ||
                fullContent.contains("pix") ||
                fullContent.contains("transferência") ||
                fullContent.contains("transferencia") ||
                fullContent.contains("débito") ||
                fullContent.contains("debito") ||
                fullContent.contains("crédito") ||
                fullContent.contains("credito");

        if ((isBank && hasCurrency) || (hasCurrency && hasTransactionKeywords)) {
            Log.d(TAG, "Notificação bancária capturada: " + packageName + " - " + title + " - " + text);
            saveNotification(packageName, title, text, sbn.getPostTime());
        }
    }

    private synchronized void saveNotification(String packageName, String title, String text, long postTime) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String currentJson = prefs.getString(KEY_PENDING, "[]");

        try {
            JSONArray arr = new JSONArray(currentJson);

            JSONObject item = new JSONObject();
            item.put("id", System.currentTimeMillis() + "_" + (int)(Math.random() * 1000));
            item.put("packageName", packageName);
            item.put("title", title);
            item.put("text", text);
            item.put("timestamp", postTime > 0 ? postTime : System.currentTimeMillis());

            arr.put(item);

            prefs.edit().putString(KEY_PENDING, arr.toString()).apply();
            Log.d(TAG, "Notificação armazenada com sucesso. Total na fila: " + arr.length());
        } catch (JSONException e) {
            Log.e(TAG, "Erro ao salvar notificação na fila", e);
        }
    }

    public static synchronized JSONArray getAndClearPending(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String currentJson = prefs.getString(KEY_PENDING, "[]");
        try {
            JSONArray arr = new JSONArray(currentJson);
            prefs.edit().putString(KEY_PENDING, "[]").apply();
            return arr;
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    public static synchronized JSONArray peekPending(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String currentJson = prefs.getString(KEY_PENDING, "[]");
        try {
            return new JSONArray(currentJson);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    public static synchronized void addSimulatedNotification(Context context, String packageName, String title, String text) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String currentJson = prefs.getString(KEY_PENDING, "[]");
        try {
            JSONArray arr = new JSONArray(currentJson);
            JSONObject item = new JSONObject();
            item.put("id", "sim_" + System.currentTimeMillis());
            item.put("packageName", packageName);
            item.put("title", title);
            item.put("text", text);
            item.put("timestamp", System.currentTimeMillis());
            arr.put(item);
            prefs.edit().putString(KEY_PENDING, arr.toString()).apply();
        } catch (JSONException ignored) {}
    }
}
