import { config } from "dotenv";
config();
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log("Testing upload URL creation...");
  const { data, error } = await supabaseAdmin.storage
    .from("library-files")
    .createSignedUploadUrl("test-upload.pdf");
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

test();
