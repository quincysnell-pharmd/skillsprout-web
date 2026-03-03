"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveChildId } from "../../lib/activeChild";

export default function ProfileLink({
  className,
  children,
  fallbackHref = "/profile",
}: {
  className?: string;
  children?: React.ReactNode;
  fallbackHref?: string;
}) {
  const [href, setHref] = useState(fallbackHref);

  useEffect(() => {
    const id = getActiveChildId();
    setHref(id ? `/dashboard/child/${id}` : fallbackHref);
  }, [fallbackHref]);

  return (
    <Link href={href} className={className}>
      {children ?? "Profile"}
    </Link>
  );
}
