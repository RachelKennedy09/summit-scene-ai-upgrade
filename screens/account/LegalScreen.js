import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { useTheme } from "../../context/ThemeContext";

const LAST_UPDATED = "August 13, 2026";

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

        <LegalSection title="Account Terms & User Safety" theme={theme}>
          <LegalText theme={theme}>
            Summit Scene includes user-generated content, including profiles,
            community posts, event plans, replies, attendance signals, business
            profiles, and event listings. Users must agree to Summit Scene's
            account terms before logging in or creating an account.
          </LegalText>
          <LegalBullet theme={theme}>
            Summit Scene has no tolerance for objectionable content or abusive
            users, including harassment, hate, threats, sexual exploitation,
            scams, spam, impersonation, misleading events, or content targeting
            people based on identity or protected characteristics.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Users can report objectionable content from posts, replies, events,
            event posting profiles, and member profiles by using the in-app
            Report controls.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Users can block abusive users from member profiles, community
            posts, and replies. Blocking hides that user's content where
            supported and creates a moderation signal for Summit Scene review.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Summit Scene reviews safety reports as quickly as possible and aims
            to act within 24 hours by removing violating content and
            restricting, suspending, or removing abusive users when warranted.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Privacy Policy" theme={theme}>
          <LegalText theme={theme}>
            Summit Scene collects the information needed to create accounts,
            show local events and tours, support community features, review
            business and organizer accounts, moderate reports, and keep the app
            working.
          </LegalText>
          <LegalBullet theme={theme}>
            Account data: name or business name, email, password hash, role,
            town, profile details, avatar, selected interests, social
            links, public business phone number, website, Instagram, Facebook,
            Google Business listing, email verification status, and business
            verification status.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Public content: event and tour posts, photos, categories, category
            tags, vibe tags, duration, price range, meeting location, booking
            links, community posts, buddy posts, replies, profile information
            you choose to share, likes, interests, attendance choices, saved
            event choices, reminder choices, and business information you choose
            to share.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Imported event listings: factual event details from publicly
            accessible organizer/source webpages, such as event name, date,
            time, venue, town, price, organizer, ticket URL, and original source
            URL. Imported listings use short original summaries and retain
            attribution to the organizer or source.
          </LegalBullet>
          <LegalBullet theme={theme}>
            External booking links: organizers may link to their own website,
            booking page, Instagram, direct message option, FareHarbor, Viator,
            or another third-party service. Those services have their own
            privacy policies and terms.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Optional profile choices, including community interests,
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
            Notification permission: optional device notifications may be used
            to send saved-event and going-event reminders, and to alert you
            about comments or replies on your posts. You can turn notifications
            off in your device settings.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Safety data: reports about fake events, scams, inappropriate
            content, misleading businesses, posts, replies, users, or business
            profiles; blocks; moderation notes; review status; and admin review
            actions are used to operate safety and moderation tools.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Event preferences: saved events, going status, interest signals,
            reminder preferences, reminder times, and local notification
            scheduling records on your device may be used to support event
            planning features.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Notification records: Summit Scene may store in-app notification
            records and device push tokens so users can see comments, replies,
            likes, and interest on their own posts.
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
            address lookup or geocoding, authentication including Sign in with
            Apple and Google Sign-In, analytics, email delivery if enabled,
            support, and app operations
            providers when those features are used.
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
            To provide accounts, profiles, events, tours, external booking
            links, community posts, maps, replies, saved events, attendance,
            reminders, optional notification alerts, and plan features.
          </LegalBullet>
          <LegalBullet theme={theme}>
            To help users discover events and tours through search, towns,
            dates, categories, category tags, vibe tags, saved choices, and
            going choices.
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
            Profiles, events, tours, photos, categories, tags, booking links,
            community posts, replies, business information, public business
            phone numbers, social links, attendance signals, and similar content
            may be visible to account users and to people browsing without an
            account. Do not post private information you do not want others to
            see.
          </LegalText>
          <LegalText theme={theme}>
            Optional profile choices, including community interests,
            social links, or LGBTQ+ related interests, may reveal personal or
            sensitive information. Only add details you are comfortable sharing
            with other users.
          </LegalText>
          <LegalText theme={theme}>
            Some event listings may be imported or curated by Summit Scene from
            public organizer/source webpages. Imported listings should retain
            the original source URL, use factual event details, and avoid copied
            full event descriptions or third-party event images unless
            permission is clear.
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
            location, notifications, and social profile links, should stay
            optional.
          </LegalText>
          <LegalText theme={theme}>
            Event reminder and post activity notifications are optional. Summit
            Scene may ask for notification permission when you enable reminders
            or notification alerts, and you can disable notifications through
            your device settings.
          </LegalText>
          <LegalText theme={theme}>
            If Summit Scene later sends marketing emails, newsletters, or
            promotional messages, it should collect clear opt-in consent and
            include sender identification plus an unsubscribe option. Account
            security, verification, and support messages can be handled
            separately from marketing.
          </LegalText>
          <LegalText theme={theme}>
            External booking pages, social media pages, and third-party booking
            providers have their own privacy policies, terms, payment rules, and
            cancellation rules. Review them before booking.
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
            Summit Scene has no tolerance for objectionable content or abusive
            users, including harassment, hate, threats, sexual exploitation,
            scams, spam, impersonation, or content that targets people based on
            identity or protected characteristics.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Users must not post official business, venue, or organizer content
            unless they are authorized to do so.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Official event and tour listings may link to external booking pages,
            websites, social pages, or direct message options. Any booking,
            payment, refund, cancellation, or customer service issue happens
            outside Summit Scene unless Summit Scene clearly says otherwise.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Imported or curated listings are provided for discovery and
            attribution. Users should confirm date, time, price, ticket
            availability, venue rules, and accessibility details directly with
            the organizer or original source before attending.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Summit Scene can remove content, restrict accounts, reject business
            verification, or report serious issues when needed for safety,
            compliance, or app integrity.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Summit Scene reviews objectionable content reports as quickly as
            possible and aims to act within 24 hours by removing violating
            content and restricting, suspending, or removing abusive users when
            warranted.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Summit Scene is an events and community discovery tool. It is not an
            emergency service, government service, municipal authority, Parks
            Canada authority, travel advisor, or permit/licensing advisor.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Summit Scene is a discovery platform and is not responsible for
            third-party tours, events, bookings, payments, cancellations,
            safety, quality, availability, refunds, or experiences. Users book
            and attend third-party offerings at their own discretion and should
            confirm details directly with the organizer.
          </LegalBullet>
        </LegalSection>

        <LegalSection title="Community Guidelines" theme={theme}>
          <LegalText theme={theme}>
            Summit Scene is for local events, plans, introductions, groups, job
            ads, community notices, and community discovery around Banff, Canmore,
            Lake Louise, and nearby areas.
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
          <LegalBullet theme={theme}>
            Reports are reviewed by Summit Scene moderation/admin tools and may
            result in content removal, account restrictions, account deletion,
            or other safety action.
          </LegalBullet>
          <LegalBullet theme={theme}>
            Blocking immediately hides the blocked user's content from your
            feed where supported and also creates a moderation signal for
            Summit Scene review.
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
            providers, tour guides, tour companies, event hosts, markets,
            wellness studios, community organizations, and other local operators
            who want to share official events, tours, or experiences.
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
            safety requirements that apply to their event, tour, booking link,
            or business activity.
          </LegalText>
          <LegalText theme={theme}>
            Third-party organizers, tour guides, tour companies, venues, and
            booking providers are responsible for their own tours, events,
            cancellations, refunds, safety practices, communications, and
            customer experiences.
          </LegalText>
          <LegalText theme={theme}>
            Summit Scene's event discovery tools should respect public access
            limits, robots.txt and crawling restrictions, authentication,
            CAPTCHAs, paywalls, and reasonable rate limits.
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
            Email Support
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
