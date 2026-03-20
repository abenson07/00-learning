import { createSupabaseAnonServerClient } from "@/lib/supabase/server";

export type DomainRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type CategoryRow = {
  id: string;
  domain_id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type TopicRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type ContentItemListRow = {
  id: string;
  title: string;
  slug: string;
  content_type: string;
  sort_order: number;
};

export type LibraryBreadcrumb = {
  domain: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  topic: { id: string; name: string; slug: string };
};

export type ContentItemDetails = {
  id: string;
  title: string;
  slug: string;
  plain_text: string;
  content_rich_json: unknown;
  version: {
    id: string;
    version_number: number;
    is_latest: boolean;
  };
  breadcrumb: LibraryBreadcrumb;
};

export async function listDomains(): Promise<DomainRow[]> {
  const supabase = createSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("domain")
    .select("id,name,slug,sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listCategoriesByDomain(
  domainId: string,
): Promise<CategoryRow[]> {
  const supabase = createSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("category")
    .select("id,domain_id,name,slug,sort_order")
    .eq("domain_id", domainId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listTopicsByCategory(
  categoryId: string,
): Promise<TopicRow[]> {
  const supabase = createSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("topic")
    .select("id,category_id,name,slug,sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listContentItemsByTopic(
  topicId: string,
): Promise<ContentItemListRow[]> {
  const supabase = createSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("content_item")
    .select("id,title,slug,content_type,sort_order")
    .eq("topic_id", topicId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getContentItemDetails(
  contentItemId: string,
): Promise<ContentItemDetails | null> {
  const supabase = createSupabaseAnonServerClient();

  const { data: item, error: itemError } = await supabase
    .from("content_item")
    .select("id,title,slug,topic_id,current_version_id")
    .eq("id", contentItemId)
    .maybeSingle();

  if (itemError) {
    throw new Error(itemError.message);
  }
  if (!item) {
    return null;
  }

  const versionId = item.current_version_id;
  if (!versionId) {
    return null;
  }

  const [
    { data: version, error: versionError },
    { data: topic, error: topicError },
  ] = await Promise.all([
    supabase
      .from("content_version")
      .select("id,version_number,is_latest,content_rich_json,plain_text")
      .eq("id", versionId)
      .maybeSingle(),
    supabase
      .from("topic")
      .select("id,name,slug,category_id")
      .eq("id", item.topic_id)
      .maybeSingle(),
  ]);

  if (versionError) {
    throw new Error(versionError.message);
  }
  if (topicError) {
    throw new Error(topicError.message);
  }
  if (!version || !topic) {
    return null;
  }

  const { data: category, error: categoryError } = await supabase
    .from("category")
    .select("id,name,slug,domain_id")
    .eq("id", topic.category_id)
    .maybeSingle();

  if (categoryError) {
    throw new Error(categoryError.message);
  }
  if (!category) {
    return null;
  }

  const { data: domain, error: domainError } = await supabase
    .from("domain")
    .select("id,name,slug")
    .eq("id", category.domain_id)
    .maybeSingle();

  if (domainError) {
    throw new Error(domainError.message);
  }
  if (!domain) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    plain_text: version.plain_text,
    content_rich_json: version.content_rich_json,
    version: {
      id: version.id,
      version_number: version.version_number,
      is_latest: version.is_latest,
    },
    breadcrumb: {
      domain: { id: domain.id, name: domain.name, slug: domain.slug },
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      topic: { id: topic.id, name: topic.name, slug: topic.slug },
    },
  };
}

export async function listRelatedContentItems(
  contentItemId: string,
  topicId: string,
  limit = 3,
): Promise<ContentItemListRow[]> {
  const supabase = createSupabaseAnonServerClient();

  const { data: topic, error: topicError } = await supabase
    .from("topic")
    .select("category_id")
    .eq("id", topicId)
    .maybeSingle();

  if (topicError) {
    throw new Error(topicError.message);
  }
  if (!topic) {
    return [];
  }

  const { data: topicsInCategory, error: topicsError } = await supabase
    .from("topic")
    .select("id")
    .eq("category_id", topic.category_id);

  if (topicsError) {
    throw new Error(topicsError.message);
  }

  const topicIds = (topicsInCategory ?? []).map((t) => t.id);
  if (topicIds.length === 0) {
    return [];
  }

  const { data: items, error: itemsError } = await supabase
    .from("content_item")
    .select("id,title,slug,content_type,sort_order")
    .in("topic_id", topicIds)
    .neq("id", contentItemId)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return items ?? [];
}

/** Pick the first list entry whose id matches `requested`, if valid. */
export function pickById<T extends { id: string }>(
  rows: T[],
  requested: string | undefined,
): T | null {
  if (!rows.length) {
    return null;
  }
  if (requested && rows.some((r) => r.id === requested)) {
    return rows.find((r) => r.id === requested)!;
  }
  return rows[0];
}

export function librarySelectionHref(selection: {
  domainId: string;
  categoryId: string;
  topicId: string;
}): string {
  const q = new URLSearchParams({
    domain: selection.domainId,
    category: selection.categoryId,
    topic: selection.topicId,
  });
  return `/library?${q.toString()}`;
}
