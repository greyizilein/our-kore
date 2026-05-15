import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/kore-supabase/admin.server";

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
  const list = (process.env.KORE_ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (email && list.includes(email.toLowerCase())) return true;
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = ((data as any)?.users ?? []) as Array<{ id: string; created_at: string }>;
  if (!users.length) return false;
  if (users.length === 1 && users[0].id === userId) return true;
  const earliest = [...users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
  return !!earliest && earliest.id === userId;
}
async function requireAdmin(token: string) {
  const u = await getAuthedUser(token);
  if (!(await isAdmin(u.id, u.email))) throw new Error("Forbidden");
  return u;
}

export type JournalPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  category: string;
  body_md: string;
  tags: string[];
  author: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

// --- Public reads ---------------------------------------------------------

export const listJournalPosts = createServerFn({ method: "POST" })
  .inputValidator((_d: Record<string, never>) => _d)
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("journal_posts")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(100);
    return { posts: (data ?? []) as JournalPost[] };
  });

export const getJournalPost = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("journal_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    return { post: (row ?? null) as JournalPost | null };
  });

// --- Admin CRUD -----------------------------------------------------------

export const adminListJournalPosts = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("journal_posts").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { posts: (rows ?? []) as JournalPost[] };
  });

export const adminUpsertJournalPost = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; post: Partial<JournalPost> & { slug: string; title: string } }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const payload: any = { ...data.post, updated_at: new Date().toISOString() };
    if (!payload.id) delete payload.id;
    if (payload.published && !payload.published_at) payload.published_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("journal_posts").upsert(payload, { onConflict: "slug" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteJournalPost = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("journal_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUploadJournalImage = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; filename: string; data_base64: string; content_type: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const buf = Buffer.from(data.data_base64, "base64");
    const path = `${Date.now()}-${data.filename.replace(/[^a-z0-9._-]/gi, "_")}`;
    const { error } = await supabaseAdmin.storage.from("journal").upload(path, buf, {
      contentType: data.content_type, upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("journal").getPublicUrl(path);
    return { url: pub.publicUrl };
  });
