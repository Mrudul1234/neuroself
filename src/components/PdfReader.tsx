import { ArrowLeft, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

interface PdfReaderProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function PdfReader({ url, title, onClose }: PdfReaderProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "document"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title,
          url,
        })
        .catch((err) => console.warn("Share failed:", err));
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard ✓");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#ffffeb] text-[#1a1a1a]">
      {/* Top Bar */}
      <div className="flex h-16 items-center justify-between border-b border-[#e4e4d0] bg-white px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist text-midnight-ink transition-colors hover:bg-cream-paper"
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <span
            className="font-instrument italic text-midnight-ink line-clamp-1 max-w-[200px] sm:max-w-[450px]"
            style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}
          >
            {title || "PDF Reader"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist text-midnight-ink transition-colors hover:bg-cream-paper"
            title="Share"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={handleDownload}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist bg-midnight-ink text-white transition-colors hover:opacity-90"
            title="Download PDF"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Embedded PDF Viewer */}
      <div className="flex-1 bg-[#e4e4d0]/20">
        <iframe src={url} className="h-full w-full border-none bg-white" title={title} />
      </div>
    </div>
  );
}
