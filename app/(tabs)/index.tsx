import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Modal, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useHaptic } from "@/contexts/HapticContext";
import { useMap } from "@/contexts/MapContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { StyledText } from "@/components/StyledText";
import { n } from "@/utils/scaling";
import { DARK_MAP_STYLES } from "@/config/maps";
import { t } from "@/i18n";

interface Review {
    authorName: string;
    rating: number;
    text: string;
    relativeTime: string;
}

interface PlaceDetails {
    name: string;
    address: string;
    rating?: number;
    totalRatings?: number;
    isOpen?: boolean;
    openingHours?: string[];
    placeId?: string;
    reviews?: Review[];
    phoneNumber?: string;
}

export default function MapScreen() {
    const { invertColors } = useInvertColors();
    const { triggerHaptic } = useHaptic();
    const { apiKey, mapId } = useApiKey();
    const {
        webViewRef,
        mapCenter,
        mapZoom,
        selectedLocation,
        selectedAddress,
        selectLocation,
        clearSelection,
        savePlace,
        setSearchResults,
        isLoadingLocation,
        goToUserLocation,
    } = useMap();

    const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
    const [showReviews, setShowReviews] = useState(false);

    const backgroundColor = invertColors ? "#FFFFFF" : "#000000";
    const textColor = invertColors ? "#000000" : "#FFFFFF";
    const buttonBg = invertColors ? "#F0F0F0" : "#1A1A1A";

    const darkModeStyles = invertColors ? "[]" : DARK_MAP_STYLES;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: ${backgroundColor}; }
        #map { width: 100%; height: 100%; }
        .gm-style-cc, .gmnoprint, .gm-style-iw, .gm-style-iw-c, .gm-style-iw-t, .gm-style-iw-d { display: none !important; }
        .gm-style .gm-style-iw-tc { display: none !important; }
        a[href^="https://maps.google.com/maps"], a[href^="https://www.google.com/maps"] { display: none !important; }
        .gm-style a[title="Open this area in Google Maps"] { display: none !important; }
        .gm-style > div:last-child { display: none !important; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        let map;
        let userMarker;
        let selectedMarker;
        let placesService;
        let infoWindow;
        let lastNonPoiClickTime = 0;

        function initMap() {
            const mapStyles = ${darkModeStyles};
            const mapIdValue = "${mapId || ""}";

            const mapOptions = {
                center: { lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude} },
                zoom: ${mapZoom},
                disableDefaultUI: true,
                zoomControl: false,
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: "greedy",
                clickableIcons: true
            };

            // If mapId is provided, use Vector Maps with rotation support
            if (mapIdValue) {
                mapOptions.mapId = mapIdValue;
                // Vector Maps: use colorScheme for dark/light mode
                mapOptions.colorScheme = "${invertColors ? "LIGHT" : "DARK"}";
            } else {
                // Raster maps: use custom styles (no rotation)
                mapOptions.styles = mapStyles;
                mapOptions.rotateControl = false;
            }

            map = new google.maps.Map(document.getElementById("map"), mapOptions);

            placesService = new google.maps.places.PlacesService(map);

            // Create a dummy info window to suppress default POI popups
            infoWindow = new google.maps.InfoWindow();

            // Handle POI clicks
            map.addListener("click", function(e) {
                // Close any open info window
                infoWindow.close();

                if (e.placeId) {
                    // Prevent default info window
                    e.stop();

                    // Don't clear marker if we just created one (within 500ms)
                    // This prevents Google Maps from clearing our marker when it detects a nearby POI
                    const now = Date.now();
                    if (now - lastNonPoiClickTime > 500) {
                        if (selectedMarker) {
                            selectedMarker.setMap(null);
                            selectedMarker = null;
                        }
                    }

                    // Get place details
                    placesService.getDetails({
                        placeId: e.placeId,
                        fields: ['name', 'formatted_address', 'rating', 'user_ratings_total', 'opening_hours', 'geometry', 'reviews', 'formatted_phone_number']
                    }, function(place, status) {
                        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                            const lat = place.geometry.location.lat();
                            const lng = place.geometry.location.lng();

                            // Format reviews
                            const reviews = (place.reviews || []).slice(0, 5).map(function(r) {
                                return {
                                    authorName: r.author_name || "",
                                    rating: r.rating || 0,
                                    text: r.text || "",
                                    relativeTime: r.relative_time_description || ""
                                };
                            });

                            // Send place details to React Native
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: "placeSelect",
                                placeId: e.placeId,
                                name: place.name || "",
                                address: place.formatted_address || "",
                                rating: place.rating || null,
                                totalRatings: place.user_ratings_total || 0,
                                isOpen: place.opening_hours ? place.opening_hours.open_now : null,
                                openingHours: place.opening_hours ? place.opening_hours.weekday_text : null,
                                phoneNumber: place.formatted_phone_number || null,
                                latitude: lat,
                                longitude: lng,
                                reviews: reviews
                            }));
                        }
                    });
                } else {
                    // Regular map click (not on POI)
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();

                    // Track when we create a non-POI marker
                    lastNonPoiClickTime = Date.now();

                    // Clear existing marker and create new one
                    if (selectedMarker) selectedMarker.setMap(null);
                    selectedMarker = new google.maps.Marker({
                        position: { lat, lng },
                        map: map
                    });

                    // Reverse geocode
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat, lng } }, function(results, status) {
                        const address = status === "OK" && results[0] ? results[0].formatted_address : "";
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: "locationSelect",
                            latitude: lat,
                            longitude: lng,
                            address: address,
                            name: address.split(",")[0]
                        }));
                    });
                }
            });

            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "mapReady" }));
        }

        function setCenter(lat, lng, newZoom) {
            if (map) {
                map.setCenter({ lat, lng });
                if (newZoom) map.setZoom(newZoom);
            }
        }

        function setUserLocation(lat, lng) {
            if (!map) return;
            if (userMarker) {
                userMarker.setPosition({ lat, lng });
            } else {
                userMarker = new google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 3
                    }
                });
            }
        }

        function clearSelectedMarker() {
            if (selectedMarker) {
                selectedMarker.setMap(null);
                selectedMarker = null;
            }
        }

        function resetHeading() {
            if (map) {
                map.setHeading(0);
                map.setTilt(0);
            }
        }

        function goToPlace(lat, lng, name) {
            setCenter(lat, lng, 17);
            if (selectedMarker) selectedMarker.setMap(null);
            selectedMarker = new google.maps.Marker({
                position: { lat, lng },
                map: map,
                title: name || ""
            });
        }

        function getPlaceDetails(placeId) {
            placesService.getDetails({
                placeId: placeId,
                fields: ['name', 'formatted_address', 'rating', 'user_ratings_total', 'opening_hours', 'geometry']
            }, function(place, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: "placeDetails",
                        name: place.name || "",
                        address: place.formatted_address || "",
                        rating: place.rating || null,
                        totalRatings: place.user_ratings_total || 0,
                        isOpen: place.opening_hours ? place.opening_hours.isOpen() : null
                    }));
                }
            });
        }

        window.onerror = function(msg) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "error", error: msg }));
        };
    </script>
    <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap" async defer></script>
