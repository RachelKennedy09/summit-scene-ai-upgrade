import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { useTheme } from "../../context/ThemeContext";

const LAST_UPDATED = "May 4, 2026";

const LEGAL_LINKS = [
  {
    label: "Alberta private-sector privacy law (PIPA)",
    url: "https://www.alberta.ca/personal-information-protection-act",
  },
  {
    label: "Canada privacy consent guidance",
    url: "https://www.priv.gc.ca/en/privacy-topics/collecting-personal-information/consent/gl_omc_201805/",
  },
  {
    label: "Canada anti-spam requirements (CASL)",
    url: "https://crtc.gc.ca/eng/internet/anti/reg.htm",
  },
  {
    label: "Parks Canada Banff permits and licences",
    url: "https://parks.canada.ca/pn-np/ab/banff/info/permis-permit",
  },
  {
    label: "Town of Banff licences and permits",
    url: "https://banff.ca/685/Common-Licenses-Permits",
  },
  {
    label: "Town of Canmore event permits",
    url: "https://www.canmore.ca/your-business/permits-and-licenses/events",
  },
  {
    label: "Town of Canmore business licences",
    url: "https://www.canmore.ca/your-business/permits-and-licenses/business-licenses",
  },
];

function LegalSection({ title, children, theme }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function LegalText({ children, theme }) {
  return <Text style={[styles.bodyText, { color: theme.textMuted }]}>{children}</Text>;
}

function LegalBullet({ children, theme }) {
  return (
    <Text style={[styles.bulletText, { color: theme.textMuted }]}>
      {"\u2022"} {children}
    </Text>
  );
}

function LegalLink({ label, url, theme }) {
  function handleOpen() {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <Pressable
      style={[styles.linkButton, { borderColor: theme.border }]}
      onPress={handleOpen}
    >
      <Text style={[styles.linkText, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

export default function LegalScreen() {
  const { theme } = useTheme();

  function handleEmail() {
    Linking.openURL(
      "mailto:admin@summitscene.ca?subject=Summit%20Scene%20Privacy%20or%20Legal%20Question"
    ).catch(() => {});
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Privacy & Terms"
          subtitle={`Summit Scene legal information. Last updated ${LAST_UPDATED}.`}
        />

        <LegalSection title="Important Note" theme={theme}>
          <LegalText theme={theme}>
            This screen is a practical policy draft for Summit Scene testing and
            launch preparation. It is not legal advice. Have a qualified lawyer
            review the final public policy, terms, and store listing before a
            production launch.
          </LegalText>
        </LegalSection>

        <LegalSection title="Privacy Policy" theme={theme}>
          <LegalText theme={theme}>
            Summit Scene collects the information needed to create accounts,
            show local events, support community features, review business
            accounts, moderate reports, and keep the app working.
          </LegalText>
          <LegalBullet theme={theme}>
            Account data: name or business name, email, password hash, role,
            town, profile details, avatar, social links, and verification status.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Public content: event posts, community posts, buddy posts, replies,
            profile information you choose to share, likes, interests, and
            attendance choices.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Location data: optional device location is used for nearby event
            features after permission is granted. Event addresses may be sent to
            address lookup/geocoding services to place events on the map.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Safety data: reports, blocks, moderation notes, and admin review
            actions are used to operate safety and moderation tools.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Service providers: data may be processed by hosting, database,
            address lookup, social login, and AI description generation
            providers when those features are used.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Deletion: users can delete their account in Account. Deletion
            removes the account and associated app data, except where limited
            retention is required for security, abuse prevention, or legal
            compliance.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Consent & Communications" theme={theme}>
          <LegalText theme={theme}>
            By creating an account, users consent to the collection and use of
            their information for app functionality. Optional features, such as
            location and social profile links, should stay optional.
          </LegalText>
          <LegalText theme={theme}>
            If Summit Scene later sends marketing emails, newsletters, or
            promotional messages, it should collect clear opt-in consent and
            include sender identification plus an unsubscribe option. Account
            security, verification, and support messages can be handled
            separately from marketing.
          </LegalText>
        </LegalSection>

        <LegalSection title="Terms of Use" theme={theme}>
          <LegalBullet theme={theme}>
            Users must provide accurate account information and must not pretend
            to represent a business or organization they are not authorized to
            represent.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Users are responsible for the content they post and must not post
            harassment, scams, unsafe instructions, illegal content, misleading
            event details, spam, or content that violates another person's rights.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Summit Scene can remove content, restrict accounts, reject business
            verification, or report serious issues when needed for safety,
            compliance, or app integrity.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Summit Scene is an events and community discovery tool. It is not an
            emergency service, government service, municipal authority, Parks
            Canada authority, travel advisor, or permit/licensing advisor.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Community Guidelines" theme={theme}>
          <LegalBullet theme={theme}>
            Meet in public places, use good judgment, and do not share sensitive
            personal information in public posts or replies.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Keep community posts practical, respectful, and local to Banff,
            Canmore, Lake Louise, or nearby Bow Valley activity.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Use Report or Block if something feels unsafe, misleading, abusive,
            or suspicious.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Local Event & Business Compliance" theme={theme}>
          <LegalText theme={theme}>
            Businesses and organizers are responsible for confirming and
            following all permits, licences, insurance, park rules, municipal
            bylaws, venue rules, alcohol rules, food rules, road use rules, and
            safety requirements that apply to their event or business activity.
          </LegalText>
          <LegalBullet theme={theme}>
            Banff and Lake Louise activities may involve Parks Canada and Town
            of Banff requirements, including business licences, special event
            applications, commercial activity rules, and national park rules.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Canmore events on Town property may require event permits,
            insurance, business licences, road use approvals, and separate
            approvals for food, alcohol, raffles, structures, or vendors.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Event approval in Summit Scene does not mean an event is licensed,
            permitted, insured, or approved by Parks Canada, the Town of Banff,
            the Town of Canmore, Alberta Health Services, AGLC, or any venue.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Official Resources" theme={theme}>
          {LEGAL_LINKS.map((link) => (
            <LegalLink
              key={link.url}
              label={link.label}
              url={link.url}
              theme={theme}
            />
          ))}
        </LegalSection>

        <Pressable
          style={[styles.contactButton, { borderColor: theme.accent }]}
          onPress={handleEmail}
        >
          <Text style={[styles.contactText, { color: theme.accent }]}>
            Contact admin@summitscene.ca
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  linkButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "800",
  },
  contactButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  contactText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
