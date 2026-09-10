import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  deletePhoto,
  getStorageWarning,
  listPhotos,
  readPhotoFile,
  savePhoto,
} from "@/lib/photoStore.server";
import { NEUTRAL_ADJUSTMENTS, SavedPhotoMeta } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// GET /api/photos            -> { items: SavedPhotoMeta[] } for the gallery
// GET /api/photos?id=…&raw=1 -> the JPEG/PNG bytes themselves
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const raw = req.nextUrl.searchParams.get("raw");

  if (id && raw) {
    if (!ID_PATTERN.test(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
    const file = await readPhotoFile(id);
    if (!file) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.ext === "png" ? "image/png" : "image/jpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  }

  const items = await listPhotos();
  return NextResponse.json({ items, storageWarning: getStorageWarning() });
}

// POST multipart/form-data: file=<blob>, meta=<json: {width,height,presetId,adjustments}>
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const metaRaw = form.get("meta");
  if (!(file instanceof Blob) || typeof metaRaw !== "string") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  let parsed: Partial<Pick<SavedPhotoMeta, "width" | "height" | "presetId" | "adjustments">>;
  try {
    parsed = JSON.parse(metaRaw);
  } catch {
    return NextResponse.json({ error: "Métadonnées invalides" }, { status: 400 });
  }

  const id = randomUUID();
  const ext = file.type === "image/png" ? "png" : "jpg";
  const buffer = Buffer.from(await file.arrayBuffer());

  const meta: SavedPhotoMeta = {
    id,
    createdAt: new Date().toISOString(),
    width: typeof parsed.width === "number" ? parsed.width : 0,
    height: typeof parsed.height === "number" ? parsed.height : 0,
    presetId: parsed.presetId ?? null,
    adjustments: parsed.adjustments ?? NEUTRAL_ADJUSTMENTS,
  };

  await savePhoto(id, buffer, ext, meta);
  return NextResponse.json({ item: meta });
}

// DELETE /api/photos?id=…
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }
  await deletePhoto(id);
  return NextResponse.json({ ok: true });
}
