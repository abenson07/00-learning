import { NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type DomainRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type CategoryRow = {
  id: string;
  domain_id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type TopicRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const [
      { data: domains, error: domainError },
      { data: categories, error: categoryError },
      { data: topics, error: topicError },
    ] = await Promise.all([
      supabase
        .from("domain")
        .select("id,name,slug,sort_order")
        .order("sort_order"),
      supabase
        .from("category")
        .select("id,domain_id,name,slug,sort_order")
        .order("sort_order"),
      supabase
        .from("topic")
        .select("id,category_id,name,slug,sort_order")
        .order("sort_order"),
    ]);

    const bootError = domainError ?? categoryError ?? topicError;
    if (bootError) {
      return NextResponse.json(
        { ok: false, error: bootError.message },
        { status: 502 },
      );
    }

    const taxonomy = (domains ?? []).map((d: DomainRow) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      sort_order: d.sort_order,
      categories: (categories ?? [])
        .filter((c: CategoryRow) => c.domain_id === d.id)
        .map((c: CategoryRow) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          sort_order: c.sort_order,
          topics: (topics ?? []).filter(
            (t: TopicRow) => t.category_id === c.id,
          ),
        })),
    }));

    const { data: topicRow, error: topicLookupError } = await supabase
      .from("topic")
      .select("id,slug")
      .eq("slug", "postgres_basics")
      .maybeSingle();

    if (topicLookupError) {
      return NextResponse.json(
        { ok: false, error: topicLookupError.message },
        { status: 502 },
      );
    }

    let libraryForTopic: unknown = null;
    if (topicRow) {
      const { data: items, error: libraryError } = await supabase
        .from("content_item")
        .select(
          "id,title,slug,content_type,sort_order,current_version_id",
        )
        .eq("topic_id", topicRow.id)
        .order("sort_order");

      if (libraryError) {
        return NextResponse.json(
          { ok: false, error: libraryError.message },
          { status: 502 },
        );
      }
      libraryForTopic = { topic_slug: topicRow.slug, items };
    }

    const { data: activeVersion, error: lpvError } = await supabase
      .from("lesson_plan_version")
      .select(
        `
        id,
        version_number,
        lesson_plan:lesson_plan_id ( id, title )
      `,
      )
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (lpvError) {
      return NextResponse.json(
        { ok: false, error: lpvError.message },
        { status: 502 },
      );
    }

    let lessonPlanOrder: unknown = null;
    if (activeVersion) {
      const { data: planItems, error: itemsError } = await supabase
        .from("lesson_plan_item")
        .select(
          `
          sequence,
          requires_quiz,
          effective_content_version_id,
          content_item:content_item_id ( id, title, slug ),
          content_version:effective_content_version_id ( version_number )
        `,
        )
        .eq("lesson_plan_version_id", activeVersion.id)
        .order("sequence", { ascending: true });

      if (itemsError) {
        return NextResponse.json(
          { ok: false, error: itemsError.message },
          { status: 502 },
        );
      }
      lessonPlanOrder = {
        lesson_plan_version_id: activeVersion.id,
        plan: activeVersion.lesson_plan,
        items: planItems,
      };
    }

    return NextResponse.json({
      ok: true,
      taxonomy,
      libraryForTopic,
      lessonPlanOrder,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
