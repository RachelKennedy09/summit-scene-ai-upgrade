// Browsing and category fallbacks work without JavaScript. This handles only
// remote photos that fail after the server has rendered their URL.
document.querySelectorAll("img[data-fallback-src]").forEach((image) => {
  function useFallback() {
    const fallback = image.getAttribute("data-fallback-src");
    const caption = image.closest("figure")?.querySelector("figcaption");
    if (caption) caption.hidden = false;
    if (image.getAttribute("src") === fallback) {
      image.hidden = true;
      return;
    }
    image.removeAttribute("srcset");
    image.src = fallback;
    if (image.alt) image.alt = "Event category illustration";
  }
  image.addEventListener("error", useFallback);
  // Cached failures can happen before a deferred script attaches its listener.
  if (image.complete && image.naturalWidth === 0) useFallback();
});
