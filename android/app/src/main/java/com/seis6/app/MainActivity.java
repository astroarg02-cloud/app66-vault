package com.seis6.app;

import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.webkit.WebView;
import android.view.WindowManager;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyEdgeToEdgeBlack();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyEdgeToEdgeBlack();
    }

    @Override
    public void onPause() {
        super.onPause();
        try {
            android.webkit.CookieManager.getInstance().flush();
        } catch (Exception ignored) {}
    }

    @Override
    public void onStop() {
        super.onStop();
        try {
            android.webkit.CookieManager.getInstance().flush();
        } catch (Exception ignored) {}
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyEdgeToEdgeBlack();
        }
    }

    private void applyEdgeToEdgeBlack() {
        try {
            Window window = getWindow();
            if (window != null) {
                window.setBackgroundDrawableResource(android.R.color.black);
                if (window.getDecorView() != null) {
                    window.getDecorView().setBackgroundColor(Color.BLACK);
                }
                View contentView = window.findViewById(android.R.id.content);
                if (contentView != null) {
                    contentView.setBackgroundColor(Color.BLACK);
                }

                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

                window.setStatusBarColor(Color.BLACK);
                window.setNavigationBarColor(Color.BLACK);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    WindowManager.LayoutParams lp = window.getAttributes();
                    lp.layoutInDisplayCutoutMode =
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                    window.setAttributes(lp);
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.setNavigationBarContrastEnforced(false);
                    window.setStatusBarContrastEnforced(false);
                }

                WindowCompat.setDecorFitsSystemWindows(window, false);

                WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
                controller.setAppearanceLightStatusBars(false);
                controller.setAppearanceLightNavigationBars(false);
            }

            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.setBackgroundColor(Color.BLACK);
                webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
                try {
                    android.webkit.WebSettings settings = webView.getSettings();
                    settings.setDomStorageEnabled(true);
                    settings.setDatabaseEnabled(true);
                } catch (Exception ignoredSettings) {}
            }
        } catch (Exception ignored) {}
    }
}
