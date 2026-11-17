// =============================================================================
// BACKEND – backend/src/index.ts
// -----------------------------------------------------------------------------
// Das ist euer Server. In C#-Welt entspricht das ungefähr einer
// ASP.NET Core "Minimal API" (Program.cs mit app.MapGet(...), app.MapPost(...)).
//
// Sprache: TypeScript = JavaScript + Typen (ähnlich wie C# typisiert ist).
// Laufzeit: Bun (wie "dotnet run", nur für JavaScript/TypeScript).
// Framework: Elysia (übernimmt die Rolle von ASP.NET Core).
// =============================================================================

// "import" = "using" in C#. Holt Klassen/Funktionen aus Paketen (Paket = NuGet-Paket).
import { cors } from "@elysiajs/cors"; // CORS-Middleware, wie app.UseCors() in ASP.NET
import { Elysia, t } from "elysia";    // Elysia = Web-Framework, t = Validierung (wie DataAnnotations)
import { SQL } from "bun";             // Datenbank-Client, eingebaut in Bun (vergleichbar mit Dapper)

// "type" definiert die Form eines Objekts – wie ein C# record:
//   public record Product(int Id, string Name, int Cost);
// Wichtig: Typen gibt es nur beim Programmieren. Zur Laufzeit sind sie weg.
type Product = { id: number; name: string; cost: number };

// Verbindung zur Datenbank. process.env.DATABASE_URL = Umgebungsvariable
// (in C#: Environment.GetEnvironmentVariable("DATABASE_URL")).
// Das "!" sagt TypeScript: "Ich verspreche, das ist nicht null" (wie "!" bei Nullable in C#).
const sql = new SQL(process.env.DATABASE_URL!, { allowPublicKeyRetrieval: true });

// Die Datenbank braucht beim Start manchmal ein paar Sekunden.
// Darum wird hier bis zu 60-mal versucht, die Tabelle anzulegen.
// for (let attempt = 1; ; attempt++) = Endlosschleife mit Zähler, wie in C#.
for (let attempt = 1; ; attempt++) {
  try {
    // sql`...` ist ein "Tagged Template": SQL-Text mit Platzhaltern.
    // Die ${...}-Werte werden automatisch als Parameter übergeben
    // → sicher gegen SQL-Injection (wie SqlParameter in C#).
    await sql`CREATE TABLE IF NOT EXISTS product (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      cost INT NOT NULL
    )`;
    break; // geklappt → Schleife verlassen
  } catch (error) {
    if (attempt === 60) throw error; // "===" = streng gleich (Wert UND Typ). In JS fast immer === statt == verwenden.
    console.log("Waiting for database..."); // = Console.WriteLine
    await Bun.sleep(1000);                   // = await Task.Delay(1000)
  }
}
// Hinweis zu "await": funktioniert wie in C#. Der Unterschied: In JS heißt das
// Gegenstück zu Task<T> "Promise<T>".

// Validierungs-Schema für den Request-Body von POST/PUT.
// Entspricht einer C#-Klasse mit [Required]-Attributen:
//   public class ProductBody { [Required] public string Name; [Required] public int Cost; }
// Schickt jemand falsche Daten, antwortet Elysia automatisch mit Fehler 422.
const ProductBody = t.Object({ name: t.String(), cost: t.Integer() });

