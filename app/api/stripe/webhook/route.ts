import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      const { courseId, childId, parentId } = session.metadata ?? {};

      if (!courseId || !childId) {
        console.error("Missing metadata in Stripe session:", session.id);
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      // Mark enrollment as paid
      const { error } = await supabase
        .from("enrollments")
        .upsert(
          {
            child_id: childId,
            course_id: courseId,
            paid: true,
            stripe_session_id: session.id,
            enrolled_at: new Date().toISOString(),
            progress_pct: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "child_id,course_id" }
        );

      if (error) {
        console.error("Failed to update enrollment:", error);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }

      console.log(`✅ Enrollment marked paid: child=${childId} course=${courseId}`);
    }
  }

  return NextResponse.json({ received: true });
}