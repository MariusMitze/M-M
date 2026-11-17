// =============================================================================
// FRONTEND – frontend/src/App.jsx
// -----------------------------------------------------------------------------
// Das ist die Hauptkomponente der Seite – vergleichbar mit Index.razor in Blazor.
//
// ".jsx" = JavaScript, in dem man HTML-ähnlichen Code direkt schreiben darf.
// Das ist das Gegenstück zu .razor-Dateien. Der Unterschied:
//   - In Blazor:  HTML oben, C#-Code im @code { } Block unten.
//   - In React:   Alles ist EINE Funktion. Logik oben, das HTML steht im "return".
//
// Eine React-Komponente ist einfach eine Funktion, die HTML (JSX) zurückgibt.
// React ruft diese Funktion bei jeder Änderung NEU auf, um die Seite neu zu
// zeichnen (wie StateHasChanged() in Blazor, nur passiert das automatisch).
// =============================================================================

// useState und useEffect sind sogenannte "Hooks" – spezielle React-Funktionen.
// Erklärung siehe unten, wo sie benutzt werden.
import { useState, useEffect } from "react";

// Funktionen aus api.js importieren (wie @inject ProductService in Blazor).
// NEU: getHealth dazu importiert.
import { getProducts, createProduct, updateProduct, deleteProduct, getHealth } from "./api";

// Andere Komponenten importieren. In Blazor sind Komponenten automatisch
// verfügbar, in React muss man jede einzeln importieren.
import ProductForm from "./ProductForm";
import ProductTable from "./ProductTable";

// "export default" = das ist die Hauptsache, die diese Datei anbietet.
// main.jsx importiert App und zeigt sie auf der Seite an.
export default function App() {
  // ---------------------------------------------------------------------------
  // STATE (Zustand) – die "Felder" der Komponente
  // ---------------------------------------------------------------------------
  // In Blazor schreibst du im @code-Block:
  //     private List<Product> products = new();
  // und änderst das Feld direkt: products = data;
  //
  // In React geht das NICHT direkt, weil die Funktion bei jedem Neuzeichnen
  // neu läuft und normale Variablen dabei verloren gehen. Stattdessen:
  //     const [wert, setWert] = useState(startwert);
  //   - wert     = aktueller Wert (nur lesen!)
  //   - setWert  = Funktion zum Ändern. Ruft man sie auf, merkt sich React den
  //                neuen Wert UND zeichnet die Seite automatisch neu.
  // Die Schreibweise [a, b] = ... heißt "Destructuring" (wie Tuple-Deconstruction
  // in C#: var (a, b) = ...).
  const [products, setProducts] = useState([]);             // Produktliste, am Anfang leer
  const [editingProduct, setEditingProduct] = useState(null); // gerade bearbeitetes Produkt

  // NEU: Hier speichern wir den Status vom Health-Endpoint ("ok").
  // null = noch keine Antwort da.
  const [health, setHealth] = useState(null);

  // ---------------------------------------------------------------------------
  // Hilfsfunktion: Produkte vom Backend laden
  // ---------------------------------------------------------------------------
  // Funktionen innerhalb der Komponente = private Methoden im @code-Block.
  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data); // State ändern → React zeichnet die Tabelle neu
    } catch (e) {
      console.error("Failed to load products:", e);
    }
  }

  // ---------------------------------------------------------------------------
  // useEffect – Code, der NACH dem Anzeigen ausgeführt wird
  // ---------------------------------------------------------------------------
  // Das ist das Gegenstück zu OnInitializedAsync() in Blazor.
  //
  // useEffect(funktion, [abhängigkeiten])
  //   - Das leere Array [] am Ende bedeutet: "Nur EINMAL ausführen, wenn die
  //     Komponente zum ersten Mal angezeigt wird."
  //   - Würde man [] weglassen, liefe der Code nach JEDEM Neuzeichnen
  //     → Endlosschleife, weil setProducts wieder ein Neuzeichnen auslöst!
  useEffect(() => {
    loadProducts();
  }, []);

  // NEU: Beim Start einmal den Health-Endpoint abfragen.
  // .then(...) ist eine andere Schreibweise für await:
  //   "Wenn die Antwort da ist, mach Folgendes damit."
  // data ist das Objekt { status: "ok" }, also speichern wir data.status.
  // .catch(...) fängt Fehler ab (z. B. Backend nicht erreichbar).
  useEffect(() => {
    getHealth()
      .then((data) => setHealth(data.status))
      .catch((e) => console.error("Health check failed:", e));
  }, []);

  // ---------------------------------------------------------------------------
  // Event-Handler – werden von den Kind-Komponenten aufgerufen
  // ---------------------------------------------------------------------------
  // Entspricht Methoden, die man in Blazor per EventCallback an Kinder übergibt.
  async function handleCreate(product) {
    await createProduct(product);
    loadProducts(); // Liste neu laden, damit das neue Produkt erscheint
  }

  async function handleUpdate(id, product) {
    await updateProduct(id, product);
    setEditingProduct(null); // Bearbeiten-Modus beenden
    loadProducts();
  }

  async function handleDelete(id) {
    await deleteProduct(id);
    loadProducts();
  }

  // ---------------------------------------------------------------------------
  // RENDER – das HTML der Komponente
  // ---------------------------------------------------------------------------
  // Alles im return ist JSX. Unterschiede zu Razor:
  //   - C#-Ausdruck in Razor:   @variable
  //     JS-Ausdruck in JSX:     {variable}
  //   - "class" heißt in JSX "className" (weil class in JS ein Schlüsselwort ist).
  //   - Es muss genau EIN äußerstes Element geben (hier das <div>).
  return (
    <div>
      <h1>Think different Academy!</h1>

      {/* NEU: Health-Status anzeigen.
          Kommentare im JSX schreibt man so: {/* ... *\/}

          {health && <p>...</p>} bedeutet: "Nur anzeigen, wenn health einen Wert hat."
          Das ist das Gegenstück zu Razor:
              @if (health != null) { <p>Status: @health.ToUpper()</p> }

          .toUpperCase() = .ToUpper() in C#. Aus "ok" wird "OK",
          weil die Aufgabe genau "Status: OK" verlangt. */}
      {health && <p>Status: {health.toUpperCase()}</p>}

      {/* Kind-Komponente mit "Props" (= [Parameter] in Blazor).
          onSubmit={...} ist wie OnSubmit="..." in Blazor.

          bedingung ? a : b ist der Ternary-Operator, gleich wie in C#.
          (p) => handleUpdate(...) ist eine Lambda, gleich wie in C#. */}
      <ProductForm
        onSubmit={editingProduct ? (p) => handleUpdate(editingProduct.id, p) : handleCreate}
        initial={editingProduct}
        onCancel={editingProduct ? () => setEditingProduct(null) : null}
      />

      {/* Tabelle bekommt die Liste und zwei Callback-Funktionen.
          onEdit={setEditingProduct}: Klickt man in der Tabelle auf "Bearbeiten",
          wird setEditingProduct(produkt) aufgerufen → Formular wechselt in den
          Bearbeiten-Modus. */}
      <ProductTable
        products={products}
        onEdit={setEditingProduct}
        onDelete={handleDelete}
      />
    </div>
  );
}
