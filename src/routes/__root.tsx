import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      {
        name: "description",
        content:
          "NeuroShelf is a personal web app for organizing brain and neuroscience research papers, articles, and videos.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      {
        property: "og:description",
        content:
          "NeuroShelf is a personal web app for organizing brain and neuroscience research papers, articles, and videos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Lovable App" },
      {
        name: "twitter:description",
        content:
          "NeuroShelf is a personal web app for organizing brain and neuroscience research papers, articles, and videos.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f56cb8d7-3c60-406b-b009-fe1fdf3e0947/id-preview-a2b51bdc--852bf464-f142-4c9d-ad8c-ec1895a3d026.lovable.app-1782812549576.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f56cb8d7-3c60-406b-b009-fe1fdf3e0947/id-preview-a2b51bdc--852bf464-f142-4c9d-ad8c-ec1895a3d026.lovable.app-1782812549576.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      { src: "https://js.puter.com/v2/", defer: true },
      { src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Background Sync: Generate covers for existing items with no thumbnails
  useEffect(() => {
    const syncMissingCovers = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { generateNeuroShelfCover } = await import("@/lib/generateCover");

        // Query database for library items lacking a thumbnail
        const { data: items, error } = await supabase
          .from("library_items")
          .select("*")
          .is("thumbnail_url", null);

        if (error || !items || items.length === 0) return;

        console.log(`[NeuroShelf Cover Sync] Found ${items.length} items missing covers.`);

        // Process in batches of 2 to avoid rate limits
        const limit = 2;
        for (let i = 0; i < items.length; i += limit) {
          const batch = items.slice(i, i + limit);
          await Promise.all(
            batch.map(async (item) => {
              // YouTube cover extraction rule: use oEmbed thumbnail if it exists
              const isYoutube = /youtube\.com|youtu\.be/i.test(item.url);
              let coverUrl: string | null = null;

              if (isYoutube) {
                // Fetch oEmbed or construct standard YT MQ/HQ URL directly
                const videoId = item.url.match(
                  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
                )?.[1];
                if (videoId) {
                  coverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }
              }

              if (!coverUrl) {
                coverUrl = await generateNeuroShelfCover(
                  item.title,
                  item.type as "paper" | "article" | "video",
                  "flux",
                );
              }

              if (coverUrl) {
                await supabase
                  .from("library_items")
                  .update({ thumbnail_url: coverUrl })
                  .eq("id", item.id);
                console.log(`[NeuroShelf Cover Sync] Updated cover for: "${item.title}"`);
              }
            }),
          );
        }
      } catch (err) {
        console.error("[NeuroShelf Cover Sync] Error during background synchronization:", err);
      }
    };

    // Small delay to let initial loads resolve
    const timer = setTimeout(() => {
      syncMissingCovers();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
