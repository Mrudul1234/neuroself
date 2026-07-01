import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "library-files";

const itemTypeSchema = z.enum(["paper", "article", "video"]);

export const cacheExtractedText = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        text: z.string().min(1).max(5_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("library_items")
      .update({ extracted_text: data.text })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const insertItemServer = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        title: z.string().min(1),
        url: z.string().min(1),
        thumbnail_url: z.string().nullable(),
        type: itemTypeSchema,
        domain: z.string().nullable(),
        storage_path: z.string().nullable().optional(),
        file_size: z.number().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: inserted, error } = await supabaseAdmin
      .from("library_items")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted as any;
  });

export const updateItemServer = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z.object({
          title: z.string().min(1).optional(),
          url: z.string().min(1).optional(),
          thumbnail_url: z.string().nullable().optional(),
          type: itemTypeSchema.optional(),
          domain: z.string().nullable().optional(),
          storage_path: z.string().nullable().optional(),
          file_size: z.number().nullable().optional(),
          extracted_text: z.string().nullable().optional(),
        }),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("library_items")
      .update(data.patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteItemServer = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        storage_path: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    if (data.storage_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([data.storage_path]);
    }
    const { error } = await supabaseAdmin
      .from("library_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createUploadUrlServer = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        contentType: z.string(),
        fileSize: z.number(),
        fileName: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const ext = data.fileName.split(".").pop() || "pdf";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { data: uploadData, error } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error) throw new Error(error.message);

    return {
      signedUrl: uploadData.signedUrl,
      path,
    };
  });
