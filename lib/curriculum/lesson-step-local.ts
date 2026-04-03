import type { CurriculumLesson } from "@/lib/curriculum/lesson-plan-data";

/** Must match keys used in the browser for unsigned progress. */
export function stepCompleteStorageKey(lessonId: string, stepNumber: number): string {
  return `lesson-plan:step-complete:${lessonId}:${stepNumber}`;
}

/** Stable id for server rows and client props: `lessonId:stepNumber`. */
export function completedStepKey(lessonId: string, stepNumber: number): string {
  return `${lessonId}:${stepNumber}`;
}

export const LESSON_STEP_LOCAL_CHANGED_EVENT = "lesson-plan:step-local-changed";

export function dispatchLessonStepLocalChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LESSON_STEP_LOCAL_CHANGED_EVENT));
}

export function readStepCompleteFromStorage(lessonId: string, stepNumber: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(stepCompleteStorageKey(lessonId, stepNumber)) === "1";
  } catch {
    return false;
  }
}

export function countLocalCompletedSteps(lessons: CurriculumLesson[]): number {
  if (typeof window === "undefined") return 0;
  let n = 0;
  try {
    for (const lesson of lessons) {
      for (const step of lesson.steps) {
        if (window.localStorage.getItem(stepCompleteStorageKey(lesson.id, step.number)) === "1") {
          n += 1;
        }
      }
    }
  } catch {
    return 0;
  }
  return n;
}

export function writeStepCompleteToStorage(
  lessonId: string,
  stepNumber: number,
  complete: boolean,
): void {
  if (typeof window === "undefined") return;
  try {
    const key = stepCompleteStorageKey(lessonId, stepNumber);
    if (complete) {
      window.localStorage.setItem(key, "1");
    } else {
      window.localStorage.removeItem(key);
    }
    dispatchLessonStepLocalChanged();
  } catch {
    // ignore
  }
}
