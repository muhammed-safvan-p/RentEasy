"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, X, Car, Loader2, AlertCircle, Crop as CropIcon, ImageIcon, Check } from "lucide-react";
import { apiRequest } from "@/lib/api";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface VehicleImageUploaderProps {
  /** Existing image URL (shown as current preview) */
  currentImageUrl?: string;
  /** Called with the Cloudinary URL after a successful upload */
  onUploadComplete: (url: string) => void;
  /** Called when the user clears the current image */
  onClear?: () => void;
  /** Disable interactions (e.g., while form is submitting) */
  disabled?: boolean;
  /** Visual variant: dark (user side) or light (admin side) */
  variant?: "dark" | "light";
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: PixelCrop
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export function VehicleImageUploader({
  currentImageUrl,
  onUploadComplete,
  onClear,
  disabled = false,
  variant = "dark",
}: VehicleImageUploaderProps) {
  const isLight = variant === "light";

  // Raw file selected by user (before crop)
  const [rawSrc, setRawSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropModal, setShowCropModal] = useState(false);

  // Upload & delete state
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedPublicId, setUploadedPublicId] = useState("");

  // Preview: show uploadedUrl if freshly uploaded, else currentImageUrl
  const previewUrl = uploadedUrl || currentImageUrl || "";

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (rawSrc) URL.revokeObjectURL(rawSrc);
    };
  }, [rawSrc]);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || deleting) return;
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size client-side (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("Image is too large. Please select a photo under 10 MB.");
        return;
      }

      // Validate image type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (file.type && !allowedTypes.includes(file.type)) {
        setUploadError("Unsupported format. Please select a JPG, PNG, or WEBP photo.");
        return;
      }

      setUploadError("");
      const objectUrl = URL.createObjectURL(file);
      setRawSrc(objectUrl);
      setShowCropModal(true);

      // Reset input so the same file can be re-selected if needed
      e.target.value = "";
    },
    [disabled, deleting]
  );

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    // 3:2 landscape aspect ratio — suits vehicle cards
    setCrop(centerAspectCrop(width, height, 3 / 2));
  }, []);

  const onImageError = useCallback(() => {
    setUploadError("Unable to open this image format. Please select a standard JPG, PNG, or WEBP photo.");
  }, []);

  const handleCropAndUpload = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) return;

    setUploading(true);
    setUploadError("");

    try {
      // Draw the cropped region onto a hidden canvas
      await canvasPreview(imgRef.current, canvasRef.current, completedCrop);

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/jpeg", 0.92)
      );

      if (!blob) throw new Error("Failed to process image. Please try again.");

      // Build FormData and POST to backend via centralized apiRequest helper
      const formData = new FormData();
      formData.append("image", blob, "vehicle.jpg");

      const data = await apiRequest<{ url: string; publicId: string }>(
        "/api/upload/vehicle-image",
        {
          method: "POST",
          body: formData,
        }
      );

      // If replacing an existing image, clean up the old image from Cloudinary
      const oldTarget = uploadedUrl || currentImageUrl;
      const oldPublic = uploadedPublicId;
      if (
        oldTarget &&
        oldTarget !== data.url &&
        (oldPublic || oldTarget.includes("cloudinary.com") || oldTarget.includes("res.cloudinary"))
      ) {
        apiRequest("/api/upload/delete-image", {
          method: "POST",
          body: JSON.stringify({
            imageUrl: oldTarget,
            publicId: oldPublic || undefined,
          }),
        }).catch((e: unknown) => console.error("Non-blocking old image cleanup failed:", e));
      }

      setUploadedUrl(data.url);
      setUploadedPublicId(data.publicId || "");
      onUploadComplete(data.url);
      setShowCropModal(false);
      setRawSrc("");
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, [completedCrop, onUploadComplete, uploadedUrl, currentImageUrl, uploadedPublicId]);

  const handleCancelCrop = useCallback(() => {
    setShowCropModal(false);
    setRawSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setUploadError("");
  }, []);

  const handleClear = useCallback(async () => {
    const targetUrl = uploadedUrl || currentImageUrl;
    if (!targetUrl) {
      onClear?.();
      return;
    }

    setDeleting(true);
    setUploadError("");

    try {
      // If it's a Cloudinary image or we have publicId, request deletion from Cloudinary
      if (uploadedPublicId || targetUrl.includes("cloudinary.com") || targetUrl.includes("res.cloudinary")) {
        await apiRequest("/api/upload/delete-image", {
          method: "POST",
          body: JSON.stringify({
            imageUrl: targetUrl,
            publicId: uploadedPublicId || undefined,
          }),
        });
      }
    } catch (err) {
      console.error("Failed to delete image from Cloudinary:", err);
    } finally {
      setUploadedUrl("");
      setUploadedPublicId("");
      setDeleting(false);
      onClear?.();
    }
  }, [uploadedUrl, currentImageUrl, uploadedPublicId, onClear]);

  /* ── Shared style tokens ── */
  const cardBg = isLight
    ? "bg-slate-50 border-slate-200"
    : "bg-[#121224] border-white/5";
  const innerBg = isLight
    ? "bg-slate-200 border-slate-300"
    : "bg-[#1a1a2e] border-white/10";
  const labelColor = isLight ? "text-slate-700" : "text-white";
  const subColor = isLight ? "text-slate-500" : "text-slate-400";
  const btnBase = isLight
    ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white";

  return (
    <>
      {/* ── Main Upload UI ── */}
      <div
        className={`rounded-2xl border p-4 space-y-3.5 ${cardBg}`}
        role="group"
        aria-label="Vehicle photo upload"
      >
        {/* Header */}
        <div className={`flex items-center gap-2 pb-2 border-b ${isLight ? "border-slate-200" : "border-white/5"}`}>
          <ImageIcon className={`w-3.5 h-3.5 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>
            Vehicle Cover Photo
          </span>
          {(uploadedUrl || currentImageUrl) && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
              <Check className="w-3 h-3" />
              Photo ready
            </span>
          )}
        </div>

        {/* Preview area */}
        <div
          className={`relative w-full aspect-[3/2] max-h-48 rounded-xl overflow-hidden border ${innerBg} flex items-center justify-center`}
        >
          {previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt="Vehicle preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`flex flex-col items-center gap-2 ${subColor}`}>
              <Car className="w-10 h-10 opacity-30" />
              <span className="text-xs font-medium opacity-50">No photo yet</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading || deleting}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 ${btnBase}`}
            id="vehicle-image-upload-btn"
            aria-label="Choose photo to upload"
          >
            <Upload className="w-3.5 h-3.5" />
            {previewUrl ? "Change Photo" : "Choose Photo"}
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled || uploading || deleting}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
              aria-label="Remove vehicle photo"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Error message */}
        {uploadError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-300 leading-relaxed">{uploadError}</p>
          </div>
        )}

        {/* Help text */}
        <p className={`text-[11px] ${subColor} leading-relaxed`}>
          Supported formats: JPG, PNG, WEBP · Max 10 MB · Aspect ratio 3:2 (landscape)
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
          id="vehicle-image-file-input"
          aria-hidden="true"
        />

        {/* Hidden canvas for crop processing */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>

      {/* ── Crop Modal ── */}
      {showCropModal && rawSrc && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-modal-title"
        >
          <div className="w-full max-w-xl bg-[#1a1a2e] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Crop modal header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <CropIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    id="crop-modal-title"
                    className="text-sm font-bold text-white"
                  >
                    Crop Vehicle Photo
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Drag to adjust · 3:2 landscape ratio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelCrop}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cancel crop"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Crop area */}
            <div className="p-5 flex items-center justify-center bg-[#111122] max-h-[60vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={3 / 2}
                minWidth={100}
                className="max-w-full rounded-lg overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={rawSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  onError={onImageError}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              </ReactCrop>
            </div>

            {/* Upload error inside modal */}
            {uploadError && (
              <div className="mx-5 mb-0 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-300">{uploadError}</p>
              </div>
            )}

            {/* Crop modal footer actions */}
            <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCancelCrop}
                disabled={uploading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropAndUpload}
                disabled={uploading || !completedCrop}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                id="crop-upload-confirm-btn"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Crop &amp; Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
