import { LessonDummy } from "@/components/lesson/lesson-dummy";

type LessonViewProps = {
  params: Promise<{ lessonId: string }>;
};

export async function LessonView({ params }: LessonViewProps) {
  const { lessonId } = await params;
  return <LessonDummy lessonId={lessonId} />;
}
