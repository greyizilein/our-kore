import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/kore-supabase/admin.server";
import { KORE_SUPABASE_URL, KORE_SUPABASE_ANON_KEY } from "@/integrations/kore-supabase/client";
import { FORMME_I_PRODUCT } from "@/lib/products";

// --- Admin gate -----------------------------------------------------------
async function getAuthedUser(token: string) {
  if (!token) throw new Error("Unauthorized");
  // Env vars are preferred; fall back to the hardcoded public values in client.ts
  // so server functions work even when KORE_SUPABASE_* env vars aren't set in Vercel.
  const url = process.env.KORE_SUPABASE_URL || KORE_SUPABASE_URL;
  const anon = process.env.KORE_SUPABASE_ANON_KEY || process.env.KORE_SUPABASE_PUBLISHABLE_KEY || KORE_SUPABASE_ANON_KEY;
  const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await c.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

async function isAdmin(userId: string, email: string | undefined): Promise<boolean> {
  const envList = (process.env.KORE_ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const list = [...new Set([...envList, "grey.izilein@gmail.com"])];
  // Email check never needs supabaseAdmin — works without service role key.
  if (email && list.includes(email.toLowerCase())) return true;
  // Fallback: earliest registered user is admin. Requires service role key.
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = ((data as any)?.users ?? []) as Array<{ id: string; created_at: string }>;
    if (users.length === 0) return false;
    if (users.length === 1 && users[0].id === userId) return true;
    const earliest = [...users].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    return !!earliest && earliest.id === userId;
  } catch {
    return false;
  }
}

async function requireAdmin(token: string) {
  const user = await getAuthedUser(token);
  if (!(await isAdmin(user.id, user.email))) throw new Error("Forbidden");
  return user;
}

// --- Server functions -----------------------------------------------------

export const adminWhoAmI = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    const admin = await isAdmin(user.id, user.email);
    return { email: user.email, id: user.id, admin };
  });

export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const [orders, products, users] = await Promise.all([
      supabaseAdmin.from("orders").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);
    const revRes = await supabaseAdmin.from("orders").select("total_amount, total, amount").limit(1000);
    const revenue = (revRes.data ?? []).reduce<number>((s, r: any) => s + Number(r.total_amount ?? r.total ?? r.amount ?? 0), 0);
    return {
      orders: orders.count ?? 0,
      products: products.count ?? 0,
      members: (users.data as any)?.total ?? (users.data as any)?.users?.length ?? 0,
      revenue,
    };
  });

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return { orders: rows ?? [] };
  });

export const adminListMembers = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: res, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    return {
      members: ((res as any)?.users ?? []).map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: u.user_metadata?.full_name ?? null,
      })),
    };
  });

type AdminProductInput = {
  id?: string;
  slug: string;
  series: string;
  name: string;
  number: string;
  collection_slug: string;
  variant_slug: string;
  category: string;
  price_ngn: number;
  currency: string;
  status: string;
  sort_order: number;
  description?: string;
  material?: string;
  origin?: string;
  sizes?: string[];
  colorways?: Array<{ name: string; hex: string }>;
  images?: string[];
  hero?: string;
  featured?: boolean;
  is_new?: boolean;
  // Tombstone marker: written when a built-in seed product (see
  // formmeIAdminSeed below) is deleted, so adminListProducts knows not to
  // re-inject the seed on the next read. Only `slug` + `deleted` are set.
  deleted?: boolean;
};

const formmeIAdminSeed: AdminProductInput = {
  slug: FORMME_I_PRODUCT.slug,
  series: "FORMME I",
  name: FORMME_I_PRODUCT.name,
  number: FORMME_I_PRODUCT.number,
  collection_slug: FORMME_I_PRODUCT.collection,
  variant_slug: FORMME_I_PRODUCT.variant || "forme-i",
  category: FORMME_I_PRODUCT.category,
  price_ngn: FORMME_I_PRODUCT.price / 100,
  currency: FORMME_I_PRODUCT.currency,
  status: "live",
  sort_order: 1,
  description: FORMME_I_PRODUCT.story,
  material: FORMME_I_PRODUCT.fabric,
  origin: FORMME_I_PRODUCT.origin,
  sizes: FORMME_I_PRODUCT.sizes,
  colorways: FORMME_I_PRODUCT.colorways,
  images: FORMME_I_PRODUCT.images,
  hero: FORMME_I_PRODUCT.hero,
  featured: true,
  is_new: true,
};

