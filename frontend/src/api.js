// =============================================================================
// FRONTEND – frontend/src/api.js
// -----------------------------------------------------------------------------
// Diese Datei sammelt alle Aufrufe ans Backend an einer Stelle.
// In Blazor würdest du dafür einen Service schreiben, der HttpClient benutzt
// (z. B. ProductService mit Http.GetFromJsonAsync<...>(...)).
//
// Unterschied: Hier gibt es keine Klasse und keine Dependency Injection.
// Es sind einfach lose Funktionen, die mit "export" für andere Dateien
// freigegeben werden (ähnlich wie "public").
//
// Diese Datei ist reines JavaScript (keine Typen), deshalb steht nirgends
// "string" oder "int".
// =============================================================================

// Basis-Adresse der API.
// import.meta.env.VITE_API_URL liest einen Wert aus frontend/.env
// (vergleichbar mit appsettings.json in Blazor).
// "??" = Fallback, falls der Wert fehlt – wie in C#.
// const = Variable, die nicht neu zugewiesen werden kann (wie readonly / const in C#).
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

// -----------------------------------------------------------------------------
// NEU: Health-Endpoint abfragen  →  GET /api/v1/health
// -----------------------------------------------------------------------------
// "async function" = async Methode in C#. Sie gibt automatisch ein Promise zurück
// (Promise in JS = Task in C#).
//
// Blazor-Vergleich:
//   public async Task<HealthDto> GetHealth()
//       => await Http.GetFromJsonAsync<HealthDto>("api/v1/health");
export async function getHealth() {
  // fetch() = HttpClient.GetAsync(). Ohne weitere Angaben ist das ein GET-Request.
  // `${API_URL}/v1/health` = String-Interpolation, wie $"{API_URL}/v1/health" in C#.
  // Achtung: API_URL endet schon auf "/api" → hier NICHT nochmal "/api" anhängen.
  const res = await fetch(`${API_URL}/v1/health`);

  // res.json() liest den Body und wandelt JSON in ein JS-Objekt um
  // (= JsonSerializer.Deserialize). Ergebnis hier: { status: "ok" }.
  return res.json();
}

// -----------------------------------------------------------------------------
// Bestehende Produkt-Funktionen
// -----------------------------------------------------------------------------

// GET /api/product → Liste aller Produkte.
export async function getProducts() {
  const res = await fetch(`${API_URL}/product`);
  return res.json();
}

// POST /api/product → Produkt anlegen.
// Bei fetch gibt man Methode, Header und Body in einem Options-Objekt an
// (in C#: Http.PostAsJsonAsync("api/product", product)).
export async function createProduct(product) {
  const res = await fetch(`${API_URL}/product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // "Ich schicke JSON"
    body: JSON.stringify(product), // Objekt → JSON-Text (= JsonSerializer.Serialize)
  });
  return res.json();
}

// PUT /api/product/:id → Produkt ändern.
export async function updateProduct(id, product) {
  const res = await fetch(`${API_URL}/product/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  // Wichtig: fetch wirft bei 404 oder 500 KEINEN Fehler (anders als
  // EnsureSuccessStatusCode() in C#). Den Statuscode muss man selbst prüfen.
  if (res.status === 404) {
    const err = await res.json();
    throw new Error(err.message); // throw new Exception(...) in C#
  }
  return res.json();
}

// DELETE /api/product/:id → Produkt löschen.
export async function deleteProduct(id) {
  const res = await fetch(`${API_URL}/product/${id}`, {
    method: "DELETE",
  });
  return res.json();
}
