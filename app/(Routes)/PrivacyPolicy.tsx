import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PrivacyPolicy = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: March 13, 2026</Text>

        <Text style={styles.paragraph}>
          Welcome to Inventra. We respect your privacy and are committed to protecting the personal data of our retail merchants. This Privacy Policy explains how we collect, use, and safeguard your personal and business information when you use our mobile application.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bulletBold}>Profile Information:</Text> Your name, phone number, business name, and business type registered during onboarding.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bulletBold}>Inventory & Sales Records:</Text> Information about your products, unit pricing, cost prices, quantities, transactions, and restock details.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bulletBold}>App Images:</Text> Images uploaded for your product items and user profile pictures.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
          <Text style={styles.paragraph}>
            We process your information solely to deliver local database storage services, perform analytics on sales and profit trends, trigger low-stock alerts, and synchronize your data securely with our backend API.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Data Storage & Security</Text>
          <Text style={styles.paragraph}>
            Your data is cached locally on your device for offline operation and transmitted securely via industry-standard SSL encryption to our central database servers. Access is protected by JSON Web Token (JWT) credentials.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about our data practices or want to request account deletion, please reach out via our Help Center or contact support at support@inventra.app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    color: "#333",
    fontFamily: "DMSans_700Bold",
  },
  spacer: {
    width: 24,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 13,
    color: "#777",
    fontFamily: "DMSans_400Regular",
    marginBottom: 20,
  },
  paragraph: {
    fontSize: 15,
    color: "#4A4A4A",
    lineHeight: 22,
    fontFamily: "DMSans_400Regular",
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#1155CC",
    fontFamily: "DMSans_700Bold",
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    color: "#4A4A4A",
    lineHeight: 22,
    fontFamily: "DMSans_400Regular",
    marginBottom: 8,
    paddingLeft: 8,
  },
  bulletBold: {
    fontFamily: "DMSans_700Bold",
    color: "#2C3E50",
  },
});

export default PrivacyPolicy;
