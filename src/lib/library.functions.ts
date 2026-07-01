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

export const extractPdfPyMuPdfServer = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        storagePath: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const fs = await import("fs");
    const path = await import("path");
    const { exec } = await import("child_process");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // 1. Download file from storage
    const { data: fileData, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(data.storagePath);
    if (error) throw new Error("Supabase download error: " + error.message);

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Write temp file inside the workspace
    const tempFileName = `temp-pymupdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
    const tempFilePath = path.join(process.cwd(), tempFileName);
    await fs.promises.writeFile(tempFilePath, buffer);

    // 3. Execute python PyMuPDF extraction script
    const scriptPath = path.join(process.cwd(), "src", "lib", "extract_pdf.py");
    try {
      const result = await new Promise<any>((resolve, reject) => {
        exec(
          `python "${scriptPath}" "${tempFilePath}"`,
          { maxBuffer: 10 * 1024 * 1024 },
          (err, stdout, stderr) => {
            // Delete file immediately
            fs.unlink(tempFilePath, () => {});

            if (err) {
              reject(new Error(stderr || err.message));
              return;
            }
            try {
              const parsed = JSON.parse(stdout);
              if (parsed.error) {
                reject(new Error(parsed.error));
              } else {
                resolve(parsed);
              }
            } catch (jsonErr) {
              reject(new Error("Failed to parse script output: " + stdout));
            }
          }
        );
      });
      return result;
    } catch (execErr: any) {
      // Cleanup just in case
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw execErr;
    }
  });

export const fetchArticleHtml = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        url: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch article: ${res.statusText}`);
      }
      let html = await res.text();

      // Inject <base href="..."> so relative paths resolve against the original domain
      const baseTag = `<base href="${data.url}">`;
      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>${baseTag}`);
      } else if (html.includes("<HEAD>")) {
        html = html.replace("<HEAD>", `<HEAD>${baseTag}`);
      } else {
        html = baseTag + html;
      }
      return { html };
    } catch (err: any) {
      throw new Error(err.message || "Failed to fetch article HTML");
    }
  });
