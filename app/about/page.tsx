import Link from "next/link";

const MISSION_CARDS = [
  {
    icon: "💡",
    title: "Why SkillSprout Exists",
    body: "Kids today are often given a path and told to follow it. But what if the best path is the one they choose themselves? SkillSprout was born from the simple belief that every child deserves the space to explore what makes them come alive. Not for a grade, but for themselves.",
  },
  {
    icon: "🏆",
    title: "What We Believe",
    body: "Kids are so much smarter than we give them credit for. When given the ability to govern their own learning, move at their own pace, and pursue what genuinely excites them they don't just learn, they thrive.",
  },
  {
    icon: "🌳",
    title: "Skills that Last",
    body: "Each course prepares the students to create a new concept, project or product. We believe that consistant opportunities to actually work on new skills is required to really understand a new concept and increase confidence.",
  },
  {
    icon: "🛡️",
    title: "Safety Is Everything",
    body: "Every single feature on SkillSprout is designed with child safety at the center. Parent approvals, predefined messaging, private profiles and more. Your child's safety is never an afterthought, it's the foundation we are built on.",
  },
  {
    icon: "🌍",
    title: "Our Mission",
    body: "We are here to give every child the opportunity to discover their passions, develop real-world skills, and build the confidence to pursue a future that's truly theirs. Allowing them to discover more than what the world expects of them.",
  },
];

