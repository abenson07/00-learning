import Link from "next/link";
import { notFound } from "next/navigation";

import { getLessonPlanVersionMeta } from "@/lib/lesson-data";

import LessonPlanExperience from "./lesson-plan-experience";

export const dynamic = "force-dynamic";

export default async function LessonPlanVersionPage({
  params,
}: {
  params: Promise<{ lessonPlanVersionId: string }>;
}) {
  const { lessonPlanVersionId } = await params;
  const meta = await getLessonPlanVersionMeta(lessonPlanVersionId);

  if (!meta) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <LessonPlanExperience
        lessonPlanVersionId={lessonPlanVersionId}
        planTitle={meta.title}
        domainName={meta.domainName}
        description={meta.description}
      />
      <p className="text-muted-foreground text-center text-xs">
        <Link href="/lessons" className="hover:text-foreground">
          ← All lesson plans
        </Link>
      </p>
    </div>
  );
}
