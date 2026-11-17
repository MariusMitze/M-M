
import { useState, useEffect } from "react";


import { getProducts, createProduct, updateProduct, deleteProduct, getHealth } from "./api";


import ProductForm from "./ProductForm";
import ProductTable from "./ProductTable";


export default function App() {
  
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

      
      {health && <p>Status: {health.toUpperCase()}</p>}

     
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
