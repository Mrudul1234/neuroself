// Client-side PDF text extraction using pdf.js.
// Worker is loaded as a URL via Vite's ?url import.
import * as pdfjsLib from "pdfjs-dist";
// Vite asset URL import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as string;

export interface ExtractedPage {
  page: number;
  text: string;
}

export async function extractPdfText(
  source: string | ArrayBuffer,
  onProgress?: (done: number, total: number) => void,
): Promise<{ pages: ExtractedPage[]; fullText: string }> {
  const loadingTask = pdfjsLib.getDocument(
    typeof source === "string" ? { url: source } : { data: source },
  );
  const pdf = await loadingTask.promise;
  const pages: ExtractedPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let text = "";
    for (const item of content.items as Array<{
      str: string;
      transform: number[];
      hasEOL?: boolean;
    }>) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 4) text += "\n";
      text += item.str;
      if (item.hasEOL) text += "\n";
      else text += " ";
      lastY = y;
    }
    pages.push({ page: i, text: text.replace(/[ \t]+/g, " ").trim() });
    onProgress?.(i, pdf.numPages);
  }
  const fullText = pages.map((p) => p.text).join("\n\n");
  return { pages, fullText };
}