async function readExtendedCatalogue(): Promise<AdminProductInput[]> {
  const { data } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("key", "catalog.products")
    .maybeSingle();
  return Array.isArray(data?.value) ? data.value : [];
}

export const adminListProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const [{ data: rows, error }, extended] = await Promise.all([
      supabaseAdmin.from("products").select("*").order("sort_order", { ascending: true }),
      readExtendedCatalogue(),
    ]);
    if (error) throw new Error(error.message);

    const tombstones = new Set(extended.filter((p) => p.deleted).map((p) => p.slug));
    const liveExtended = extended.filter((p) => !p.deleted);

    const extendedById = new Map(liveExtended.filter((p) => p.id).map((p) => [p.id, p]));
    const merged = (rows ?? []).map((row: any) => ({ ...row, ...(extendedById.get(row.id) ?? {}) }));
    for (const product of liveExtended) {
      if (!product.id || !merged.some((row: any) => row.id === product.id)) merged.push(product);
    }
    if (!tombstones.has(FORMME_I_PRODUCT.slug) && !merged.some((row: any) => row.slug === FORMME_I_PRODUCT.slug)) {
      merged.push(formmeIAdminSeed);
    }

    merged.sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    return { products: merged };
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; product: AdminProductInput }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const input = data.product;
    if (!input.slug || !input.name) throw new Error("Product name and slug are required.");

    const basic: any = {
      series: input.series || "",
      name: input.name,
      price_ngn: Number(input.price_ngn || 0),
      status: input.status || "draft",
      sort_order: Number(input.sort_order || 0),
      description: input.description || "",
      material: input.material || "",
      updated_at: new Date().toISOString(),
    };
    if (input.id && /^[0-9a-f-]{36}$/i.test(input.id)) basic.id = input.id;

    const { data: saved, error } = await supabaseAdmin
      .from("products")
      .upsert(basic)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const record: AdminProductInput = {
      ...input,
      id: saved.id,
      price_ngn: Number(input.price_ngn || 0),
      sort_order: Number(input.sort_order || 0),
      images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
      sizes: Array.isArray(input.sizes) ? input.sizes.filter(Boolean) : [],
      colorways: Array.isArray(input.colorways) ? input.colorways.filter((c) => c?.name) : [],
    };
    const catalogue = await readExtendedCatalogue();
    const next = catalogue.filter((item) => item.id !== saved.id && item.slug !== record.slug);
    next.push(record);
    next.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

    const { error: contentError } = await supabaseAdmin.from("site_content").upsert(
      { key: "catalog.products", value: next, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (contentError) throw new Error(contentError.message);
    return { ok: true, product: record };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; slug?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    if (/^[0-9a-f-]{36}$/i.test(data.id)) {
      const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    const catalogue = await readExtendedCatalogue();
    const next = catalogue.filter((item) => item.id !== data.id && (!data.slug || item.slug !== data.slug));
    // Deleting the built-in FORMME I seed needs a tombstone, or the next
    // adminListProducts read will find no row for its slug and re-inject it.
    if (data.slug === FORMME_I_PRODUCT.slug) {
      next.push({ slug: FORMME_I_PRODUCT.slug, deleted: true } as AdminProductInput);
    }
    const { error: contentError } = await supabaseAdmin.from("site_content").upsert(
      { key: "catalog.products", value: next, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (contentError) throw new Error(contentError.message);
    return { ok: true };
  });

export const adminUploadProductImage = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string;
    product_slug: string;
    filename: string;
    data_base64: string;
    content_type: string;
  }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const allowed: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };
    const ext = allowed[data.content_type];
    if (!ext) throw new Error("Use a JPG, PNG, WebP or AVIF image.");
    const buf = Buffer.from(data.data_base64, "base64");
    if (buf.byteLength > 5 * 1024 * 1024) throw new Error("Each image must be 5 MB or smaller.");

    try {
      await supabaseAdmin.storage.createBucket("product-images", {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: Object.keys(allowed),
      });
    } catch { /* bucket already exists */ }

    const slug = (data.product_slug || "unassigned").toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${slug}/${unique}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("product-images").upload(path, buf, {
      contentType: data.content_type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: publicData } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
    return { url: publicData.publicUrl };
  });

