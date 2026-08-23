import { useState } from "react";
import { Check, Copy, ImagePlus, Loader2, Upload } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function UploadPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const chooseFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast({ title: "Unsupported image type", description: "Use JPG, PNG, WEBP, or GIF.", variant: "destructive" });
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast({ title: "Image is too large", description: "Please choose an image smaller than 4 MB.", variant: "destructive" });
      return;
    }
    setFile(selected);
    setImageUrl("");
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(selected);
  };

  const upload = async () => {
    if (!file || !preview || !token) return;
    setIsUploading(true);
    try {
      const response = await fetch(apiUrl("/api/admin/uploads"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, contentType: file.type, data: preview }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Upload failed");
      const url = apiUrl(body.imageUrl);
      setImageUrl(url);
      toast({ title: "Image uploaded", description: "Copy the URL into a product image field." });
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const copyUrl = async () => {
    if (!imageUrl) return;
    await navigator.clipboard.writeText(imageUrl);
    toast({ title: "Image URL copied" });
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-2xl font-display font-black uppercase tracking-tight sm:text-3xl">Upload Image</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload a product image and copy its permanent URL.</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-card p-4 sm:p-6">
          <label
            htmlFor="product-image"
            className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            {preview ? (
              <img src={preview} alt="Selected preview" className="max-h-52 max-w-full rounded-lg object-contain" />
            ) : (
              <>
                <ImagePlus className="mb-3 h-9 w-9 text-primary/70" />
                <span className="font-display text-sm font-bold uppercase tracking-wide">Choose product image</span>
                <span className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, or GIF · up to 4 MB</span>
              </>
            )}
            <input id="product-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
          </label>

          {file && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button onClick={upload} disabled={isUploading} className="w-full bg-primary font-display text-xs font-bold uppercase tracking-wide text-white sm:w-auto">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isUploading ? "Uploading..." : "Upload image"}
              </Button>
            </div>
          )}

          {imageUrl && (
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-300">
                <Check className="h-4 w-4" /> Ready to use
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={imageUrl} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" onFocus={(event) => event.currentTarget.select()} />
                <Button size="icon" variant="outline" onClick={copyUrl} aria-label="Copy image URL" className="h-9 w-9 shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Paste this URL into the image field for a product or promo slide.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}