import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/kore-supabase/admin.server";

// --- Admin gate -----------------------------------------------------------
async function getAuthedUser(token: string) {
  if (!token) throw new Error("Unauthorized");
  const url = process.env.KORE_SUPABASE_URL!;
  const anon = process.env.KORE_SUPABASE_ANON_KEY || process.env.KORE_SUPABASE_PUBLISHABLE_KEY!;
  const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await c.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

async function isAdmin(userId: string, email: string | undefined): Promise<boolean> {
  const list = (process.env.KORE_ADMIN_EMAILS || "grey.izilein@gmail.com")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (email && list.includes(email.toLowerCase())) return true;
  // Bootstrap: the EARLIEST registered user is admin. listUsers returns
  // newest-first by default, so we fetch a wide page and sort ascending.
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = ((data as any)?.users ?? []) as Array<{ id: string; created_at: string }>;
  if (users.length === 0) return false;
  // Single-user project → that user is admin.
  if (users.length === 1 && users[0].id === userId) return true;
  const earliest = [...users].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )[0];
  return !!earliest && earliest.id === userId;
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

export const adminListProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("products").select("*").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { products: rows ?? [] };
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; product: { id?: string; series: string; name: string; price_ngn: number; status: string; sort_order: number; description?: string; material?: string } }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const payload: any = { ...data.product, updated_at: new Date().toISOString() };
    if (!payload.id) delete payload.id;
    const { error } = await supabaseAdmin.from("products").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
    const buf = Buffer.from(data.data_base64, "base64");
    const ext = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabaseAdmin.storage.from("avatars").upload(path, buf, {
      contentType: data.content_type, upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${pub.publicUrl}?t=${Date.now()}`;
    await supabaseAdmin.from("profiles").upsert({ id: user.id, avatar_url: avatarUrl }, { onConflict: "id" });
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
