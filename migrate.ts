import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pkg from 'pg';
const { Pool } = pkg;
// Import der Datenbankonfigurationsdatei mit dem fest definierten Connection-String
import { DB_CONNECTION_STRING } from "./server/config/db.config";

async function main() {
  // Direkten Connection-String verwenden statt Umgebungsvariablen
  const pool = new Pool({ connectionString: DB_CONNECTION_STRING });
  const db = drizzle(pool);

  console.log("Running migrations...");
  
  await migrate(db, { migrationsFolder: "migrations" });
  
  console.log("Migrations completed successfully!");
  
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});