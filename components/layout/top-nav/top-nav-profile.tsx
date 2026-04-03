import Link from "next/link";

import { cn } from "@/lib/utils";

export function TopNavProfile({
  href = "/protected",
  name = "Learner",
  imageUrl,
  className,
}: {
  href?: string;
  name?: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href={href}
      className={cn(
        "block shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={`Profile: ${name}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user avatars from arbitrary URLs
        <img
          src={imageUrl}
          alt=""
          className="size-10 rounded-full object-cover"
          width={40}
          height={40}
        />
      ) : (
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-full text-sm font-semibold",
            "bg-gradient-to-br from-zinc-300 to-zinc-400 text-zinc-800",
            "dark:from-zinc-600 dark:to-zinc-700 dark:text-white",
          )}
        >
          {initial}
        </span>
      )}
    </Link>
  );
}
