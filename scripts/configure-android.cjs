#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Locate android main directory
function findAndroidMainDir() {
  const candidates = [
    path.resolve(process.cwd(), 'cap-app/android/app/src/main'),
    path.resolve(__dirname, '../cap-app/android/app/src/main'),
    path.resolve(process.cwd(), 'android/app/src/main'),
    path.resolve(__dirname, '../android/app/src/main'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  throw new Error('Android main directory not found. Candidates checked: ' + candidates.join(', '));
}

const mainDir = findAndroidMainDir();
console.log('Configuring Android styles and MainActivity in:', mainDir);

const resDir = path.join(mainDir, 'res');

// 1. Write colors.xml (Pure black system colors)
const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#000000</color>
    <color name="colorPrimaryDark">#000000</color>
    <color name="colorAccent">#0066FF</color>
</resources>
`;

for (const dirName of ['values', 'values-night']) {
  const dir = path.join(resDir, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'colors.xml'), colorsXml, 'utf8');
}
console.log('✓ Configured colors.xml in values and values-night');

// 2. Base styles.xml
const baseStylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="colorPrimary">#000000</item>
        <item name="colorPrimaryDark">#000000</item>
        <item name="colorAccent">#0066FF</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
        <item name="android:windowBackground">#000000</item>
        <item name="android:colorBackground">#000000</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">#000000</item>
        <item name="android:windowBackground">#000000</item>
        <item name="android:colorBackground">#000000</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:windowLightStatusBar" tools:targetApi="m">false</item>
        <item name="android:windowLightNavigationBar" tools:targetApi="o_mr1">false</item>
        <item name="android:windowTranslucentStatus">false</item>
        <item name="android:windowTranslucentNavigation">false</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">#000000</item>
        <item name="android:windowBackground">#000000</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
    </style>
</resources>
`;

for (const dirName of ['values', 'values-night']) {
  const dir = path.join(resDir, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'styles.xml'), baseStylesXml, 'utf8');
}
console.log('✓ Configured base styles.xml in values and values-night');

// 3. Notch cutout styles for API 28+ (Android 9+)
const v28StylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">#000000</item>
        <item name="android:windowBackground">#000000</item>
        <item name="android:colorBackground">#000000</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:windowTranslucentStatus">false</item>
        <item name="android:windowTranslucentNavigation">false</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">#000000</item>
        <item name="android:windowBackground">#000000</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    </style>
</resources>
`;

for (const dirName of ['values-v28', 'values-night-v28']) {
  const dir = path.join(resDir, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'styles.xml'), v28StylesXml, 'utf8');
}
console.log('✓ Configured cutout notch styles.xml for API 28');

// 4. Contrast removal styles for API 29+ (Android 10 - 15+)
const v29StylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">#000000</item>
        <item name="android:windowBackground">#000000</item>
        <item name="android:colorBackground">#000000</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:enforceNavigationBarContrast" tools:targetApi="q">false</item>
        <item name="android:enforceStatusBarContrast" tools:targetApi="q">false</item>
        <item name="android:windowTranslucentStatus">false</item>
        <item name="android:windowTranslucentNavigation">false</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">#000000</item>
        <item name="android:windowBackground">#000000</item>
        <item name="android:statusBarColor">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:enforceNavigationBarContrast" tools:targetApi="q">false</item>
        <item name="android:enforceStatusBarContrast" tools:targetApi="q">false</item>
    </style>
</resources>
`;

for (const dirName of ['values-v29', 'values-night-v29', 'values-v31', 'values-night-v31']) {
  const dir = path.join(resDir, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'styles.xml'), v29StylesXml, 'utf8');
}
console.log('✓ Configured contrast-disabled styles.xml for API 29+');

// 5. MainActivity.java
const mainActivityJava = `package com.seis6.app;

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
`;

const javaDir = path.join(mainDir, 'java/com/seis6/app');
fs.mkdirSync(javaDir, { recursive: true });
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), mainActivityJava, 'utf8');
console.log('✓ Configured MainActivity.java');

// 6. AndroidManifest.xml
const manifestPath = path.join(mainDir, 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('android.max_aspect')) {
    manifest = manifest.replace(
      '</application>',
      '    <meta-data android:name="android.max_aspect" android:value="3.0" />\n    </application>'
    );
  }
  if (!manifest.includes('android:resizeableActivity')) {
    manifest = manifest.replace(
      '<activity',
      '<activity android:resizeableActivity="true" android:windowSoftInputMode="adjustResize"'
    );
    manifest = manifest.replace(
      '<application',
      '<application android:resizeableActivity="true"'
    );
  }
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('✓ Updated AndroidManifest.xml');
}

