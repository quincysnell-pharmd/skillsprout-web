import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { courseId, childId, parentId } = await req.json();

    if (!courseId || !childId || !parentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, price_cents, stripe_price_id, thumbnail_url")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data: child } = await supabase
      .from("child_profiles")
      .select("display_name")
      .eq("id", childId)
      .maybeSingle();

    const childName = child?.display_name ?? "your child";

    const { data: existing } = await supabase
      .from("enrollments")
      .select("id, paid")
      .eq("child_id", childId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing?.paid) {
      return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (course.stripe_price_id) {
      sessionParams = {
        mode: "payment",
        line_items: [{ price: course.stripe_price_id, quantity: 1 }],
        success_url: `${appUrl}/parent/dashboard?payment=success&course=${courseId}&child=${childId}`,
        cancel_url: `${appUrl}/parent/dashboard?payment=cancelled`,
        metadata: { courseId, childId, parentId },
      };
    } else {
      sessionParams = {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: course.price_cents ?? 999,
              product_data: {
                name: `${course.title} — for ${childName}`,
                description: `SkillSprout course access for ${childName}`,
                ...(course.thumbnail_url ? { images: [course.thumbnail_url] } : {}),
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/parent/dashboard?payment=success&course=${courseId}&child=${childId}`,
        cancel_url: `${appUrl}/parent/dashboard?payment=cancelled`,
        metadata: { courseId, childId, parentId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await supabase.from("enrollments").upsert(
      {
        child_id: childId,
        course_id: courseId,
        paid: false,
        stripe_session_id: session.id,
        enrolled_at: new Date().toISOString(),
        progress_pct: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "child_id,course_id" }
    );

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}