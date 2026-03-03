import Link from "next/link";

const SAFETY_FEATURES = [
  {
    icon: "✅",
    title: "Parent-Approved Posts",
    color: "var(--green-dark)",
    bg: "var(--green-bg)",
    border: "var(--green-light)",
    body: "Before anything a child creates shows up publicly on their Showcase, a parent must review and approve it. Kids can't accidentally share something they didn't mean to — every post goes through you first.",
    badge: "Showcase",
    badgeBg: "#dcfce7",
    badgeColor: "#15803d",
  },
  {
    icon: "💬",
    title: "Predefined Messages Only",
    color: "#1e40af",
    bg: "#eff6ff",
    border: "#bfdbfe",
    body: "Kids can only send pre-approved, positive messages to friends on SkillSprout — things like \"You're on a streak! Keep it up!\" or \"Amazing work on your course!\" No free-text messaging. No way to share personal information.",
    badge: "Friends",
    badgeBg: "#dbeafe",
    badgeColor: "#1e40af",
  },
  {
    icon: "🤝",
    title: "Parent-Approved Friend Requests",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    body: "Children cannot connect with other kids on SkillSprout without a parent explicitly approving the friendship first. Every friend request goes through the parent dashboard before any connection is made.",
    badge: "Friends",
    badgeBg: "#ede9fe",
    badgeColor: "#7c3aed",
  },
  {
    icon: "🔒",
    title: "No Public Profiles",
    color: "#be185d",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    body: "Child profiles are completely private by default. No strangers can search for, view, or contact your child. The only people who can see a child's profile are their parent and approved friends.",
    badge: "Privacy",
    badgeBg: "#fce7f3",
    badgeColor: "#be185d",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Parent-Owned Accounts",
    color: "var(--gold-dark)",
    bg: "var(--gold-light)",
    border: "#fde68a",
    body: "All child profiles are created and managed under a parent account. Parents control what courses are purchased, which friends are approved, and what gets shared. Kids can't create standalone accounts.",
    badge: "Account",
    badgeBg: "var(--gold-light)",
    badgeColor: "var(--gold-dark)",
  },
  {
    icon: "🧒",
    title: "Age-Appropriate Everything",
    color: "#0369a1",
    bg: "#f0f9ff",
    border: "#bae6fd",
    body: "Every course, career profile, challenge, and piece of content on SkillSprout is written specifically for kids ages 6–17. Honest, age-appropriate, and focused on what genuinely helps them learn and grow.",
    badge: "Content",
    badgeBg: "#e0f2fe",
    badgeColor: "#0369a1",
  },
  {
    icon: "📋",
    title: "No Ads. Ever.",
    color: "#dc2626",
    bg: "#fff1f2",
    border: "#fecdd3",
    body: "SkillSprout is funded by course purchases — not advertising. Your child will never see a targeted ad, a sponsored post, or anything designed to manipulate their attention or decisions.",
    badge: "Trust",
    badgeBg: "#fee2e2",
    badgeColor: "#dc2626",
  },
  {
    icon: "📊",
    title: "Parent Visibility Dashboard",
    color: "#047857",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    body: "Parents can see exactly what their child is learning, which courses they're enrolled in, what badges they've earned, and what posts they've submitted — all from a single dashboard.",
    badge: "Dashboard",
    badgeBg: "#d1fae5",
    badgeColor: "#047857",
  },
];

