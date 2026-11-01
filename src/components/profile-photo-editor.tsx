
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Cropper, { Area } from "react-easy-crop";
import {
  Camera,
  Check,
  LoaderCircle,
  RotateCcw,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ProfilePhotoEditorProps = {
  currentImage: string;
  initials: string;
  onUploaded: (imageUrl: string) => void;
  onRemoved: () => void;
};

function createCroppedImage(
  imageUrl: string,
  cropArea: Area,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Unable to process the selected image."));
        return;
      }

      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      context.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height,
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to create cropped image."));
            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        0.92,
      );
    };

    image.onerror = () => {
      reject(new Error("Unable to load the selected image."));
    };

    image.src = imageUrl;
  });
}

export default function ProfilePhotoEditor({
  currentImage,
  initials,
  onUploaded,
  onRemoved,
}: ProfilePhotoEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<Area | null>(null);

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5 MB or less.");
      return;
    }

    const nextImageUrl = URL.createObjectURL(file);

    setImageUrl(nextImageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setModalOpen(true);
  };

  const handleCropComplete = (
    _croppedArea: Area,
    croppedPixels: Area,
  ) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleUpload = async () => {
    if (!imageUrl || !croppedAreaPixels || uploading) return;

    setUploading(true);
    setError("");

    try {
      const croppedBlob = await createCroppedImage(
        imageUrl,
        croppedAreaPixels,
      );

      const formData = new FormData();

      formData.append(
        "photo",
        croppedBlob,
        "profile-photo.jpg",
      );

      const response = await fetch(
        `${API_URL}/api/auth/profile/photo`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      const payload = await response.json();

      const user = payload?.user ?? payload?.data?.user;

      if (
        !response.ok ||
        payload.success !== true ||
        !user?.profileImage
      ) {
        throw new Error(
          payload.message || "Unable to upload your profile photo.",
        );
      }

      onUploaded(String(user.profileImage));
      setModalOpen(false);
      setImageUrl("");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload your photo. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentImage || removing) return;

    if (!window.confirm("Are you sure you want to remove your profile photo?")) {
      return;
    }

    setRemoving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/auth/profile/photo`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const payload = await response.json();

      if (!response.ok || payload.success !== true) {
        throw new Error(
          payload.message || "Unable to remove your profile photo.",
        );
      }

      onRemoved();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove your photo.",
      );
    } finally {
      setRemoving(false);
    }
  };

  const closeModal = () => {
    if (uploading) return;

    setModalOpen(false);
    setError("");
    setImageUrl("");
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <div className="relative h-full w-full overflow-hidden rounded-full bg-[var(--gold)]">
          {currentImage ? (
            <Image
              src={currentImage}
              alt="Profile photo"
              fill
              unoptimized
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
              {initials}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
          aria-label="Upload profile photo"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--background)] bg-[var(--foreground)] text-[var(--background)] shadow-md transition hover:opacity-80 disabled:opacity-50"
        >
          <Camera size={13} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium transition hover:bg-[var(--surface)] disabled:opacity-50"
        >
          <Upload size={13} />
          {currentImage ? "Change photo" : "Upload photo"}
        </button>

        {currentImage && (
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={uploading || removing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {removing ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            Remove
          </button>
        )}
      </div>

      {error && !modalOpen && (
        <p className="max-w-xs text-center text-xs text-red-500">
          {error}
        </p>
      )}

      {modalOpen && imageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
              <div>
                <h3 className="text-base font-semibold">
                  Adjust profile photo
                </h3>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Drag to reposition and zoom to adjust.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={uploading}
                aria-label="Close crop editor"
                className="rounded-lg p-2 transition hover:bg-[var(--surface)] disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="relative h-80 w-full bg-black">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                restrictPosition
              />
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <ZoomIn
                  size={17}
                  className="shrink-0 text-[var(--muted-foreground)]"
                />

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(event) =>
                    setZoom(Number(event.target.value))
                  }
                  disabled={uploading}
                  className="w-full accent-[var(--gold)]"
                  aria-label="Zoom profile photo"
                />

                <span className="w-10 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                  {zoom.toFixed(1)}x
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2.5 text-xs font-medium transition hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={uploading}
                    className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-xs font-medium transition hover:bg-[var(--surface)] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleUpload()}
                    disabled={uploading || !croppedAreaPixels}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2.5 text-xs font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <LoaderCircle size={14} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        Save photo
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <p className="text-center text-[11px] text-[var(--muted-foreground)]">
                JPG, PNG or WebP · Maximum 7 MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
