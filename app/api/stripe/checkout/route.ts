export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // Step 1: Check env vars
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (!stripeKey) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY - all env keys: " + Object.keys(process.env).filter(k => k.includes("STRIPE") || k.includes("SUPA")).join(", ") }, { status: 500 });
    if (!supabaseUrl) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    if (!serviceKey) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

    // Step 2: Parse body
    const body = await req.json();
    const { courseId, childId, parentId } = body;
    if (!courseId || !childId || !parentId) {
      return NextResponse.json({ error: `Missing fields: courseId=${courseId} childId=${childId} parentId=${parentId}` }, { status: 400 });
    }

    // Step 3: Init clients
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    const supabase = createClient(supabaseUrl, serviceKey);

    // Step 4: Fetch course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, price_cents, stripe_price_id")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError) return NextResponse.json({ error: `Course DB error: ${courseError.message}` }, { status: 500 });
    if (!course) return NextResponse.json({ error: `Course not found: ${courseId}` }, { status: 404 });

    // Step 5: Check existing enrollment
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id, paid")
      .eq("child_id", childId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing?.paid) {
      return NextResponse.json({ error: "Already enrolled and paid" }, { status: 409 });
    }

    // Step 6: Get child name
    const { data: child } = await supabase
      .from("child_profiles")
      .select("display_name")
      .eq("id", childId)
      .maybeSingle();
    const childName = child?.display_name ?? "your child";

    // Step 7: Create Stripe session
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (course.stripe_price_id) {
      sessionParams = {
        mode: "payment",
        line_items: [{ price: course.stripe_price_id, quantity: 1 }],
        success_url: `${appUrl}/dashboard/parent?payment=success&course=${courseId}&child=${childId}`,
        cancel_url: `${appUrl}/courses/${courseId}?payment=cancelled`,
        metadata: { courseId, childId, parentId },
      };
    } else {
      sessionParams = {
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: course.price_cents ?? 999,
            product_data: {
              name: `${course.title} — for ${childName}`,
              description: `SkillSprout course access for ${childName}`,
            },
          },
          quantity: 1,
        }],
        success_url: `${appUrl}/dashboard/parent?payment=success&course=${courseId}&child=${childId}`,
        cancel_url: `${appUrl}/courses/${courseId}?payment=cancelled`,
        metadata: { courseId, childId, parentId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Step 8: Upsert enrollment
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}