export default function SafetyPage() {
  return (
    <div>

      {/* ── HERO ── */}
      <section className="ss-hero">
        <div
          className="pointer-events-none absolute"
          style={{
            top: -80, right: -80, width: 340, height: 340,
            background: "radial-gradient(circle, rgba(61,191,112,.15) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div className="relative mx-auto max-w-[1200px] text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-extrabold"
            style={{ background: "#eff6ff", color: "#1e40af" }}
          >
            🛡️ Safety & Privacy
          </span>
          <h1
            className="font-display mx-auto mt-5 max-w-3xl leading-[1.1]"
            style={{ fontSize: 48, color: "var(--green-dark)" }}
          >
            Safety Isn't a Feature.
            <br />
            <span style={{ color: "var(--green-mid)" }}>It's Our Foundation.</span>
          </h1>
          <p
            className="mx-auto mt-5 font-semibold"
            style={{ fontSize: 17, color: "#4b5563", maxWidth: 540, lineHeight: 1.7 }}
          >
            Every single thing on SkillSprout was designed with your child's
            safety and your peace of mind at the center. Here's exactly how we
            keep kids safe.
          </p>
        </div>
      </section>

      <div className="ss-section space-y-14">

        {/* ── QUICK SUMMARY ── */}
        <section
          className="rounded-[32px] p-8 md:p-10"
          style={{
            background: "linear-gradient(135deg, var(--green-dark), #1a4d2e)",
            color: "#fff",
          }}
        >
          <h2
            className="font-display mb-6 text-center font-bold"
            style={{ fontSize: 26 }}
          >
            The short version for busy parents
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "✅", label: "Every post parent-approved" },
              { icon: "💬", label: "No free-text messaging" },
              { icon: "🔒", label: "No public child profiles" },
              { icon: "📋", label: "Zero ads, ever" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl px-5 py-4"
                style={{ background: "rgba(255,255,255,.10)" }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[14px] font-bold">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURE GRID ── */}
        <section>
          <h2
            className="font-display mb-2 font-bold"
            style={{ fontSize: 34, color: "var(--green-dark)" }}
          >
            Every safety feature, explained 🛡️
          </h2>
          <p
            className="mb-8 font-semibold"
            style={{ fontSize: 16, color: "#4b5563" }}
          >
            No vague promises — here's exactly what we do and why.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 22,
            }}
          >
            {SAFETY_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-[24px] p-7 transition"
                style={{
                  background: f.bg,
                  border: `2px solid ${f.border}`,
                }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[32px]">{f.icon}</span>
                  <span
                    className="rounded-lg px-2.5 py-1 text-xs font-extrabold"
                    style={{ background: f.badgeBg, color: f.badgeColor }}
                  >
                    {f.badge}
                  </span>
                </div>
                <h3
                  className="font-display mb-3 mt-2 font-bold"
                  style={{ fontSize: 18, color: f.color }}
                >
                  {f.title}
                </h3>
                <p
                  className="font-semibold leading-relaxed"
                  style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.7 }}
                >
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PARENT PROMISE ── */}
        <section
          className="rounded-[32px] p-10 md:p-14"
          style={{
            background: "linear-gradient(135deg, #e8f8ee 0%, #fff9e6 100%)",
            border: "2px solid var(--green-light)",
          }}
        >
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[52px]">🤝</div>
            <h2
              className="font-display mt-4 font-bold"
              style={{ fontSize: 30, color: "var(--green-dark)" }}
            >
              Our Promise to Parents
            </h2>
            <p
              className="mx-auto mt-4 font-semibold leading-relaxed"
              style={{ fontSize: 16, color: "#374151", maxWidth: 540, lineHeight: 1.8 }}
            >
              "SkillSprout was built by a parent. We know what it feels like to hand
              your child a device and wonder what they're seeing. That feeling is
              exactly why every safety feature here was designed from the ground up —
              not bolted on later.
            </p>
            <p
              className="mx-auto mt-4 font-semibold leading-relaxed"
              style={{ fontSize: 16, color: "#374151", maxWidth: 540, lineHeight: 1.8 }}
            >
              Your child's safety will always come first. We will never sacrifice it
              for engagement, growth, or revenue. That's our promise — and it's
              non-negotiable."
            </p>
            <div
              className="mt-6 border-t pt-5 text-[14px] font-bold"
              style={{ borderColor: "var(--green-light)", color: "var(--green)" }}
            >
              — Founder, SkillSprout
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <h2
            className="font-display mb-8 font-bold"
            style={{ fontSize: 34, color: "var(--green-dark)" }}
          >
            Parent questions, answered 💬
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Can my child create an account without me?",
                a: "No. All child profiles must be created through a parent account. Kids cannot sign up independently.",
              },
              {
                q: "Who can see my child's profile and posts?",
                a: "No one except you and friends you've approved. Profiles are completely private. Showcase posts only become visible after you approve them.",
              },
              {
                q: "Can my child message strangers?",
                a: "No. Kids can only message pre-approved friends, and only using our list of pre-approved positive messages. There is no free-text messaging at all.",
              },
              {
                q: "What data do you collect about my child?",
                a: "We collect only what's needed to run the platform — display name, birth year (optional), course progress, and badges. We never sell data to third parties.",
              },
              {
                q: "Can I delete my child's account and data?",
                a: "Yes, at any time. From your parent dashboard you can delete any child profile and all associated data permanently.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="rounded-[20px] p-6"
                style={{
                  background: "#fff",
                  border: "2px solid var(--green-light)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3
                  className="font-display font-bold"
                  style={{ fontSize: 16, color: "var(--green-dark)", marginBottom: 8 }}
                >
                  {faq.q}
                </h3>
                <p
                  className="font-semibold leading-relaxed"
                  style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-[32px] p-10 text-center"
          style={{
            background: "linear-gradient(135deg, var(--green-dark), #1a4d2e)",
            color: "#fff",
          }}
        >
          <div className="text-[52px]">🛡️</div>
          <h2
            className="font-display mt-4 font-bold"
            style={{ fontSize: 32 }}
          >
            Safe learning starts here.
          </h2>
          <p
            className="mx-auto mt-3 font-semibold opacity-80"
            style={{ fontSize: 16, maxWidth: 420, lineHeight: 1.7 }}
          >
            Join families who've found a place where their kids can grow —
            and parents can breathe easy.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/auth"  className="ss-btn-gold">Create Parent Account 🌱</Link>
            <Link href="/about" className="ss-btn-secondary">Our Story</Link>
          </div>
        </section>

      </div>
    </div>
  );
}