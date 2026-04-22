// components/events/EventHostSection.js
// Shows the "Hosted by" business card + modal profile for the event host.
// This uses avatarKey from the User document to render one of our local avatar PNGs.

import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, Modal } from "react-native";
import { useTheme } from "../../context/ThemeContext";

import { AVATARS } from "../../assets/avatars/avatarConfig";

// Helper: map avatarKey -> local avatar image (see avatarConfig.js)
function getAvatarSource(avatarKey) {
  if (!avatarKey) return null;
  return AVATARS[avatarKey] || null;
}

export default function EventHostSection({ host }) {
  const { theme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!host) return null;

  // For this screen, host.avatarKey comes from getEventHost(event) in EventDetailScreen
  const avatarSource = host.avatarKey ? getAvatarSource(host.avatarKey) : null;

  return (
    <>
      {/* Small host card on the detail screen */}
      <View
        style={[
          styles.hostCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.hostSectionTitle, { color: theme.text }]}>
          Hosted by
        </Text>

        <View style={styles.hostRow}>
          <View style={[styles.hostAvatar, { backgroundColor: theme.card }]}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.hostAvatarImage} />
            ) : (
              <Text style={[styles.hostAvatarInitial, { color: theme.text }]}>
                {host.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.hostTextCol}>
            <Text style={[styles.hostName, { color: theme.text }]}>
              {host.name}
            </Text>
            <Text style={[styles.hostTown, { color: theme.textMuted }]}>
              {host.town}
            </Text>
            {host.businessType ? (
              <Text style={[styles.hostMeta, { color: theme.textMuted }]}>
                {host.businessType}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          style={[styles.hostProfileButton, { borderColor: theme.accent }]}
          onPress={() => setIsProfileOpen(true)}
        >
          <Text style={[styles.hostProfileButtonText, { color: theme.accent }]}>
            View event posting profile
          </Text>
        </Pressable>
      </View>

      {/* Full profile modal */}
      {isProfileOpen && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setIsProfileOpen(false)}
        >
          <View style={styles.profileModalOverlay}>
            <View
              style={[
                styles.profileModalCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.profileModalHeader}>
                <Text style={[styles.profileModalTitle, { color: theme.text }]}>
                  Event posting profile
                </Text>
                <Pressable onPress={() => setIsProfileOpen(false)}>
                  <Text
                    style={[styles.profileModalClose, { color: theme.accent }]}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>

              {/* Top row */}
              <View style={styles.profileTopRow}>
                <View
                  style={[
                    styles.profileAvatar,
                    { backgroundColor: theme.card },
                  ]}
                >
                  {avatarSource ? (
                    <Image
                      source={avatarSource}
                      style={styles.profileAvatarImage}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.profileAvatarInitial,
                        { color: theme.text },
                      ]}
                    >
                      {host.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileName, { color: theme.text }]}>
                    {host.name}
                  </Text>
                  <Text
                    style={[styles.profileTown, { color: theme.textMuted }]}
                  >
                    {host.town || "Rockies business"}
                  </Text>
                  <Text
                    style={[styles.profileRole, { color: theme.textMuted }]}
                  >
                    Business host
                  </Text>
                </View>
              </View>

              {/* About / business type */}
              {host.bio ? (
                <View style={styles.profileSection}>
                  <Text
                    style={[
                      styles.profileSectionLabel,
                      { color: theme.textMuted },
                    ]}
                  >
                    About
                  </Text>
                  <Text
                    style={[styles.profileSectionText, { color: theme.text }]}
                  >
                    {host.bio}
                  </Text>
                </View>
              ) : null}

              {host.businessType ? (
                <View style={styles.profileSection}>
                  <Text
                    style={[
                      styles.profileSectionLabel,
                      { color: theme.textMuted },
                    ]}
                  >
                    Business type
                  </Text>
                  <Text
                    style={[styles.profileSectionText, { color: theme.text }]}
                  >
                    {host.businessType}
                  </Text>
                </View>
              ) : null}

              {/* Instagram */}
              {host.instagram ? (
                <View style={styles.profileSection}>
                  <Text
                    style={[
                      styles.profileSectionLabel,
                      { color: theme.textMuted },
                    ]}
                  >
                    Instagram
                  </Text>
                  <Text
                    style={[styles.profileLinkText, { color: theme.accent }]}
                  >
                    {host.instagram}
                  </Text>
                </View>
              ) : null}

              {/* Website */}
              {host.website ? (
                <View style={styles.profileSection}>
                  <Text
                    style={[
                      styles.profileSectionLabel,
                      { color: theme.textMuted },
                    ]}
                  >
                    Website
                  </Text>
                  <Text
                    style={[styles.profileLinkText, { color: theme.accent }]}
                  >
                    {host.website}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hostCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  hostSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  hostAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hostAvatarInitial: {
    fontSize: 20,
    fontWeight: "700",
  },
  hostTextCol: {
    flex: 1,
  },
  hostName: {
    fontSize: 15,
    fontWeight: "600",
  },
  hostTown: {
    fontSize: 13,
  },
  hostMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  hostProfileButton: {
    marginTop: 6,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  hostProfileButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },

  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  profileModalCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  profileModalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileModalClose: {
    fontSize: 14,
    fontWeight: "600",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  profileAvatarInitial: {
    fontSize: 22,
    fontWeight: "700",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileTown: {
    fontSize: 13,
    marginTop: 2,
  },
  profileRole: {
    fontSize: 12,
    marginTop: 2,
  },
  profileSection: {
    marginTop: 10,
  },
  profileSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  profileSectionText: {
    fontSize: 13,
  },
  profileLinkText: {
    fontSize: 13,
  },
});
