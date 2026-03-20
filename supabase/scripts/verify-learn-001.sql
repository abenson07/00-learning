-- Run in Supabase SQL editor after migrate + seed (learn-001 acceptance checks)
select 'domain' as tbl, count(*)::int as n from public.domain
union all select 'category', count(*)::int from public.category
union all select 'topic', count(*)::int from public.topic
union all select 'content_item', count(*)::int from public.content_item
union all select 'content_version', count(*)::int from public.content_version
union all select 'lesson_plan', count(*)::int from public.lesson_plan
union all select 'lesson_plan_version', count(*)::int from public.lesson_plan_version
union all select 'lesson_plan_item', count(*)::int from public.lesson_plan_item
union all select 'learner_progress', count(*)::int from public.learner_progress
union all select 'lesson_item_progress', count(*)::int from public.lesson_item_progress
union all select 'quiz_attempt', count(*)::int from public.quiz_attempt
union all select 'quiz_question', count(*)::int from public.quiz_question
union all select 'highlight', count(*)::int from public.highlight
union all select 'comment', count(*)::int from public.comment
union all select 'comment_ai_response', count(*)::int from public.comment_ai_response
order by tbl;

-- current_version_id must reference an existing row
select ci.id, ci.title, ci.current_version_id, cv.id as version_ok
from public.content_item ci
left join public.content_version cv on cv.id = ci.current_version_id
where ci.current_version_id is null or cv.id is null;

-- plain_text must be non-empty for seeded versions
select id, content_item_id, length(plain_text) as len
from public.content_version
where plain_text is null or btrim(plain_text) = '';
