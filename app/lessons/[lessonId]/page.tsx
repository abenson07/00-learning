import { LessonShell } from "@/components/lesson/lesson-shell";

type PageProps = {
  params: Promise<{ lessonId: string }>;
};

export default async function LessonPage({ params }: PageProps) {
  const { lessonId } = await params;
  return <LessonShell lessonId={lessonId} />;
}
