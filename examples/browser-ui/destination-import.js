const fileInput = document.querySelector("#file");
const start = document.querySelector("#start");
const error = document.querySelector("#error");

start.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  error.classList.add("hidden");

  if (file.size > 8 * 1024 * 1024) {
    error.textContent = "The selected file exceeds the 8 MiB example limit.";
    error.classList.remove("hidden");
    return;
  }

  start.disabled = true;
  try {
    const exported = JSON.parse(await file.text());
    const response = await fetch("/api/collection/import/start", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(exported),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Import verification failed");
    location.assign(result.authorizationUrl);
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : "Unable to read this export.";
    error.classList.remove("hidden");
    start.disabled = false;
  }
});
