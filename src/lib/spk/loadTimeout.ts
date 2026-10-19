// Bound SPK reads so a stalled connection cannot leave the document loading forever.
export async function withSpkLoadTimeout<T>(request: PromiseLike<T>, timeoutMs = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Koneksi terlalu lama. Silakan coba lagi.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}