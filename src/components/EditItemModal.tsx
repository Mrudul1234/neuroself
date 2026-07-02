import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { updateItem, deleteItemWithFile, type ItemType, type LibraryItem } from "@/lib/library";
import { LibraryCard } from "./LibraryCard";

interface Props {
  open: boolean;
  item: LibraryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPES: { value: ItemType; label: string }[] = [
  { value: "paper", label: "Paper" },
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
];

export function EditItemModal({ open, item, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ItemType>("article");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setUrl(item.url);
      setType(item.type);
      setError(null);
      setConfirmDelete(false);
    }
  }, [item, open]);

  if (!open || !item) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);

    // Automatically parse domain if URL was edited
    let domain = item.domain;
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // Keep existing or null
    }

    try {
      await updateItem(item.id, {
        title: title.trim(),
        url: url.trim(),
        type,
        domain,
      });
      toast.success("Changes saved.");
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update.";
      setError(msg);
      toast.error(`Update failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await deleteItemWithFile(item);
      toast.success("Item deleted successfully.");
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete.";
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(26,26,26,0.45)" }}
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not children
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="relative my-8 w-full max-w-lg rounded-[28px] border border-stone-mist bg-white p-7 shadow-[0_24px_60px_-20px_rgba(26,26,26,0.45)] animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — always 40px, high z-index, absolute positioned */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute right-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-stone-mist text-midnight-ink transition-colors hover:bg-cream-paper"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h2
          className="font-instrument text-midnight-ink"
          style={{ fontSize: 36, lineHeight: 0.95, letterSpacing: "-0.04em" }}
        >
          Edit <span className="text-graphite-veil">item</span>
        </h2>

        {error && (
          <div
            className="mt-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-red-700"
            style={{ fontSize: 13 }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="flex items-start gap-5">
            <div className="pointer-events-none opacity-80">
              <LibraryCard
                item={{
                  ...item,
                  title: title || item.title,
                  type,
                }}
                width={104}
                previewOnly
              />
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <label
                  className="mb-1 block uppercase text-smoke"
                  style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}
                >
                  Title
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-[12px] border border-stone-mist bg-cream-paper px-3 py-2.5 text-midnight-ink outline-none focus:border-graphite-veil"
                  style={{ fontSize: 14, fontWeight: 500 }}
                  autoFocus
                />
              </div>

              <div>
                <label
                  className="mb-1 block uppercase text-smoke"
                  style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}
                >
                  Link URL
                </label>
                <input
                  required
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-[12px] border border-stone-mist bg-cream-paper px-3 py-2.5 text-midnight-ink outline-none focus:border-graphite-veil"
                  style={{ fontSize: 14, fontWeight: 500 }}
                />
              </div>

              <div>
                <label
                  className="mb-2 block uppercase text-smoke"
                  style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}
                >
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => {
                    const active = type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setType(t.value);
                        }}
                        className={`rounded-full border px-4 py-1.5 ${
                          active
                            ? "border-midnight-ink bg-midnight-ink text-white"
                            : "border-stone-mist bg-white text-midnight-ink hover:bg-cream-paper"
                        }`}
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 pt-2">
            {/* Delete button (styled in red, aligned left) */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className={`mr-auto inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 transition-colors active:scale-95 cursor-pointer disabled:opacity-50 ${
                confirmDelete 
                  ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                  : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              }`}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              <span>{confirmDelete ? "Confirm Delete?" : "Delete"}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="rounded-full border border-stone-mist bg-white px-4 py-2.5 text-midnight-ink hover:bg-cream-paper"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting || !title.trim() || !url.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-midnight-ink px-5 py-2.5 text-white hover:opacity-90 disabled:opacity-50"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
