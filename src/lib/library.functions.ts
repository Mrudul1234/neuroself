import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Persist extracted PDF text for an existing library item.
 *
 * Uses the privileged server client because library_items writes are
 * gated to the `authenticated` role and this app has no sign-in flow.
 * Scope is narrow: we only update `extracted_text` for a known id.
 */
export const cacheExtractedText = createServerFn({ method: "POST" })
  .inputValidator((data) =>
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
