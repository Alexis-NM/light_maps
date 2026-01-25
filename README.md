# Maps for Light Phone III

A privacy-focused maps application designed for Light Phone III, built with React Native and Expo.

<p align="center">
  <img src="assets/images/icon.png" width="120" alt="Maps icon">
</p>

## Features

- **Full Google Maps** - Search, explore, and navigate
- **Place Details** - Ratings, reviews, opening hours
- **Save Locations** - Bookmark your favorite places
- **Dark/Light Theme** - Matches Light Phone aesthetic
- **Bilingual** - English and French support
- **No Google Play Services Required** - Works on LPIII

## Privacy & Security

This app is designed with privacy in mind:

| Feature | Implementation |
|---------|----------------|
| **API Key Storage** | Encrypted via Android Keystore (AES-256) |
| **No Tracking** | Zero analytics, no data collection |
| **No Account Required** | No sign-in, no cloud sync |
| **Local Storage Only** | Saved places stored on device only |
| **Your Own API Key** | You control your Google Maps usage |

Your Google Maps API key is stored using `expo-secure-store`, which uses Android's hardware-backed Keystore for encryption. The key is never transmitted, logged, or accessible—even with root access.

## Screenshots

*Coming soon*

## Installation

### Option 1: Download APK

Download the latest release from the [Releases](../../releases) page and install via ADB:

```bash
adb install maps-v1.0.5.apk
```

### Option 2: Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Bun](https://bun.sh/) (recommended) or npm
- [Android SDK](https://developer.android.com/studio)
- A [Google Maps API Key](https://console.cloud.google.com/apis/credentials)

#### Steps

```bash
# Clone the repo
git clone https://github.com/Alexis-NM/light_maps.git
cd light_maps

# Install dependencies
bun install

# Prebuild Android
bunx expo prebuild --platform android

# Set Android SDK path
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# Build release APK
cd android && ./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`

## Setup Your API Key

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Create an API key (Credentials → Create credentials → API key)
5. (Optional) Restrict the key:
   - Application restrictions: Android apps
   - API restrictions: Select only the 3 APIs above
   - Add package name: `com.nonolpmod.maps`

### 2. Enter Your Key in the App

On first launch, the app will prompt you to enter your API key. It's stored securely and you only need to enter it once.

## API Costs

Google provides a **$200/month free credit** for Maps APIs. For personal use on Light Phone, you'll stay well within the free tier:

| API | Free Tier |
|-----|-----------|
| Maps JavaScript API | ~28,000 map loads/month |
| Places API | Varies by request type |
| Geocoding API | ~40,000 requests/month |

## Technical Details

### Why No Google Play Services?

Light Phone III doesn't include Google Play Services. This app uses alternative implementations:

| Feature | Standard Android | This App |
|---------|------------------|----------|
| Maps | Google Maps SDK | WebView + Maps JS API |
| Location | FusedLocationProvider | Android LocationManager |
| Places | Play Services Places | Places API via HTTP |

### Architecture

```
app/
├── (tabs)/
│   ├── index.tsx      # Map screen (WebView)
│   ├── search.tsx     # Place search
│   ├── saved.tsx      # Saved locations
│   └── settings.tsx   # Settings
├── setup-api-key.tsx  # API key setup
└── _layout.tsx        # Root layout

contexts/
├── ApiKeyContext.tsx  # Secure API key storage
├── MapContext.tsx     # Map state management
└── ...
```

## Built With

- [Expo](https://expo.dev/) - React Native framework
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) - Secure storage
- [react-native-webview](https://github.com/react-native-webview/react-native-webview) - Maps display
- [react-native-get-location](https://github.com/nicklockwood/react-native-get-location) - Location services

## Credits

Built using the [Light Template](https://github.com/vandamd/light-template) by [@vandamd](https://github.com/vandamd) - a React Native template designed for Light Phone III apps.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ for the Light Phone community
