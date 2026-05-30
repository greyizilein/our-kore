import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/kore-supabase/admin.server";

// --- Auth helpers (duplicated from admin.functions to keep this file a
//     thin server-fn module — see tanstack-supabase-import-graph note) ---

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
  const list = (process.env.KORE_ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (email && list.includes(email.toLowerCase())) return true;
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = ((data as any)?.users ?? []) as Array<{ id: string; created_at: string }>;
  if (users.length === 0) return false;
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

// --- Site Content (key/value JSON, per-page editorial copy) -------------

export const getSiteContent = createServerFn({ method: "POST" })
  .inputValidator((d: { keys?: string[] }) => d)
  .handler(async ({ data }) => {
    let q = supabaseAdmin.from("site_content").select("key,value");
    if (data.keys && data.keys.length) q = q.in("key", data.keys);
    const { data: rows } = await q;
    const out: Record<string, any> = {};
    (rows ?? []).forEach((r: any) => { out[r.key] = r.value; });
    return { content: out };
  });

export const adminUpsertSiteContent = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; key: string; value: any }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListSiteContent = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("site_content").select("*").order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return { content: rows ?? [] };
  });

// --- Site Settings (subscription fees, shipping, etc.) ------------------

export const getSiteSettings = createServerFn({ method: "POST" })
  .inputValidator((_d: Record<string, never>) => _d)
  .handler(async () => {
    const { data: rows } = await supabaseAdmin.from("site_settings").select("key,value");
    const out: Record<string, any> = {};
    (rows ?? []).forEach((r: any) => { out[r.key] = r.value; });
    return { settings: out };
  });

export const adminUpsertSiteSetting = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; key: string; value: any }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Announcements (drives the menu dot + member notifications) ---------

export const getActiveAnnouncements = createServerFn({ method: "POST" })
  .inputValidator((d: { token?: string }) => d)
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const { data: rows } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .lte("published_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("published_at", { ascending: false })
      .limit(20);

    let readIds: string[] = [];
    if (data.token) {
      try {
        const user = await getAuthedUser(data.token);
        const { data: reads } = await supabaseAdmin
          .from("notification_reads")
          .select("announcement_id")
          .eq("user_id", user.id);
        readIds = (reads ?? []).map((r: any) => r.announcement_id);
      } catch { /* anonymous */ }
    }

    const items = (rows ?? []).map((r: any) => ({ ...r, read: readIds.includes(r.id) }));
    return { announcements: items, unread: items.filter((r) => !r.read).length };
  });

export const markAnnouncementRead = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    await supabaseAdmin.from("notification_reads").upsert({
      user_id: user.id,
      announcement_id: data.id,
      read_at: new Date().toISOString(),
    });
    return { ok: true };
  });

export const markAllAnnouncementsRead = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    const now = new Date().toISOString();
    const { data: rows } = await supabaseAdmin
      .from("announcements")
      .select("id")
      .lte("published_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`);
    if (!rows || !rows.length) return { ok: true };
    const reads = rows.map((r: any) => ({ user_id: user.id, announcement_id: r.id, read_at: now }));
    await supabaseAdmin.from("notification_reads").upsert(reads);
    return { ok: true };
  });

export const adminListAnnouncements = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { announcements: rows ?? [] };
  });

export const adminUpsertAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string;
    announcement: {
      id?: string;
      title: string;
      body: string;
      audience: "all" | "members" | "subscribers";
      published_at?: string | null;
      expires_at?: string | null;
    };
  }) => d)
  .handler(async ({ data }) => {
    const user = await requireAdmin(data.token);
    const payload: any = {
      ...data.announcement,
      published_at: data.announcement.published_at ?? new Date().toISOString(),
      created_by: user.id,
    };
    if (!payload.id) delete payload.id;
    const { error } = await supabaseAdmin.from("announcements").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
