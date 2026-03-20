-- learn-005: quiz templates per lesson plan item

create table public.quiz_question (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_item_id uuid not null references public.lesson_plan_item (id) on delete cascade,
  question_index int not null,
  question_text text not null,
  choices jsonb not null,
  correct_choice_id text not null,
  max_points int not null default 1,
  created_at timestamptz not null default now(),
  unique (lesson_plan_item_id, question_index)
);

create index quiz_question_lesson_plan_item_id_idx
  on public.quiz_question (lesson_plan_item_id);

alter table public.quiz_question enable row level security;

create policy "learn001_allow_all_anon" on public.quiz_question
  for all to anon using (true) with check (true);

create policy "learn001_allow_all_authenticated" on public.quiz_question
  for all to authenticated using (true) with check (true);
