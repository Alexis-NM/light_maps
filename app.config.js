import "dotenv/config";

export default {
    expo: {
        name: "Maps",
        slug: "light-maps",
        version: "1.0.6",
        orientation: "portrait",
        scheme: "lightmaps",
        newArchEnabled: false,
        icon: "./assets/images/icon.png",
        android: {
            backgroundColor: "#000000",
            package: "com.nonolpmod.maps",
            permissions: [
                "ACCESS_COARSE_LOCATION",
                "ACCESS_FINE_LOCATION"
            ]
        },
        plugins: [
            "expo-router",
            "expo-font",
            "./plugins/withAndroidConfigChanges",
            "./plugins/withAndroidTheme"
        ],
        experiments: {
            typedRoutes: true
        },
        extra: {
            router: {},
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE"
        }
    }
};