// 7. Auto-heal android/variables.gradle (compileSdkVersion 34, targetSdkVersion 34, Android 14, Java 21 compatible)
const androidRootDir = path.resolve(mainDir, '../../..');
const variablesGradlePath = path.join(androidRootDir, 'variables.gradle');
if (fs.existsSync(variablesGradlePath)) {
  let vGradle = fs.readFileSync(variablesGradlePath, 'utf8');
  vGradle = vGradle.replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 34');
  vGradle = vGradle.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 34');
  vGradle = vGradle.replace(/cordovaAndroidVersion\s*=\s*['"][^'"]+['"]/, "cordovaAndroidVersion = '14.0.1'");
  fs.writeFileSync(variablesGradlePath, vGradle, 'utf8');
  console.log('✓ Ensured compileSdkVersion 34 and targetSdkVersion 34 (Android 14) in variables.gradle');
}

// 8. Auto-heal android/gradle.properties
const gradlePropsPath = path.join(androidRootDir, 'gradle.properties');
if (fs.existsSync(gradlePropsPath)) {
  let gProps = fs.readFileSync(gradlePropsPath, 'utf8');
  if (!gProps.includes('android.builder.sdkDownload')) {
    gProps += '\nandroid.builder.sdkDownload=true\n';
  }
  if (!gProps.includes('android.enableJetifier')) {
    gProps += '\nandroid.enableJetifier=true\n';
  }
  gProps = gProps.replace(/org\.gradle\.jvmargs=-Xmx\d+m/, 'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8');
  fs.writeFileSync(gradlePropsPath, gProps, 'utf8');
  console.log('✓ Ensured auto sdkDownload and 2048m memory in gradle.properties');
}

// 9. Auto-heal android/build.gradle (google-services 4.4.2 and layout.buildDirectory)
const rootBuildGradlePath = path.join(androidRootDir, 'build.gradle');
if (fs.existsSync(rootBuildGradlePath)) {
  let rootGradle = fs.readFileSync(rootBuildGradlePath, 'utf8');
  rootGradle = rootGradle.replace(/classpath\s+['"]com\.google\.gms:google-services:[^'"]+['"]/, "classpath 'com.google.gms:google-services:4.4.2'");
  if (rootGradle.includes('delete rootProject.buildDir')) {
    rootGradle = rootGradle.replace('delete rootProject.buildDir', 'delete rootProject.layout.buildDirectory');
  }
  fs.writeFileSync(rootBuildGradlePath, rootGradle, 'utf8');
  console.log('✓ Ensured google-services 4.4.2 in root build.gradle');
}

// 10. Auto-heal android/app/build.gradle (Java 21 compileOptions, assignment operator = and safe google-services)
const appBuildGradlePath = path.join(androidRootDir, 'app/build.gradle');
if (fs.existsSync(appBuildGradlePath)) {
  let appGradle = fs.readFileSync(appBuildGradlePath, 'utf8');
  // Ensure compileOptions
  if (!appGradle.includes('compileOptions')) {
    appGradle = appGradle.replace(
      'buildTypes {',
      'compileOptions {\n        sourceCompatibility JavaVersion.VERSION_21\n        targetCompatibility JavaVersion.VERSION_21\n    }\n    buildTypes {'
    );
  }
  // Ensure = operator for defaultConfig
  appGradle = appGradle.replace(/applicationId\s+"([^"]+)"/, 'applicationId = "$1"');
  appGradle = appGradle.replace(/minSdkVersion\s+rootProject/, 'minSdkVersion = rootProject');
  appGradle = appGradle.replace(/targetSdkVersion\s+rootProject/, 'targetSdkVersion = rootProject');
  appGradle = appGradle.replace(/versionCode\s+(\d+)/, 'versionCode = $1');
  appGradle = appGradle.replace(/versionName\s+"([^"]+)"/, 'versionName = "$1"');
  appGradle = appGradle.replace(/testInstrumentationRunner\s+"([^"]+)"/, 'testInstrumentationRunner = "$1"');
  appGradle = appGradle.replace(/minifyEnabled\s+false/, 'minifyEnabled = false');

  // Safe google-services check
  if (appGradle.includes('if (servicesJSON.text)')) {
    appGradle = appGradle.replace('if (servicesJSON.text)', 'if (servicesJSON.exists() && servicesJSON.text)');
  }
  fs.writeFileSync(appBuildGradlePath, appGradle, 'utf8');
  console.log('✓ Ensured Java 21 compileOptions and property assignment syntax in app/build.gradle');
}

console.log('All Android configuration applied successfully!');
