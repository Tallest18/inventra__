// app/(Main)/Profile.tsx
import type { UploadableProfileImage } from "@/src/api";
import { getBusinessTypes, getProfile, updateProfile } from "@/src/api";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Profile = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [profileImage, setProfileImage] = useState(""); // remote URL from backend
  const [localImageUri, setLocalImageUri] = useState(""); // local URI for display after picking
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [hasInitializedForm, setHasInitializedForm] = useState(false);

  // Holds the picked image asset until Save is pressed
  const pendingImageRef = useRef<UploadableProfileImage | null>(null);

  const {
    data: profile,
    isLoading: loadingProfile,
    isError: isProfileError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  // "general_retail" -> "General Retail" (was hard-coded Retail/Service).
  const { data: businessTypes } = useQuery({
    queryKey: ["business-types"],
    queryFn: getBusinessTypes,
    staleTime: Infinity,
  });
  const businessTypeLabel =
    businessTypes?.find((t) => t.value === businessType)?.display ||
    (businessType ? businessType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Not set");

  useEffect(() => {
    if (!profile || hasInitializedForm) return;
    setBusinessName(profile.name || profile.business_name || "");
    setPhoneNumber(profile.phone || "");
    setBusinessType(profile.business_type || "");
    setDescription(profile.business_description || "");
    setProfileImage(profile.profile_image || "");
    setHasInitializedForm(true);
  }, [profile, hasInitializedForm]);

  useEffect(() => {
    if (!isProfileError) return;
    Alert.alert("Error", "Could not fetch profile data.");
  }, [isProfileError]);

  const updateProfileMutation = useMutation({
    mutationFn: ({
      name,
      about,
      image,
    }: {
      name: string;
      about: string;
      image?: UploadableProfileImage;
    }) =>
      updateProfile(
        {
          // Business name is optional; an empty box keeps the account name.
          ...(name ? { name, business_name: name } : { business_name: "" }),
          business_description: about,
        },
        image,
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      setBusinessName(updated.name || updated.business_name || "");
      setPhoneNumber(updated.phone || "");
      setBusinessType(updated.business_type || "");
      setDescription(updated.business_description || "");
      setProfileImage(updated.profile_image || "");
      setLocalImageUri("");
      pendingImageRef.current = null;

      Alert.alert("Success", "Profile details saved!");
      router.back();
    },
    onError: (error) => {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile details.");
    },
  });

  // Convert ImagePickerAsset → UploadableProfileImage
  const asUploadable = (
    asset: ImagePicker.ImagePickerAsset,
  ): UploadableProfileImage => ({
    uri: asset.uri,
    fileName: asset.fileName ?? asset.uri.split("/").pop(),
    mimeType: asset.mimeType ?? "image/jpeg",
    type: asset.mimeType ?? "image/jpeg",
  });

  // Handle picking image  just store it locally, do NOT upload yet
  const handlePickImage = async (useCamera: boolean) => {
    if (Platform.OS === "web" && !useCamera) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        pendingImageRef.current = asUploadable(asset);
        setLocalImageUri(asset.uri); // show immediately in UI
      }
      return;
    }

    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Denied",
        "Permission to access camera or gallery is required!",
      );
      return;
    }

    const pickerOptions = {
      mediaTypes: "images" as const,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.7,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (!result.canceled) {
      const asset = result.assets[0];
      pendingImageRef.current = asUploadable(asset);
      setLocalImageUri(asset.uri); // show immediately in UI
    }
  };

  // Save everything in one request  text fields + image together
  const handleSave = async () => {
    if (!hasChanges) return;
    try {
      await updateProfileMutation.mutateAsync({
        name: businessName.trim(),
        about: description.trim(),
        image: pendingImageRef.current ?? undefined,
      });
    } catch {
      // handled in mutation onError
    }
  };

  const showImagePickerOptions = () => {
    if (Platform.OS === "web") {
      handlePickImage(false);
      return;
    }
    Alert.alert(
      "Change Profile Picture",
      "How would you like to select a new photo?",
      [
        { text: "Take Photo", onPress: () => handlePickImage(true) },
        { text: "Choose from Gallery", onPress: () => handlePickImage(false) },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  // Display local URI if user just picked one, otherwise use remote URL
  const displayImage = localImageUri || profileImage;
  const loading = loadingProfile || updateProfileMutation.isPending;
  const saving = updateProfileMutation.isPending;
  // Save lights up only when something actually changed (as in the design).
  const hasChanges =
    !!profile &&
    (businessName.trim() !== (profile.name || profile.business_name || "").trim() ||
      description.trim() !== (profile.business_description || "").trim() ||
      !!localImageUri);

  // +2348011112222 -> +234 801 111 2222
  const prettyPhone = phoneNumber.replace(/^(\+234)(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3 $4");

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header (pinned) */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Your personal account</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
          </TouchableOpacity>
        </View>

        {/* Only the content scrolls (flex:1 + minHeight:0 bound its height). */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              onPress={showImagePickerOptions}
              style={styles.photoRing}
              disabled={loading}
              accessibilityLabel="Change profile picture"
            >
              <Image
                key={displayImage}
                source={
                  displayImage
                    ? { uri: displayImage }
                    : require("../../assets/images/noImg.jpg")
                }
                style={styles.photo}
              />
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={15} color="#fff" />
              </View>
            </TouchableOpacity>
            {!!localImageUri && (
              <Text style={styles.photoHint}>New photo selected · tap Save Changes</Text>
            )}
          </View>

          {/* Phone */}
          {!!phoneNumber && (
            <View style={[styles.card, styles.phoneCard]}>
              <View style={styles.phoneIcon}>
                <Feather name="phone" size={20} color="#1155CC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabelMuted}>Phone Number</Text>
                <Text style={styles.phoneValue}>{prettyPhone}</Text>
                {profile?.phone_verified !== false && (
                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Business name */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Business Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mama Tee's Store"
              placeholderTextColor="#9CA3AF"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <Text style={styles.cardHint}>This name appears on reports and receipts</Text>
          </View>

          {/* Business type (read-only) */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Business Type</Text>
            <View style={[styles.input, styles.inputReadOnly]}>
              <Text style={styles.readOnlyText}>{businessTypeLabel}</Text>
            </View>
            <Text style={styles.cardHint}>Set during onboarding • Cannot be changed</Text>
          </View>

          {/* Description */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief description of your business..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#1155CC" }]}>
                {profile?.days_active ?? "–"}
              </Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile?.products_added ?? "–"}</Text>
              <Text style={styles.statLabel}>Products Added</Text>
            </View>
          </View>
        </ScrollView>

        {/* Save (pinned at the bottom) */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
          <TouchableOpacity
            style={[styles.saveButton, !hasChanges && styles.saveButtonIdle]}
            onPress={handleSave}
            disabled={!hasChanges || loading}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextIdle]}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.footerNote}>All fields are optional. You can complete this later.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E7EEFA" },
  flex: { flex: 1 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: "#E7EEFA",
  },
  headerTitle: { fontSize: 28, color: "#1C1C1C", fontFamily: "DMSans_700Bold" },
  headerSubtitle: { fontSize: 14, color: "#6B7280", fontFamily: "DMSans_400Regular", marginTop: 2 },
  backButton: {
    width: 52,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  photoSection: { alignItems: "center", marginTop: 8, marginBottom: 22 },
  photoRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: "#1155CC",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  photo: { width: 96, height: 96, borderRadius: 48 },
  cameraBadge: {
    position: "absolute",
    right: -4,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1155CC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E7EEFA",
  },
  photoHint: { marginTop: 10, fontSize: 12, color: "#1155CC", fontFamily: "DMSans_500Medium" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  phoneCard: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  phoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E7EEFA",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabelMuted: { fontSize: 13, color: "#6B7280", fontFamily: "DMSans_400Regular" },
  phoneValue: { fontSize: 18, color: "#1C1C1C", fontFamily: "DMSans_500Medium", marginTop: 2 },
  verifiedPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  verifiedText: { fontSize: 11, color: "#15803D", fontFamily: "DMSans_500Medium" },
  cardLabel: { fontSize: 15, color: "#1C1C1C", fontFamily: "DMSans_500Medium", marginBottom: 12 },
  input: {
    backgroundColor: "#EEF0F4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9DDE4",
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: "#1C1C1C",
    fontFamily: "DMSans_400Regular",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
  },
  inputReadOnly: { backgroundColor: "#F5F6F8" },
  readOnlyText: { fontSize: 16, color: "#374151", fontFamily: "DMSans_400Regular" },
  textArea: { minHeight: 96 },
  cardHint: { marginTop: 10, fontSize: 12.5, color: "#6B7280", fontFamily: "DMSans_400Regular" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  statValue: { fontSize: 26, color: "#1C1C1C", fontFamily: "DMSans_700Bold" },
  statLabel: { marginTop: 8, fontSize: 13, color: "#6B7280", fontFamily: "DMSans_400Regular" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#E7EEFA",
    borderTopWidth: 1,
    borderTopColor: "#D6DEEB",
  },
  saveButton: {
    backgroundColor: "#1155CC",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonIdle: { backgroundColor: "#EEF1F6" },
  saveButtonText: { fontSize: 16, color: "#FFFFFF", fontFamily: "DMSans_600SemiBold" },
  saveButtonTextIdle: { color: "#A0A9B8", fontFamily: "DMSans_400Regular" },
  footerNote: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12.5,
    color: "#6B7280",
    fontFamily: "DMSans_400Regular",
  },
});

export default Profile;
