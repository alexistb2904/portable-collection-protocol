const params = new URLSearchParams(location.search);

const request = {
  client_id: params.get("client_id"),
  redirect_uri: params.get("redirect_uri"),
  response_type: params.get("response_type"),
  scope: params.get("scope"),
  state: params.get("state"),
  code_challenge: params.get("code_challenge"),
  code_challenge_method: params.get("code_challenge_method"),
  subject_id: params.get("subject_id"),
  destination_account: params.get("destination_account"),
  export_hash: params.get("export_hash"),
};

const summary = document.querySelector("#summary");
const details = document.querySelector("#details");
const error = document.querySelector("#error");
const allow = document.querySelector("#allow");
const deny = document.querySelector("#deny");

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

try {
  const preview = await postJson("/api/collection-transfer/authorize/preview", request);
  summary.textContent = preview.clientHost + " is requesting one-time read access to your current collection.";
  details.textContent = "Your password is never shared. The destination receives a fresh signed collection only after you approve this request.";
  details.classList.remove("hidden");
  allow.disabled = false;
} catch (cause) {
  summary.textContent = "This authorization request cannot be accepted.";
  error.textContent = cause instanceof Error ? cause.message : "Invalid authorization request.";
  error.classList.remove("hidden");
}

allow.addEventListener("click", async () => {
  allow.disabled = true;
  deny.disabled = true;
  try {
    const result = await postJson("/api/collection-transfer/authorize", request);
    location.assign(result.redirectUrl);
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : "Authorization failed.";
    error.classList.remove("hidden");
    allow.disabled = false;
    deny.disabled = false;
  }
});

deny.addEventListener("click", () => {
  location.assign("/");
});