</body>
</html>
    `;

    const handleMessage = useCallback(
        (event: WebViewMessageEvent) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);
                switch (data.type) {
                    case "mapReady":
                        goToUserLocation();
                        break;
                    case "placeSelect":
                        selectLocation(
                            { latitude: data.latitude, longitude: data.longitude },
                            data.address
                        );
                        setPlaceDetails({
                            name: data.name,
                            address: data.address,
                            rating: data.rating,
                            totalRatings: data.totalRatings,
                            isOpen: data.isOpen,
                            openingHours: data.openingHours,
                            placeId: data.placeId,
                            reviews: data.reviews,
                            phoneNumber: data.phoneNumber,
                        });
                        break;
                    case "locationSelect":
                        selectLocation(
                            { latitude: data.latitude, longitude: data.longitude },
                            data.address
                        );
                        setPlaceDetails({
                            name: data.name || data.address?.split(",")[0] || t("selectedLocation"),
                            address: data.address,
                        });
                        break;
                    case "placeDetails":
                        setPlaceDetails({
                            name: data.name,
                            address: data.address,
                            rating: data.rating,
                            totalRatings: data.totalRatings,
                            isOpen: data.isOpen,
                        });
                        break;
                    case "searchResult":
                        setSearchResults(data.results);
                        break;
                    case "error":
                        console.error("Map error:", data.error);
                        break;
                }
            } catch (e) {
                console.error("Error parsing WebView message:", e);
            }
        },
        [selectLocation, setSearchResults, goToUserLocation]
    );

    const handleMyLocation = () => {
        triggerHaptic();
        goToUserLocation();
    };

    const handleZoomIn = () => {
        triggerHaptic();
        webViewRef.current?.injectJavaScript(`map.setZoom(map.getZoom() + 1); true;`);
    };

    const handleZoomOut = () => {
        triggerHaptic();
        webViewRef.current?.injectJavaScript(`map.setZoom(map.getZoom() - 1); true;`);
    };

    const handleResetHeading = () => {
        triggerHaptic();
        webViewRef.current?.injectJavaScript(`resetHeading(); true;`);
    };

    const handleSaveLocation = () => {
        if (selectedLocation) {
            triggerHaptic();
            savePlace({
                name: placeDetails?.name || selectedAddress?.split(",")[0] || t("selectedLocation"),
                address: placeDetails?.address || selectedAddress || "",
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
            });
            handleClearSelection();
        }
    };

    const handleClearSelection = () => {
        triggerHaptic();
        clearSelection();
        setPlaceDetails(null);
        setShowReviews(false);
        // Ne pas supprimer le marker - il reste visible jusqu'au prochain clic
    };

    const handleShowReviews = () => {
        triggerHaptic();
        setShowReviews(true);
    };

    const renderStars = (rating: number) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(
                    <MaterialIcons key={i} name="star" size={n(14)} color="#FBBC04" />
                );
            } else if (i === fullStars && hasHalfStar) {
                stars.push(
                    <MaterialIcons key={i} name="star-half" size={n(14)} color="#FBBC04" />
                );
            } else {
                stars.push(
                    <MaterialIcons key={i} name="star-outline" size={n(14)} color="#FBBC04" />
                );
            }
        }
        return stars;
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <WebView
                ref={webViewRef}
                source={{ html: htmlContent }}
                style={styles.webview}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={false}
                scalesPageToFit={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                bounces={false}
                scrollEnabled={false}
            />

            {/* Zoom controls */}
            <View style={[styles.zoomControls, { backgroundColor: buttonBg }]}>
                <Pressable onPress={handleZoomIn} style={styles.zoomButton}>
                    <MaterialIcons name="add" size={n(24)} color={textColor} />
                </Pressable>
                <View style={[styles.zoomDivider, { backgroundColor: textColor + "30" }]} />
                <Pressable onPress={handleZoomOut} style={styles.zoomButton}>
                    <MaterialIcons name="remove" size={n(24)} color={textColor} />
                </Pressable>
            </View>

            {/* Compass button (reset heading) - only shown when mapId is configured */}
            {mapId && (
                <Pressable
                    onPress={handleResetHeading}
                    style={[styles.compassButton, { backgroundColor: buttonBg }]}
                >
                    <MaterialIcons name="explore" size={n(24)} color={textColor} />
                </Pressable>
            )}

            {/* My location button */}
            <Pressable
                onPress={handleMyLocation}
                style={[styles.myLocationButton, { backgroundColor: buttonBg }]}
            >
                <MaterialIcons
                    name={isLoadingLocation ? "hourglass-empty" : "my-location"}
                    size={n(24)}
                    color={textColor}
                />
            </Pressable>

            {/* Place details panel */}
            {selectedLocation && placeDetails && (
                <View style={[styles.placePanel, { backgroundColor: buttonBg }]}>
                    {/* Header: Name + Status + Close - Fixed at top */}
                    <View style={styles.panelHeader}>
                        <View style={styles.nameWithStatus}>
                            <StyledText style={styles.placeName} numberOfLines={2}>
                                {placeDetails.name}
                            </StyledText>
                            {placeDetails.isOpen !== undefined && placeDetails.isOpen !== null && (
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: placeDetails.isOpen ? "#34A85320" : "#EA433520" }
                                ]}>
                                    <StyledText style={[
                                        styles.statusText,
                                        { color: placeDetails.isOpen ? "#34A853" : "#EA4335" }
                                    ]}>
                                        {placeDetails.isOpen ? t("openNow") : t("closed")}
                                    </StyledText>
                                </View>
                            )}
                        </View>
                        <Pressable onPress={handleClearSelection} style={styles.closeButton}>
                            <MaterialIcons name="close" size={n(20)} color={textColor} />
                        </Pressable>
                    </View>

                    {/* Scrollable content */}
                    <ScrollView
                        style={styles.panelScrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* Info section: Rating + Address */}
                        <View style={[styles.infoSection, { borderColor: textColor + "15" }]}>
                            {placeDetails.rating && (
                                <View style={styles.ratingRow}>
                                    <StyledText style={styles.ratingText}>
                                        {placeDetails.rating.toFixed(1)}
                                    </StyledText>
                                    <View style={styles.starsContainer}>
                                        {renderStars(placeDetails.rating)}
                                    </View>
                                    {placeDetails.totalRatings && placeDetails.totalRatings > 0 && (
                                        <StyledText style={styles.totalRatings}>
                                            ({placeDetails.totalRatings})
                                        </StyledText>
                                    )}
                                </View>
                            )}

                            <View style={styles.addressRow}>
                                <MaterialIcons name="place" size={n(16)} color={textColor} style={{ opacity: 0.5 }} />
                                <StyledText style={styles.placeAddress} numberOfLines={2}>
                                    {placeDetails.address}
                                </StyledText>
                            </View>
                        </View>

                        {/* Hours section */}
                        {placeDetails.openingHours && placeDetails.openingHours.length > 0 && (
                            <View style={[styles.hoursSection, { borderColor: textColor + "15" }]}>
                                <View style={styles.hoursTitleRow}>
                                    <MaterialIcons name="schedule" size={n(14)} color={textColor} style={{ opacity: 0.5 }} />
                                    <StyledText style={styles.hoursTitle}>{t("openingHours")}</StyledText>
                                </View>
                                {placeDetails.openingHours.map((hour, index) => (
                                    <StyledText key={index} style={styles.hoursText}>
                                        {hour}
                                    </StyledText>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    {/* Action buttons - Fixed at bottom */}
                    <View style={styles.actionButtons}>
                        <Pressable
                            onPress={handleSaveLocation}
                            style={[styles.actionButton, { borderColor: textColor + "30" }]}
                        >
                            <MaterialIcons name="bookmark-add" size={n(18)} color={textColor} />
                        </Pressable>

                        {placeDetails.phoneNumber && (
                            <Pressable
                                onPress={() => {
                                    triggerHaptic();
                                    Linking.openURL(`tel:${placeDetails.phoneNumber}`);
                                }}
                                style={[styles.actionButton, { borderColor: textColor + "30" }]}
                            >
                                <MaterialIcons name="phone" size={n(18)} color={textColor} />
                            </Pressable>
                        )}

                        {placeDetails.reviews && placeDetails.reviews.length > 0 && (
                            <Pressable
                                onPress={handleShowReviews}
                                style={[styles.actionButton, { borderColor: textColor + "30" }]}
                            >
                                <MaterialIcons name="rate-review" size={n(18)} color={textColor} />
                            </Pressable>
                        )}
                    </View>
                </View>
            )}

            {/* Reviews Modal */}
            <Modal
                visible={showReviews}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowReviews(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: backgroundColor + "F0" }]}>
                    <View style={[styles.modalContent, { backgroundColor: buttonBg }]}>
                        <View style={styles.modalHeader}>
                            <StyledText style={styles.modalTitle}>
                                {placeDetails?.name}
                            </StyledText>
                            <Pressable onPress={() => setShowReviews(false)} style={styles.closeButton}>
                                <MaterialIcons name="close" size={n(20)} color={textColor} />
                            </Pressable>
                        </View>

                        {placeDetails?.rating && (
                            <View style={styles.ratingRow}>
                                <StyledText style={styles.ratingText}>
                                    {placeDetails.rating.toFixed(1)}
                                </StyledText>
                                <View style={styles.starsContainer}>
                                    {renderStars(placeDetails.rating)}
                                </View>
                                <StyledText style={styles.totalRatings}>
                                    ({placeDetails.totalRatings} {t("reviews")})
                                </StyledText>
                            </View>
                        )}

                        <ScrollView
                            style={styles.reviewsList}
                            contentContainerStyle={styles.reviewsContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {placeDetails?.reviews?.map((review, index) => (
                                <View key={index} style={[styles.reviewItem, { borderBottomColor: textColor + "20" }]}>
                                    <View style={styles.reviewHeader}>
                                        <StyledText style={styles.reviewAuthor}>{review.authorName}</StyledText>
                                        <StyledText style={styles.reviewTime}>{review.relativeTime}</StyledText>
                                    </View>
                                    <View style={styles.reviewRating}>
                                        {renderStars(review.rating)}
                                    </View>
                                    <StyledText style={styles.reviewText}>{review.text}</StyledText>
                                </View>
                            ))}
                        </ScrollView>

                        <Pressable
                            onPress={() => setShowReviews(false)}
                            style={[styles.closeModalButton, { borderColor: textColor + "50" }]}
                        >
                            <StyledText style={styles.actionButtonText}>{t("closeReviews")}</StyledText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// LPIII: 1080 × 1240 (aspect ratio ~0.87:1)
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    // Zoom controls - top right
    zoomControls: {
        position: "absolute",
        right: n(12),
        top: n(18),
        borderRadius: n(8),
        overflow: "hidden",
    },
    zoomButton: {
        padding: n(10),
        alignItems: "center",
        justifyContent: "center",
    },
    zoomDivider: {
        height: 1,
    },
    // Compass button - above my location button
    compassButton: {
        position: "absolute",
        right: n(12),
        bottom: n(160),
        padding: n(12),
        borderRadius: n(8),
    },
    // Location button - above navbar
    myLocationButton: {
        position: "absolute",
        right: n(12),
        bottom: n(100),
        padding: n(12),
        borderRadius: n(8),
    },
    // Place details panel - above navbar, max height to avoid top cutoff
    placePanel: {
        position: "absolute",
        left: n(12),
        right: n(12),
        bottom: n(10),
        maxHeight: "95%",
        padding: n(14),
        borderRadius: n(12),
    },
    panelHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: n(12),
    },
    panelScrollContent: {
        flexGrow: 0,
        marginBottom: n(12),
    },
    nameWithStatus: {
        flex: 1,
        marginRight: n(8),
        gap: n(6),
    },
    placeName: {
        fontSize: n(18),
        fontWeight: "700",
    },
    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: n(8),
        paddingVertical: n(3),
        borderRadius: n(4),
    },
    statusText: {
        fontSize: n(12),
        fontWeight: "600",
    },
    closeButton: {
        padding: n(4),
    },
    infoSection: {
        paddingBottom: n(12),
        marginBottom: n(12),
        borderBottomWidth: 1,
        gap: n(8),
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    ratingText: {
        fontSize: n(15),
        fontWeight: "600",
        marginRight: n(4),
    },
    starsContainer: {
        flexDirection: "row",
        marginRight: n(6),
    },
    totalRatings: {
        fontSize: n(13),
        opacity: 0.5,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: n(6),
    },
    placeAddress: {
        flex: 1,
        fontSize: n(13),
        opacity: 0.7,
        lineHeight: n(18),
    },
    hoursSection: {
        paddingBottom: n(12),
        marginBottom: n(12),
        borderBottomWidth: 1,
    },
    hoursTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(6),
        marginBottom: n(6),
    },
    hoursTitle: {
        fontSize: n(13),
        fontWeight: "600",
        opacity: 0.7,
    },
    hoursText: {
        fontSize: n(12),
        opacity: 0.6,
        lineHeight: n(17),
    },
    actionButtons: {
        flexDirection: "row",
        gap: n(10),
    },
    actionButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: n(12),
        borderRadius: n(8),
        borderWidth: 1,
    },
    // Reviews modal - centered with margins for 1080×1240
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingHorizontal: n(12),
        paddingTop: n(20),
        paddingBottom: n(85),
    },
    modalContent: {
        width: "100%",
        borderRadius: n(12),
        padding: n(14),
        maxHeight: "100%",
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: n(6),
    },
    modalTitle: {
        fontSize: n(20),
        fontWeight: "700",
        flex: 1,
        marginRight: n(8),
    },
    reviewsList: {
        marginTop: n(10),
        marginBottom: n(10),
        maxHeight: n(280),
    },
    reviewsContent: {
        paddingBottom: n(8),
    },
    reviewItem: {
        paddingVertical: n(10),
        borderBottomWidth: 1,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: n(3),
    },
    reviewAuthor: {
        fontSize: n(15),
        fontWeight: "600",
        flex: 1,
    },
    reviewTime: {
        fontSize: n(13),
        opacity: 0.6,
    },
    reviewRating: {
        flexDirection: "row",
        marginBottom: n(4),
    },
    reviewText: {
        fontSize: n(14),
        lineHeight: n(20),
        opacity: 0.9,
    },
    closeModalButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: n(10),
        borderRadius: n(8),
        borderWidth: 1,
        marginTop: n(4),
    },
});
