const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_IMAGE = path.join(__dirname, '../src/assets/images/pack_seis6_loading_1791943905362.jpg');
const RES_DIR = path.join(__dirname, '../android/app/src/main/res');
const PUBLIC_DIR = path.join(__dirname, '../public');

if (!fs.existsSync(SOURCE_IMAGE)) {
  console.error('Source image not found at', SOURCE_IMAGE);
  process.exit(1);
}

console.log('Generating Android APK and Web icons from:', SOURCE_IMAGE);

// Density configurations
const densities = [
  { name: 'mipmap-mdpi', launcherSize: 48, foregroundSize: 108, innerSize: 82 },
  { name: 'mipmap-hdpi', launcherSize: 72, foregroundSize: 162, innerSize: 122 },
  { name: 'mipmap-xhdpi', launcherSize: 96, foregroundSize: 216, innerSize: 164 },
  { name: 'mipmap-xxhdpi', launcherSize: 144, foregroundSize: 324, innerSize: 246 },
  { name: 'mipmap-xxxhdpi', launcherSize: 192, foregroundSize: 432, innerSize: 328 },
];

densities.forEach(({ name, launcherSize, foregroundSize, innerSize }) => {
  const dir = path.join(RES_DIR, name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 1. Standard ic_launcher.png (square)
  const launcherPath = path.join(dir, 'ic_launcher.png');
  execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize ${launcherSize}x${launcherSize} "${launcherPath}"`);

  // 2. Round ic_launcher_round.png (circle mask)
  const roundPath = path.join(dir, 'ic_launcher_round.png');
  const half = launcherSize / 2;
  const maskFile = `/tmp/mask_${launcherSize}.png`;
  execSync(`convert -size ${launcherSize}x${launcherSize} xc:none -fill white -draw "circle ${half},${half} ${half},0" "${maskFile}"`);
  execSync(`convert "${launcherPath}" "${maskFile}" -alpha set -compose DstIn -composite "${roundPath}"`);
  try { fs.unlinkSync(maskFile); } catch {}

  // 3. Adaptive ic_launcher_foreground.png (inner artwork centered in 108dp safe viewport with seamless dark background)
  const foregroundPath = path.join(dir, 'ic_launcher_foreground.png');
  const tempInner = `/tmp/inner_${innerSize}.png`;
  execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize ${innerSize}x${innerSize} "${tempInner}"`);
  execSync(`convert -size ${foregroundSize}x${foregroundSize} xc:"#040508" "${tempInner}" -gravity center -composite "${foregroundPath}"`);
  try { fs.unlinkSync(tempInner); } catch {}

  console.log(`Generated ${name}: ${launcherSize}x${launcherSize} & foreground ${foregroundSize}x${foregroundSize}`);
});

// Update ic_launcher_background.xml to match the deep luxury black/blue theme
const bgXmlPath = path.join(RES_DIR, 'values/ic_launcher_background.xml');
fs.writeFileSync(bgXmlPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#040508</color>
</resources>
`, 'utf8');
console.log('Updated ic_launcher_background.xml with #040508');

// Generate Web and PWA icons in /public
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize 512x512 "${path.join(PUBLIC_DIR, 'app-logo.png')}"`);
execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize 180x180 "${path.join(PUBLIC_DIR, 'apple-touch-icon.png')}"`);
execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize 64x64 "${path.join(PUBLIC_DIR, 'favicon.png')}"`);
execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize 192x192 "${path.join(PUBLIC_DIR, 'icon-192.png')}"`);
execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize 512x512 "${path.join(PUBLIC_DIR, 'icon-512.png')}"`);
console.log('Generated Web icons: app-logo.png, apple-touch-icon.png, favicon.png, icon-192.png, icon-512.png');

// Update manifest.json
const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
const manifest = {
  short_name: "Seis6 App",
  name: "Seis6 App",
  description: "Bóveda de contenido exclusivo para Android e iOS con diseño AMOLED",
  icons: [
    {
      src: "./favicon.png",
      type: "image/png",
      sizes: "64x64"
    },
    {
      src: "./icon-192.png",
      type: "image/png",
      sizes: "192x192",
      purpose: "any maskable"
    },
    {
      src: "./icon-512.png",
      type: "image/png",
      sizes: "512x512",
      purpose: "any maskable"
    },
    {
      src: "./app-logo.png",
      type: "image/png",
      sizes: "512x512"
    }
  ],
  start_url: "./",
  background_color: "#040508",
  theme_color: "#040508",
  display: "standalone",
  orientation: "portrait"
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('Updated manifest.json with SEIS 6 icon entries');

// Generate Android Splash screens (portrait and landscape) with centered SEIS 6 artwork
const splashPortDensities = [
  { name: 'drawable-port-mdpi', w: 320, h: 480, logoSize: 220 },
  { name: 'drawable-port-hdpi', w: 480, h: 800, logoSize: 340 },
  { name: 'drawable-port-xhdpi', w: 720, h: 1280, logoSize: 500 },
  { name: 'drawable-port-xxhdpi', w: 960, h: 1600, logoSize: 660 },
  { name: 'drawable-port-xxxhdpi', w: 1280, h: 1920, logoSize: 880 },
];

splashPortDensities.forEach(({ name, w, h, logoSize }) => {
  const dir = path.join(RES_DIR, name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'splash.png');
  const tempLogo = `/tmp/splash_logo_${logoSize}.png`;
  execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize ${logoSize}x${logoSize} "${tempLogo}"`);
  execSync(`convert -size ${w}x${h} xc:"#040508" "${tempLogo}" -gravity center -composite "${outPath}"`);
  try { fs.unlinkSync(tempLogo); } catch {}
});

// Default drawable splash
const defaultDrawableDir = path.join(RES_DIR, 'drawable');
if (fs.existsSync(defaultDrawableDir)) {
  execSync(`convert -size 480x800 xc:"#040508" \\( "${SOURCE_IMAGE}" -resize 340x340 \\) -gravity center -composite "${path.join(defaultDrawableDir, 'splash.png')}"`);
}

console.log('Generated Android splash screens across densities.');

// Generate iOS AppIcon and Splash images if ios directory exists
const IOS_APP_DIR = path.join(__dirname, '../ios/App/App');
if (fs.existsSync(IOS_APP_DIR)) {
  const iosIconDir = path.join(IOS_APP_DIR, 'Assets.xcassets/AppIcon.appiconset');
  if (fs.existsSync(iosIconDir)) {
    execSync(`convert "${SOURCE_IMAGE}" -filter Lanczos -resize 1024x1024 "${path.join(iosIconDir, 'AppIcon-512@2x.png')}"`);
    console.log('✓ Generated iOS universal AppIcon-512@2x.png (1024x1024)');
  }
  const iosSplashDir = path.join(IOS_APP_DIR, 'Assets.xcassets/Splash.imageset');
  if (fs.existsSync(iosSplashDir)) {
    const splashOut = path.join(iosSplashDir, 'splash-2732x2732.png');
    execSync(`convert -size 2732x2732 xc:"#040508" \\( "${SOURCE_IMAGE}" -resize 1200x1200 \\) -gravity center -composite "${splashOut}"`);
    fs.copyFileSync(splashOut, path.join(iosSplashDir, 'splash-2732x2732-1.png'));
    fs.copyFileSync(splashOut, path.join(iosSplashDir, 'splash-2732x2732-2.png'));
    console.log('✓ Generated iOS splash images (2732x2732)');
  }
}

console.log('All APK & iOS launcher and round icons generated successfully!');
