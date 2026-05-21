import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { useTheme } from "../../context/ThemeContext";

const LAST_UPDATED = "May 21, 2026";

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
      "mailto:hello@summitscene.ca?subject=Summit%20Scene%20Privacy%20or%20Legal%20Question"
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
            This screen summarizes Summit Scene's privacy policy, terms,
            community guidelines, safety notes, support information, and account
            deletion process. It is not legal advice.
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
            town, profile details, avatar, selected languages, interests,
            social links, email verification status, and business verification
            status.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Public content: event posts, community posts, buddy posts, replies,
            profile information you choose to share, likes, interests, and
            attendance choices, saved event choices, and business information
            you choose to share.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Optional profile choices, including community interests, languages,
            social links, or LGBTQ+ related interests, may reveal personal or
            sensitive information. Only add details you are comfortable sharing
            with other users.
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
            Technical and support data: device or app diagnostics, request logs,
            server errors, support emails, bug reports, and security-related
            records may be used to support, debug, protect, and improve the app.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Account recovery data: email verification, password reset, and email
            change confirmation tokens may be created for account security. These
            tokens are temporary and are stored in protected form where
            applicable.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Service providers: data may be processed by hosting, database,
            address lookup or geocoding, authentication, social login,
            analytics, support, and app operations providers when those features
            are used.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Deletion: users can delete their account in Account. Deletion
            removes the account and associated app data, except where limited
            retention is required for security, abuse prevention, or legal
            compliance.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="How We Use Information" theme={theme}>
          <LegalBullet theme={theme}>
            To provide accounts, profiles, events, community posts, maps,
            replies, saved events, attendance, reminders, and plan features.
          </LegalBullet>
          <LegalBullet theme={theme}>
            To review business and organizer accounts and manage event posting
            access.
          </LegalBullet>
          <LegalBullet theme={theme}>
            To respond to reports, blocks, moderation issues, support requests,
            bug reports, and account recovery requests.
          </LegalBullet>
          <LegalBullet theme={theme}>
            To improve app safety, reliability, performance, and compliance with
            legal, safety, and platform review obligations.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Public Content" theme={theme}>
          <LegalText theme={theme}>
            Profiles, events, community posts, replies, business information,
            attendance signals, and similar content may be visible to other
            users. Do not post private information you do not want others to see.
          </LegalText>
          <LegalText theme={theme}>
            Optional profile choices, including community interests, languages,
            social links, or LGBTQ+ related interests, may reveal personal or
            sensitive information. Only add details you are comfortable sharing
            with other users.
          </LegalText>
        </LegalSection>

        <LegalSection title="Security Safeguards" theme={theme}>
          <LegalText theme={theme}>
            No app or online service can guarantee that hacking, unauthorized
            access, data loss, or misuse will never happen. Summit Scene uses
            reasonable safeguards to reduce risk and protect accounts.
          </LegalText>
          <LegalBullet theme={theme}>
            Passwords are not stored as plain text. They are stored as password
            hashes.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Login sessions use authentication tokens, and password changes
            invalidate older sessions.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Email verification, password reset, and email change tokens are
            temporary and are not intended to be reusable.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Database access and admin tools should be limited to people who need
            access to operate, secure, support, or moderate Summit Scene.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Summit Scene uses service providers that offer security controls for
            hosting, database storage, email delivery, and app operations.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Users should use a strong unique password, keep their email account
            secure, and log out on shared devices.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Developer and Admin Access" theme={theme}>
          <LegalText theme={theme}>
            Summit Scene is operated by a developer/admin team. Developer or
            administrator access to user data is limited to running the app,
            fixing bugs, investigating security issues, responding to support
            requests, reviewing reports, enforcing community rules, verifying
            business accounts, and complying with legal obligations.
          </LegalText>
          <LegalText theme={theme}>
            Developers and administrators should not access, copy, disclose,
            sell, or use personal information for unrelated personal reasons.
            Passwords cannot be viewed because the app stores password hashes
            rather than plain-text passwords.
          </LegalText>
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

        <LegalSection title="Account & Data Deletion" theme={theme}>
          <LegalText theme={theme}>
            Users can delete their account from Account in the app. This is the
            fastest way to request deletion from inside Summit Scene.
          </LegalText>
          <LegalText theme={theme}>
            Users can also request deletion by emailing hello@summitscene.ca
            with the subject line "Delete my Summit Scene account" and the email
            address connected to the account.
          </LegalText>
          <LegalBullet theme={theme}>
            Deletion removes the account profile and login-associated app data.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Public content, saved events, interest signals, and app preferences
            are removed where technically and operationally possible.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Some information may be retained for a limited time when needed for
            security, abuse prevention, dispute handling, backups, legal
            compliance, or platform review requirements.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Terms of Use" theme={theme}>
          <LegalBullet theme={theme}>
            Users must be at least 18 years old to create an account. Summit
            Scene may show events at adults-only venues, including bars, and
            users are responsible for following venue, alcohol, identification,
            and local age rules.
          </LegalBullet>
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
            Users must not post official business, venue, or organizer content
            unless they are authorized to do so.
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
          <LegalText theme={theme}>
            Summit Scene is for local events, plans, introductions, groups, town
            notices, and community discovery around Banff, Canmore, Lake Louise,
            and nearby areas.
          </LegalText>
          <LegalText theme={theme}>
            LGBTQ+ people, newcomers, locals, visitors, and allies should be
            able to use Summit Scene without harassment, outing, slurs, or
            identity-based targeting.
          </LegalText>
          <LegalBullet theme={theme}>
            Meet in public places, use good judgment, and do not share sensitive
            personal information in public posts or replies.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Keep community posts practical, respectful, and local to Banff,
            Canmore, Lake Louise, or nearby Bow Valley activity.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Do not post harassment, hate, threats, bullying, unwanted sexual
            content, scams, spam, misleading event details, fake business
            listings, impersonation, illegal activity, unsafe instructions,
            content encouraging harm, private personal information without
            permission, or repeated off-topic content.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Use Report or Block if something feels unsafe, misleading, abusive,
            suspicious, or inappropriate.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Safety" theme={theme}>
          <LegalBullet theme={theme}>
            Meet in public places for first plans, tell someone where you are
            going and who you are meeting, and keep first meetups simple and
            low-pressure.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Trust your judgment and leave any situation that feels
            uncomfortable.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Review profiles, event details, location, date, and time before
            making plans.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Confirm outdoor conditions, road conditions, weather, skill level,
            required gear, tickets, venue access, and host details yourself when
            they matter for safety.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Local Event & Business Compliance" theme={theme}>
          <LegalText theme={theme}>
            Business and organizer profiles are for venues, shops, activity
            providers, event hosts, markets, wellness studios, community
            organizations, and other local operators who want to share official
            events or experiences.
          </LegalText>
          <LegalText theme={theme}>
            Business and organizer accounts may be reviewed before they receive
            posting access. Summit Scene may reject, pause, or remove business
            access if a profile appears misleading, unauthorized, unsafe, or
            incomplete.
          </LegalText>
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

        <LegalSection title="Children" theme={theme}>
          <LegalText theme={theme}>
            Summit Scene accounts are intended for users who are at least 18
            years old. If you believe a child has provided personal information,
            contact Summit Scene.
          </LegalText>
        </LegalSection>

        <LegalSection title="Support" theme={theme}>
          <LegalText theme={theme}>
            For app support, bug reports, privacy requests, business questions,
            safety or moderation issues, or deletion requests, email
            hello@summitscene.ca.
          </LegalText>
          <LegalBullet theme={theme}>
            Helpful details include your account email if relevant, the screen
            or feature you were using, what happened, what you expected to
            happen, and your device type or app version if available.
          </LegalBullet>
          <LegalBullet theme={theme}>
            For urgent danger, contact local emergency services.
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
            Contact hello@summitscene.ca
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
