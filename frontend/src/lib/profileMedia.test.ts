import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PROFILE_MEDIA_BYTES,
  uploadProfileMedia,
  validateProfileMediaFile,
  type SignedProfileMediaUpload,
} from "./profileMedia";


function makeSignedUpload(kind: "avatar" | "banner" = "avatar"): SignedProfileMediaUpload {
  return {
    kind,
    cloud_name: "demo-cloud",
    api_key: "demo-key",
    timestamp: 1_700_000_000,
    folder: "khoshgolpo/profile-media",
    public_id: `user-1/${kind}`,
    signature: "signed-value",
    upload_url: "https://api.cloudinary.com/v1_1/demo-cloud/image/upload",
    overwrite: true,
  };
}


test("validateProfileMediaFile rejects unsupported image types", () => {
  const file = new File(["vector"], "avatar.svg", { type: "image/svg+xml" });

  assert.throws(
    () => validateProfileMediaFile(file),
    /PNG, JPG, or WEBP/,
  );
});


test("validateProfileMediaFile rejects oversized uploads", () => {
  const file = new File([new Uint8Array(MAX_PROFILE_MEDIA_BYTES + 1)], "banner.png", { type: "image/png" });

  assert.throws(
    () => validateProfileMediaFile(file),
    /5MB/,
  );
});


test("uploadProfileMedia posts the signed Cloudinary fields and returns normalized media data", async () => {
  const file = new File(["image-bits"], "avatar.png", { type: "image/png" });
  const signed = makeSignedUpload("avatar");
  const originalFetch = global.fetch;
  const request = {
    url: "",
    method: "",
    body: null as FormData | null,
  };

  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    request.url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    request.method = init?.method ?? "GET";
    request.body = init?.body as FormData;
    return new Response(
      JSON.stringify({
        secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/v123/avatar.png",
        public_id: "khoshgolpo/profile-media/user-1/avatar",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const result = await uploadProfileMedia(file, signed);

    assert.equal(request.url, signed.upload_url);
    assert.equal(request.method, "POST");
    assert.ok(request.body);
    assert.equal(request.body.get("api_key"), signed.api_key);
    assert.equal(request.body.get("timestamp"), String(signed.timestamp));
    assert.equal(request.body.get("folder"), signed.folder);
    assert.equal(request.body.get("public_id"), signed.public_id);
    assert.equal(request.body.get("signature"), signed.signature);
    assert.equal(request.body.get("overwrite"), "true");
    assert.equal(request.body.get("file"), file);
    assert.deepEqual(result, {
      secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/v123/avatar.png",
      public_id: "khoshgolpo/profile-media/user-1/avatar",
    });
  } finally {
    global.fetch = originalFetch;
  }
});


test("uploadProfileMedia surfaces Cloudinary failures", async () => {
  const file = new File(["image-bits"], "banner.png", { type: "image/png" });
  const signed = makeSignedUpload("banner");
  const originalFetch = global.fetch;

  global.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: "Invalid signature" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => uploadProfileMedia(file, signed),
      /Invalid signature/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});
