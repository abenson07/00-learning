import { LessonShell } from "@/components/lesson/lesson-shell";

type LessonViewProps = {
  params: Promise<{ lessonId: string }>;
};

export async function LessonView({ params }: LessonViewProps) {
  const { lessonId } = await params;
  return <LessonShell lessonId={lessonId} />;
}
