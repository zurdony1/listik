-- ===========================================
-- LISTIK DATABASE V2
-- ===========================================

create extension if not exists pgcrypto;

------------------------------------------------
-- BRANDS
------------------------------------------------

create table if not exists brands (

    id uuid primary key default gen_random_uuid(),

    name text not null unique,

    logo_url text,

    created_at timestamptz default now()

);

------------------------------------------------
-- CATEGORIES
------------------------------------------------

create table if not exists categories (

    id uuid primary key default gen_random_uuid(),

    name text not null unique,

    created_at timestamptz default now()

);

------------------------------------------------
-- PRODUCTS
------------------------------------------------

create table if not exists products (

    id uuid primary key default gen_random_uuid(),

    brand_id uuid references brands(id),

    category_id uuid references categories(id),

    name text not null,

    normalized_name text,

    created_at timestamptz default now()

);

------------------------------------------------
-- PRODUCT PRESENTATIONS
------------------------------------------------

create table if not exists product_presentations (

    id uuid primary key default gen_random_uuid(),

    product_id uuid
        references products(id)
        on delete cascade,

    size_value numeric,

    size_unit text,

    package_type text,

    units_per_package integer default 1,

    barcode text,

    image_url text,

    created_at timestamptz default now()

);

------------------------------------------------
-- STORES
------------------------------------------------

create table if not exists stores (

    id uuid primary key default gen_random_uuid(),

    name text not null unique,

    logo_url text,

    created_at timestamptz default now()

);

------------------------------------------------
-- STORE BRANCHES
------------------------------------------------

create table if not exists store_branches (

    id uuid primary key default gen_random_uuid(),

    store_id uuid
        references stores(id)
        on delete cascade,

    name text,

    city text,

    state text,

    latitude numeric,

    longitude numeric,

    created_at timestamptz default now()

);

------------------------------------------------
-- PRODUCT CODES
------------------------------------------------

create table if not exists product_codes (

    id uuid primary key default gen_random_uuid(),

    presentation_id uuid
        references product_presentations(id)
        on delete cascade,

    store_id uuid
        references stores(id)
        on delete cascade,

    code text not null,

    created_at timestamptz default now(),

    unique(store_id, code)

);

------------------------------------------------
-- TICKETS
------------------------------------------------

create table if not exists tickets (

    id uuid primary key default gen_random_uuid(),

    branch_id uuid
        references store_branches(id),

    purchase_date timestamptz,

    subtotal numeric,

    taxes numeric,

    total numeric,

    image_url text,

    created_at timestamptz default now()

);

------------------------------------------------
-- TICKET ITEMS
------------------------------------------------

create table if not exists ticket_items (

    id uuid primary key default gen_random_uuid(),

    ticket_id uuid
        references tickets(id)
        on delete cascade,

    raw_code text,

    raw_name text,

    quantity numeric,

    unit_price numeric,

    total_price numeric,

    presentation_id uuid
        references product_presentations(id),

    confidence integer,

    created_at timestamptz default now()

);

------------------------------------------------
-- PRICES
------------------------------------------------

create table if not exists prices (

    id uuid primary key default gen_random_uuid(),

    presentation_id uuid
        references product_presentations(id)
        on delete cascade,

    branch_id uuid
        references store_branches(id)
        on delete cascade,

    ticket_item_id uuid
        references ticket_items(id)
        on delete cascade,

    price numeric not null,

    created_at timestamptz default now()

);

------------------------------------------------
-- BRAIN LEARNING
------------------------------------------------

create table if not exists brain_learning (

    id uuid primary key default gen_random_uuid(),

    raw_name text not null,

    normalized_name text,

    presentation_id uuid
        references product_presentations(id),

    confidence integer,

    times_confirmed integer default 1,

    last_seen timestamptz default now(),

    created_at timestamptz default now()

);

------------------------------------------------
-- INDEXES
------------------------------------------------

create index if not exists idx_products_name
on products(name);

create index if not exists idx_products_normalized
on products(normalized_name);

create index if not exists idx_codes
on product_codes(code);

create index if not exists idx_ticket_items_raw
on ticket_items(raw_name);

create index if not exists idx_learning_raw
on brain_learning(raw_name);