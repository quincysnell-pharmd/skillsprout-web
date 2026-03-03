import Link from "next/link";

function StatItem({ num, label }: { num: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-[30px] font-bold" style={{ color: "var(--gold)" }}>
        {num}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-white/80">{label}</div>
    </div>
  );
}

function FeatureCard({
  badge, badgeBg, badgeColor, icon, title, description, href,
}: {
  badge: string; badgeBg: string; badgeColor: string;
  icon: string; title: string; description: string; href: string;
}) {
  return (
    <Link href={href} className="ss-feature-card group">
      <span
        className="inline-block rounded-lg px-3 py-1 text-xs font-extrabold"
        style={{ background: badgeBg, color: badgeColor }}
      >
        {badge}
      </span>
      <div className="mt-4 text-[38px] leading-none">{icon}</div>
      <h3
        className="font-display mt-3 text-[21px] font-bold"
        style={{ color: "var(--green-dark)" }}
      >
        {title}
      </h3>
      <p
        className="mt-2 flex-1 text-[14px] font-semibold leading-relaxed"
        style={{ color: "#4b5563" }}
      >
        {description}
      </p>
      <span
        className="mt-4 block text-[14px] font-extrabold transition group-hover:underline"
        style={{ color: "var(--green)" }}
      >
        Open →
      </span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div>

      {/* ── HERO ── */}
      <section className="ss-hero">
        <div
          className="pointer-events-none absolute"
          style={{
            top: -80, right: -80, width: 360, height: 360,
            background: "radial-gradient(circle, rgba(61,191,112,.15) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div className="relative mx-auto flex max-w-[1200px] items-center gap-[60px]">
          {/* Left: text */}
          <div className="flex-1">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-extrabold"
              style={{ background: "var(--gold-light)", color: "var(--gold-dark)" }}
            >
              🌟 Daily Challenges Live Now!
            </span>

            <h1
              className="font-display mt-5 leading-[1.1]"
              style={{ fontSize: 52, color: "var(--green-dark)", marginBottom: 18 }}
            >
              Grow Your{" "}
              <span style={{ color: "var(--green-mid)" }}>Skills</span>,
              <br />Shape Your Future
            </h1>

            <p
              className="font-semibold"
              style={{
                fontSize: 17, color: "#4b5563",
                marginBottom: 28, maxWidth: 460, lineHeight: 1.6,
              }}
            >
              SkillSprout is built for curious kids ages 6–17. Learn cooking,
              coding, gardening, investing, and so much more — one fun project
              at a time.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/auth"    className="ss-btn-primary">Start for Free 🌱</Link>
              <Link href="/explore" className="ss-btn-secondary">Explore Interests</Link>
            </div>
          </div>

          {/* Right: mascot */}
          <div className="hidden flex-shrink-0 md:block">
            <div
              className="ss-float relative flex items-center justify-center"
              style={{
                width: 260, height: 260, fontSize: 110,
                background: "linear-gradient(145deg, var(--green-light), #b8f0cc)",
                borderRadius: "50%",
                boxShadow: "0 20px 60px rgba(45,155,90,.25)",
              }}
            >
              🌱
              <span
                className="absolute -left-10 top-6 rounded-xl bg-white px-3 py-2 text-sm font-bold shadow-md"
                style={{ color: "var(--green-dark)" }}
              >🍳 Cooking</span>
              <span
                className="absolute -right-14 bottom-10 rounded-xl bg-white px-3 py-2 text-sm font-bold shadow-md"
                style={{ color: "var(--gold-dark)" }}
              >💰 Investing</span>
              <span
                className="absolute -left-10 bottom-6 rounded-xl bg-white px-3 py-2 text-sm font-bold shadow-md"
                style={{ color: "#dc2626" }}
              >💻 Coding</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="ss-stats-bar">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-around gap-6">
          <StatItem num="50+" label="Skills to Explore" />
          <StatItem num="4"   label="Skill Levels" />
          <StatItem num="365" label="Daily Challenges / Year" />
          <StatItem num="🛡️"  label="100% Kid-Safe" />
        </div>
      </section>

      {/* ── SECTION ── */}
      <div className="ss-section">

        {/* ── CHALLENGE BANNER ── */}
        <div className="ss-challenge-banner mb-10">
          <span className="flex-shrink-0 text-[56px]">⚡</span>
          <div className="flex-1">
            <h2
              className="font-display font-bold"
              style={{ fontSize: 26, marginBottom: 6 }}
            >
              Today's Daily Challenge
            </h2>
            <p
              className="font-semibold"
              style={{ fontSize: 14, opacity: 0.85, marginBottom: 14, lineHeight: 1.6 }}
            >
              🌿 <strong>Herb Science:</strong> Plant one herb seed, label it, and
              write one sentence about what it needs to grow. Post your photo to
              your showcase!
            </p>
            <Link href="/explore" className="ss-btn-gold">
              Accept Challenge →
            </Link>
          </div>
          <div className="flex-shrink-0 text-center">
            <div
              className="font-display font-bold"
              style={{ fontSize: 40, color: "var(--gold)" }}
            >
              🔥 12
            </div>
            <div className="text-[13px] font-semibold opacity-80">day streak!</div>
          </div>
        </div>

        {/* ── FEATURE HEADING ── */}
        <h2
          className="font-display font-bold"
          style={{ fontSize: 34, color: "var(--green-dark)", marginBottom: 6 }}
        >
          Everything you need to grow 🌿
        </h2>
        <p
          className="font-semibold"
          style={{ fontSize: 16, color: "#4b5563", marginBottom: 36 }}
        >
          From first lessons to career discovery — all in one safe place.
        </p>

        {/* ── FEATURE GRID ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 22,
          }}
        >
          <FeatureCard badge="Fun"     badgeBg="#dcfce7" badgeColor="#15803d" icon="🔍" title="Explore"      description="Curiosity hooks, mini challenges, and discovery. Find what lights you up and try things you've never tried before!" href="/explore" />
          <FeatureCard badge="Learn"   badgeBg="#fef3c7" badgeColor="#d97706" icon="📚" title="Courses"      description="Project-based learning from Seedling to Harvest. Each course ends with something real you made or did!" href="/courses" />
          <FeatureCard badge="Discover"badgeBg="#e0f2fe" badgeColor="#0369a1" icon="🚀" title="Careers"      description="See what real people do every day — the cool parts AND the hard parts. Save careers you love to your profile!" href="/careers" />
          <FeatureCard badge="Achieve" badgeBg="#fce7f3" badgeColor="#be185d" icon="🏆" title="Kid Profile"  description="Choose your username and avatar, earn badges, track streaks, and show off what you've learned!" href="/profile" />
          <FeatureCard badge="Monitor" badgeBg="#ede9fe" badgeColor="#7c3aed" icon="👨‍👩‍👧" title="Parent View" description="See what your child is learning, approve their showcase posts, and purchase courses — all in one place." href="/profile" />
          <FeatureCard badge="Safe"    badgeBg="#dcfce7" badgeColor="#15803d" icon="🛡️" title="Safety First" description="Predefined messages, parent approvals, no public profiles. Safety isn't a feature — it's our foundation." href="/safety" />
        </div>

        {/* ── BOTTOM CTA ── */}
        <div
          className="mt-14 rounded-[32px] text-center"
          style={{
            background: "linear-gradient(135deg, #e8f8ee 0%, #fff9e6 100%)",
            border: "2px solid var(--green-light)",
            padding: "52px 32px",
          }}
        >
          <div className="text-[52px]">🌱</div>
          <h2
            className="font-display mt-4 font-bold"
            style={{ fontSize: 34, color: "var(--green-dark)" }}
          >
            Ready to start growing?
          </h2>
          <p
            className="mx-auto mt-3 font-semibold"
            style={{ fontSize: 16, color: "#4b5563", maxWidth: 440, lineHeight: 1.6 }}
          >
            Join thousands of curious kids already building real skills on
            SkillSprout. Free to start, safe by design.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/auth"  className="ss-btn-primary">Create Free Account 🌱</Link>
            <Link href="/about" className="ss-btn-secondary">Our Story</Link>
          </div>
        </div>

      </div>
    </div>
  );
}