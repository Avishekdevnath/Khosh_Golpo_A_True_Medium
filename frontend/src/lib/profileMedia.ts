export type SignedProfileMediaUpload = {
  kind: "avatar" | "banner";
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;
  public_id: string;
  signature: string;
  upload_url: string;
  overwrite: boolean;
};

export type UploadedProfileMedia = {
  secure_url: string;
  public_id: string;
};

export const MAX_PROFILE_MEDIA_BYTES = 5 * 1024 * 1024;
export const PROFILE_MEDIA_ACCEPT = "image/png,image/jpeg,image/webp";

const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateProfileMediaFile(file: File): void {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("Please choose a PNG, JPG, or WEBP image.");
  }
  if (file.size > MAX_PROFILE_MEDIA_BYTES) {
    throw new Error("Please choose an image smaller than 5MB.");
  }
}

export async function uploadProfileMedia(
  file: File,
  signedUpload: SignedProfileMediaUpload,
): Promise<UploadedProfileMedia> {
  validateProfileMediaFile(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signedUpload.api_key);
  formData.append("timestamp", String(signedUpload.timestamp));
  formData.append("folder", signedUpload.folder);
  formData.append("public_id", signedUpload.public_id);
  formData.append("signature", signedUpload.signature);
  formData.append("overwrite", signedUpload.overwrite ? "true" : "false");

  const response = await fetch(signedUpload.upload_url, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Failed to upload image.");
  }

  if (!payload.secure_url || !payload.public_id) {
    throw new Error("Cloudinary upload response was incomplete.");
  }

  return {
    secure_url: payload.secure_url,
    public_id: payload.public_id,
  };
}
