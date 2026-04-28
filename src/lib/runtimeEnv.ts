export const isEmbeddedPreview = () => {
  if (typeof window === "undefined") return false;

  const host = window.location.hostname;

  let insideFrame = false;
  try {
    insideFrame = window.self !== window.top;
  } catch {
    insideFrame = true;
  }

  return (
    insideFrame ||
    host.includes("id-preview--") ||
    host.includes("lovableproject.com")
  );
};