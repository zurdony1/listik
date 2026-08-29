create table if not exists brain_memory (
    id uuid primary key default gen_random_uuid(),

    raw_name text not null,
    normalized_raw_name text,

    raw_code text,
    store_name text,

    product_id uuid
        references products(id)
        on delete set null,

    presentation_id uuid
        references product_presentations(id)
        on delete set null,

    confidence integer not null default 0,

    source text not null default 'manual'
        check (
            source in (
                'code',
                'name',
                'manual'
            )
        ),

    accepted boolean not null default false,

    created_at timestamptz not null default now()
);

create index if not exists idx_brain_memory_raw_name
on brain_memory(raw_name);

create index if not exists idx_brain_memory_normalized
on brain_memory(normalized_raw_name);

create index if not exists idx_brain_memory_presentation
on brain_memory(presentation_id);

create index if not exists idx_brain_memory_store
on brain_memory(store_name);