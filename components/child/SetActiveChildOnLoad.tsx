"use client";

import { useEffect } from "react";
import { setActiveChildId } from "@/app/lib/activeChild";

export default function SetActiveChildOnLoad({ childId }: { childId: string }) {
  useEffect(() => {
    setActiveChildId(childId);
  }, [childId]);

  return null;
}