export const adminExportAll = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const [orders, products, users] = await Promise.all([
      supabaseAdmin.from("orders").select("*"),
      supabaseAdmin.from("products").select("*"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    return {
      exported_at: new Date().toISOString(),
      orders: orders.data ?? [],
      products: products.data ?? [],
      members: ((users.data as any)?.users ?? []).map((u: any) => ({
        id: u.id, email: u.email, created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at, metadata: u.user_metadata,
      })),
    };
  });

// --- Self-service profile (any signed-in user) ----------------------------

export const updateMyProfile = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string;
    profile: {
      full_name?: string;
      phone?: string;
      agent_name?: string;
      agent_tone?: string;
      city?: string;
      sizing?: string;
    };
  }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    const merged = { ...(user.user_metadata ?? {}), ...data.profile };
    const { data: res, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: merged,
    });
    if (error) throw new Error(error.message);
    return { ok: true, metadata: res.user?.user_metadata ?? merged };
  });

export const getMyProfile = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    return {
      email: user.email,
      metadata: user.user_metadata ?? {},
    };
  });

export const uploadAvatar = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; filename: string; data_base64: string; content_type: string }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    // Ensure avatars bucket exists (idempotent)
    try { await supabaseAdmin.storage.createBucket("avatars", { public: true }); } catch { /* already exists */ }
    const buf = Buffer.from(data.data_base64, "base64");
    const ext = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabaseAdmin.storage.from("avatars").upload(path, buf, {
      contentType: data.content_type, upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${pub.publicUrl}?t=${Date.now()}`;
    // Store in user_metadata (always works, no migration needed)
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), avatar_url: avatarUrl },
    });
    // Also store in profiles table if the column exists
    try { await supabaseAdmin.from("profiles").upsert({ id: user.id, avatar_url: avatarUrl }, { onConflict: "id" }); } catch { /* column may not exist yet */ }
    return { url: avatarUrl };
  });

// --- Inventory ------------------------------------------------------------
// Requires these tables in Supabase (run once in SQL editor):
//
// create table if not exists inventory (
//   id uuid primary key default gen_random_uuid(),
//   collection_slug text not null,
//   collection_name text not null,
//   piece_slug text not null,
//   piece_name text not null,
//   piece_number text not null default '',
//   total_units integer not null default 0,
//   sold_units integer not null default 0,
//   booked_units integer not null default 0,
//   status text not null default 'active',
//   sort_order integer not null default 0,
//   updated_at timestamptz default now()
// );
// alter table inventory enable row level security;
// create policy "Public read" on inventory for select using (true);
// create policy "Service role write" on inventory for all using (auth.role() = 'service_role');

export const getInventory = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, never>) => d)
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("inventory")
      .select("*")
      .order("sort_order", { ascending: true });
    const items = (data ?? []).map((row: any) => ({
      ...row,
      available_units: Math.max(
        0,
        (row.total_units ?? 0) - (row.sold_units ?? 0) - (row.booked_units ?? 0),
      ),
    }));
    return { items };
  });

export const adminUpsertInventory = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      token: string;
      item: {
        id?: string;
        collection_slug: string;
        collection_name: string;
        piece_slug: string;
        piece_name: string;
        piece_number: string;
        total_units: number;
        sold_units: number;
        booked_units: number;
        status: string;
        sort_order: number;
      };
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const payload: any = { ...data.item, updated_at: new Date().toISOString() };
    if (!payload.id) delete payload.id;
    const { error } = await supabaseAdmin.from("inventory").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteInventoryItem = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("inventory").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Orders ---------------------------------------------------------------

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string;
    items: Array<{ slug: string; size: string; color: string; qty: number; price: number }>;
    total_amount: number;
    currency: string;
    shipping_method: string;
    payment_ref: string;
    address_json: Record<string, string>;
  }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    const { error } = await supabaseAdmin.from("orders").insert({
      user_id: user.id,
      items: data.items,
      total_amount: data.total_amount,
      currency: data.currency,
      shipping_method: data.shipping_method,
      payment_ref: data.payment_ref,
      address_json: data.address_json,
      status: "paid",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Member Pieces --------------------------------------------------------
// Requires this table in Supabase (run once in SQL editor):
//
// create table if not exists member_pieces (
//   id uuid primary key default gen_random_uuid(),
//   code text not null unique,
//   user_id uuid references auth.users(id),
//   piece_name text not null default '',
//   piece_number text not null default '',
//   collection text not null default '',
//   edition_number text,
//   edition_total integer,
//   colorway text,
//   size text,
//   material text,
//   fabric_weight text,
//   fabric_composition text,
//   origin text,
//   workshop text,
//   artisan text,
//   thread_color text,
//   thread_count text,
//   stitching_type text,
//   stitching_density text,
//   buttons_material text,
//   buttons_origin text,
//   lining text,
//   hardware text,
//   care_instructions text,
//   production_date text,
//   quality_notes text,
//   admin_notes text,
//   unlocked_at timestamptz,
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
// );
// alter table member_pieces enable row level security;
// create policy "Owner or service role" on member_pieces for select
//   using (auth.uid() = user_id OR auth.role() = 'service_role');
// create policy "Service role write" on member_pieces for all
//   using (auth.role() = 'service_role');
//
// Set KORE_ADMIN_MEMBER_CODE env var for the universal admin code.

export const verifyMemberCode = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; code: string }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    const normalizedCode = data.code.trim().toUpperCase();
    const adminCode = (process.env.KORE_ADMIN_MEMBER_CODE ?? "").trim().toUpperCase();

    if (adminCode && normalizedCode === adminCode) {
      const { data: pieces } = await supabaseAdmin
        .from("member_pieces")
        .select("*")
        .order("created_at", { ascending: false });
      return { type: "admin" as const, piece: null, pieces: pieces ?? [] };
    }

    const { data: piece, error } = await supabaseAdmin
      .from("member_pieces")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (error || !piece) {
      throw new Error("Code not recognised. Check the code on your receipt or garment label and try again.");
    }

    if (!piece.user_id) {
      await supabaseAdmin
        .from("member_pieces")
        .update({ user_id: user.id, unlocked_at: new Date().toISOString() })
        .eq("id", piece.id);
      piece.user_id = user.id;
      piece.unlocked_at = new Date().toISOString();
    } else if (piece.user_id !== user.id) {
      if (!(await isAdmin(user.id, user.email))) {
        throw new Error("This code has already been registered to another account.");
      }
    }

    return { type: "piece" as const, piece, pieces: [] };
  });

export const adminListMemberPieces = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("member_pieces")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { pieces: rows ?? [] };
  });

export const adminUpsertMemberPiece = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; piece: any }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const payload: any = { ...data.piece, updated_at: new Date().toISOString() };
    if (!payload.id) delete payload.id;
    const { error } = await supabaseAdmin.from("member_pieces").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteMemberPiece = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("member_pieces").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// SQL to run in Supabase:
// create table contact_messages (
//   id uuid primary key default gen_random_uuid(),
//   name text not null,
//   email text not null,
//   subject text,
//   message text not null,
//   created_at timestamptz default now()
// );
export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; email: string; subject: string; message: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject || null,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
