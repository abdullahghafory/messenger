package com.netgram.lan;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.PermissionRequest;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
  private WebView webView;
  private SharedPreferences prefs;
  private ValueCallback<Uri[]> fileCallback;
  private static final int FILE_CHOOSER = 2026;

  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    prefs = getSharedPreferences("netgram", MODE_PRIVATE);
    String url = prefs.getString("server", "");
    if (url.isEmpty()) showServerDialog(); else loadApp(url);
  }

  private void showServerDialog() {
    LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(48, 24, 48, 8);
    TextView label = new TextView(this); label.setText("آدرس سرور پیام‌رسان\nمثال: http://192.168.1.10:3000"); box.addView(label);
    EditText input = new EditText(this); input.setSingleLine(true); input.setHint("http://IP:3000"); input.setText(prefs.getString("server", "")); box.addView(input);
    new AlertDialog.Builder(this).setTitle("اتصال به NetGram").setView(box).setCancelable(false)
      .setPositiveButton("اتصال", (d,w) -> { String u=input.getText().toString().trim(); if (!u.startsWith("http://") && !u.startsWith("https://")) u="http://"+u; if (u.matches("https?://[^/]+(:[0-9]+)?/?")) { prefs.edit().putString("server",u.replaceAll("/$", "")).apply(); loadApp(prefs.getString("server",u)); } else { new AlertDialog.Builder(this).setMessage("آدرس معتبر نیست. نمونه: http://192.168.1.10:3000").setPositiveButton("تلاش دوباره",(a,b)->showServerDialog()).show(); } })
      .setNeutralButton("تغییر آدرس", (d,w)->showServerDialog()).show();
  }

  private void loadApp(String url) {
    webView = new WebView(this); setContentView(webView);
    WebSettings s = webView.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true); s.setMediaPlaybackRequiresUserGesture(false); s.setAllowFileAccess(false); s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
    CookieManager.getInstance().setAcceptCookie(true);
    webView.setWebViewClient(new WebViewClient(){ @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r){ Uri u=r.getUrl(); return !("http".equals(u.getScheme())||"https".equals(u.getScheme())); }});
    webView.setWebChromeClient(new WebChromeClient(){
      @Override public void onPermissionRequest(PermissionRequest request) { runOnUiThread(() -> { if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED) request.grant(request.getResources()); else { request.deny(); requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 55); } }); }
      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) { if(fileCallback!=null) fileCallback.onReceiveValue(null); fileCallback=cb; Intent i=params.createIntent(); try { startActivityForResult(i,FILE_CHOOSER); } catch(Exception e){fileCallback=null;return false;} return true; }
    });
    webView.loadUrl(url);
  }
  @Override public void onBackPressed(){ if(webView!=null && webView.canGoBack()) webView.goBack(); else new AlertDialog.Builder(this).setMessage("خروج از پیام‌رسان؟").setNegativeButton("ماندن",null).setNeutralButton("تغییر سرور",(d,w)->showServerDialog()).setPositiveButton("خروج",(d,w)->finish()).show(); }
  @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){ super.onActivityResult(requestCode,resultCode,data); if(requestCode==FILE_CHOOSER && fileCallback!=null){ Uri[] result=WebChromeClient.FileChooserParams.parseResult(resultCode,data); fileCallback.onReceiveValue(result); fileCallback=null; } }
}