export default function AboutPage() {
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
            style={{ background: "var(--gold-light)", color: "var(--gold-dark)" }}
          >
            🌱 Our Story
          </span>
          <h1
            className="font-display mx-auto mt-5 max-w-3xl leading-[1.1]"
            style={{ fontSize: 48, color: "var(--green-dark)" }}
          >
            A Place Where Kids Get to{" "}
            <span style={{ color: "var(--green-mid)" }}>Actually Choose</span>
          </h1>
          <p
            className="mx-auto mt-5 font-semibold"
            style={{
              fontSize: 17, color: "#4b5563",
              maxWidth: 560, lineHeight: 1.7,
            }}
          >
            A safe place where curious kids discover who they are, what they love,
            and where they want to grow. All on their own terms.
          </p>
        </div>
      </section>

      <div className="ss-section space-y-16">

        {/* ── MISSION CARDS ── */}
        <section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 22,
            }}
          >
            {MISSION_CARDS.map((card) => (
              <div key={card.title} className="ss-card">
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: "var(--green-bg)", border: "2px solid var(--green-light)" }}
                >
                  {card.icon}
                </div>
                <h3
                  className="font-display font-bold"
                  style={{ fontSize: 19, color: "var(--green-dark)", marginBottom: 10 }}
                >
                  {card.title}
                </h3>
                <p
                  className="font-semibold leading-relaxed"
                  style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOUNDER STORY ── */}
        <section>
          <div
            className="rounded-[32px] p-10 md:p-14"
            style={{
              background: "linear-gradient(135deg, #e8f8ee 0%, #fff9e6 100%)",
              border: "2px solid var(--green-light)",
            }}
          >
            <div className="mx-auto max-w-3xl">
              <div className="mb-8 text-center text-[64px]">👩‍👧</div>

              <h2
                className="font-display mb-6 text-center font-bold"
                style={{ fontSize: 30, color: "var(--green-dark)" }}
              >
                A Note From Our Founder
              </h2>

              <div
                className="space-y-5 font-semibold leading-relaxed"
                style={{ fontSize: 16, color: "#374151", lineHeight: 1.8 }}
              >
                <p>
                  "Being a mom changed everything for me. I want more than anything for my children to have the chance to discover what brings them joy
                  and to discover the things they genuinely love. Not because the world told them to care
                  about it, but because it's the things that <em>they</em> actually care about. That's something I want every
                  kid to experience and I think that every child deserves.
                </p>

                <p>
                  I kept asking myself: Why don't kids have a place to just <em>try things</em>?
                  Not for a grade. Not to check a box. Just to see what they're drawn to, to
                  build something that they have dreamed of, and to figure out who they are before the world
                  tries to decide for them.
                </p>

                <p>
                  I believe kids have so much more going on inside them than we give them credit
                  for. They're curious, they're capable, and when you give them real autonomy,
                  the ability to govern their own learning, to pursue what brings them joy I believe they
                  will surprise you every single time.
                </p>

                <p>
                  SkillSprout isn't about keeping kids busy. It's about helping them find the
                  things that make them feel most alive. The cooking, the coding, the gardening,
                  the investing and so much more. Each of these experiences are doors. What's behind each door is a kid
                  discovering something real about themselves.
                </p>

                <p>
                  Skillsprout emphasizes the importance of community. Here we offer safe, parent and administrator approved, opportunities
                  for children to share the skills that they are learning. Through sharing reflections, projects and other course outcomes. 
                  We understand the importance of sharing ideas and experiences in the endeavor of learning more, developing new skills and 
                  continually working to improve the world.
                </p>

                <p>
                  I built this for my kids. And I built it for yours. Welcome to the place where
                  skills, and kids, get to grow. 🌱"
                </p>
              </div>

              <div
                className="mt-8 border-t pt-6 text-center text-[14px] font-bold"
                style={{ borderColor: "var(--green-light)", color: "var(--green)" }}
              >
                — Founder, SkillSprout
              </div>
            </div>
          </div>
        </section>

        {/* ── VALUES ROW ── */}
        <section>
          <h2
            className="font-display mb-2 font-bold"
            style={{ fontSize: 34, color: "var(--green-dark)" }}
          >
            What we stand for 🌿
          </h2>
          <p
            className="mb-8 font-semibold"
            style={{ fontSize: 16, color: "#4b5563" }}
          >
            Three things we will never compromise on.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                emoji: "🧒",
                title: "Kid Autonomy",
                color: "var(--green-dark)",
                bg: "var(--green-bg)",
                border: "var(--green-light)",
                body: "Kids should govern their own learning. No grades and no pressure. Just the freedom to explore what excites them and build skills that actually matter to them.",
              },
              {
                emoji: "❤️",
                title: "Joy First",
                color: "var(--gold-dark)",
                bg: "var(--gold-light)",
                border: "#fde68a",
                body: "If it doesn't bring joy, it won't last. Every course, challenge, and career exploration is designed to feel fun while allowing students to create true products with the skills they are learning. Because passion is the only motivation that sticks.",
              },
              {
                emoji: "🛡️",
                title: "Safety Always",
                color: "#1e40af",
                bg: "#eff6ff",
                border: "#bfdbfe",
                body: "Parents are partners, not spectators. Every feature is built with families in mind. From post approvals to predefined messaging to private profiles.",
              },
            ].map((v) => (
              <div
                key={v.title}
                className="rounded-[24px] p-7"
                style={{
                  background: v.bg,
                  border: `2px solid ${v.border}`,
                }}
              >
                <div className="mb-3 text-[40px]">{v.emoji}</div>
                <h3
                  className="font-display mb-3 font-bold"
                  style={{ fontSize: 20, color: v.color }}
                >
                  {v.title}
                </h3>
                <p
                  className="font-semibold leading-relaxed"
                  style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}
                >
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="rounded-[32px] p-10 text-center"
          style={{
            background: "linear-gradient(135deg, var(--green-dark), #1a4d2e)",
            color: "#fff",
          }}
        >
          <div className="text-[52px]">🌱</div>
          <h2
            className="font-display mt-4 font-bold"
            style={{ fontSize: 32 }}
          >
            Ready to find what lights your kid up?
          </h2>
          <p
            className="mx-auto mt-3 font-semibold opacity-80"
            style={{ fontSize: 16, maxWidth: 440, lineHeight: 1.7 }}
          >
            Free to start. Safe by design. Built by a mom who just wanted
            better for her kid.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/auth"    className="ss-btn-gold">Get Started Free 🌱</Link>
            <Link href="/explore" className="ss-btn-secondary">Explore First</Link>
          </div>
        </section>

      </div>
    </div>
  );
}