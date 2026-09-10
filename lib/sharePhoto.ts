"use client";

// The one reliable way to get a photo out of this PWA and into the
// device's own photo library on iOS: <a download> is notoriously
// unreliable in Safari -- it frequently just opens the image in a new
// tab instead of offering to save it, especially once the app is
// installed to the home screen (exactly the setup this app is meant for).
// Where the browser supports sharing files at all (iOS Safari 15+,
// Android Chrome), the Web Share API invokes the real native share sheet,
// and "Save Image" / "Add to Photos" is one of its built-in targets --
// so that's the primary path, with the old download link kept as a
// fallback for browsers that don't support sharing files (desktop, mostly).
export async function shareOrDownloadPhoto(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      // The user dismissing the share sheet throws AbortError -- that's a
      // deliberate cancel, not a failure worth falling back to a download for.
      if (e instanceof Error && e.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