// =============================================================================
// Produkt-Routen  →  /api/product
// -----------------------------------------------------------------------------
// Alle Routen hier beginnen mit "/api/product" (prefix).
// Die Methoden werden "verkettet" (.get().post()...) – das nennt man
// Fluent API, kennst du aus C# z. B. von LINQ oder builder.Services.Add...().
//
// Wichtig: Das ist nur eine Gruppe von Routen.
// Gestartet wird der Server erst ganz unten in der Haupt-App "app".
// =============================================================================
const products = new Elysia({ prefix: "/api/product" })
  // GET /api/product → alle Produkte als Liste zurückgeben.
  // [...x] ("Spread") kopiert das Ergebnis in ein normales Array
  // (ähnlich wie .ToList() in C#). Hier nötig, damit CORS-Header nicht verloren gehen.
  .get("/", async () => [...(await sql<Product[]>`SELECT id, name, cost FROM product ORDER BY id`)])

  // POST /api/product → neues Produkt anlegen.
  // ({ body }) ist "Destructuring": holt die Eigenschaft "body" aus dem Parameter-Objekt.
  // In C# wäre das wie ([FromBody] ProductBody body).
  .post(
    "/",
    async ({ body }) => {
      const result = await sql`INSERT INTO product (name, cost) VALUES (${body.name}, ${body.cost})`;
      // { id: ..., ...body } = neues Objekt mit id + allen Feldern aus body
      // (wie "body with { Id = ... }" bei C#-records).
      return { id: Number(result.lastInsertRowid), ...body };
    },
    { body: ProductBody }, // Validierung aktivieren
  )

  // PUT /api/product/:id → Produkt ändern. ":id" = Routenparameter, wie {id} in C#.
  .put(
    "/:id",
    async ({ params: { id }, body, status }) => {
      // const [product] = ... nimmt das erste Element der Liste (wie .FirstOrDefault()).
      const [product] = [...(await sql<Product[]>`SELECT id FROM product WHERE id = ${id}`)];
      // !product = "product ist null/undefined" → 404 zurückgeben (wie Results.NotFound()).
      if (!product) return status(404, { message: "Product does not exist" });

      await sql`UPDATE product SET name = ${body.name}, cost = ${body.cost} WHERE id = ${id}`;
      return { id, ...body };
    },
    // t.Numeric() wandelt den Text aus der URL in eine Zahl um (wie {id:int} in C#).
    { params: t.Object({ id: t.Numeric() }), body: ProductBody },
  )

  // DELETE /api/product/:id → Produkt löschen.
  .delete(
    "/:id",
    async ({ params: { id } }) => {
      await sql`DELETE FROM product WHERE id = ${id}`;
      return { message: "Product was deleted permanently from DB." };
    },
    { params: t.Object({ id: t.Numeric() }) },
  );

// =============================================================================
// Haupt-App  →  setzt alles zusammen und startet den Server
// -----------------------------------------------------------------------------
// Die Haupt-App hat KEIN Präfix. Warum?
// Elysia setzt das Präfix der Haupt-App auch vor alle eingehängten Gruppen.
// Hätte "app" das Präfix "/api/product", würde der Health-Endpoint bei
//   /api/product/api/v1/health   landen statt bei   /api/v1/health.
//
// Vergleich C# (Program.cs):
//   app.UseCors();
//   app.MapGet("/api/v1/health", () => new { status = "ok" });
//   app.MapGroup("/api/product")...;
//   app.Run();
// =============================================================================
const app = new Elysia()
  // CORS erlauben: Das Frontend läuft lokal auf Port 3000, das Backend auf 3001.
  // Browser blockieren Anfragen an einen anderen Port, außer der Server erlaubt es.
  .use(cors())

  // Health-Endpoint  →  GET /api/v1/health  →  Antwort: {"status":"ok"}
  // Die Lambda gibt ein Objekt zurück; Elysia macht daraus automatisch JSON
  // mit Statuscode 200 (wie Results.Ok(...) in ASP.NET).
  // Die runden Klammern um { ... } braucht man, damit JS das als Objekt
  // erkennt und nicht als Code-Block.
  .get("/api/v1/health", () => ({ status: "ok" }))

  // Produkt-Routen einhängen (wie app.MapGroup in C#).
  .use(products)  // → /api/product ...

  // Server starten. "??" funktioniert wie in C#: Nimm PORT, sonst 3001.
  // Entspricht app.Run("http://0.0.0.0:3001").
  .listen({ hostname: "0.0.0.0", port: Number(process.env.PORT ?? 3001) });

// Template-String mit Backticks `...${...}...` = String-Interpolation wie $"..." in C#.
// "?." ist der Null-Conditional-Operator, genau wie in C#.
console.log(`Server running on http://${app.server?.hostname}:${app.server?.port}`);
