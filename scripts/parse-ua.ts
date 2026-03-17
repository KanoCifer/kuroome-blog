import { config } from "dotenv";
import { Client } from "pg";
import { UAParser } from "ua-parser-js";

config({ path: "../backend/.env" });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("Error: DATABASE_URL not found in ../backend/.env");
  process.exit(1);
}

const BATCH_SIZE = 100;
const parser = new UAParser();

interface VisitorTrack {
  id: number;
  browser: string;
}

interface ParsedUA {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  cpu: string;
  deviceType: string;
}

/**
 * Parse User-Agent string into structured data
 */
function parseUA(ua: string): ParsedUA {
  const result = parser.setUA(ua).getResult();

  return {
    browserName: result.browser.name || "",
    browserVersion: result.browser.version || "",
    osName: result.os.name || "",
    osVersion: result.os.version || "",
    cpu: result.cpu.architecture || "",
    deviceType: result.device.type || "desktop",
  };
}

/**
 * Process a batch of unprocessed UA records
 * @returns Number of records processed
 */
async function processBatch(client: Client): Promise<number> {
  const result = await client.query<VisitorTrack>(
    `SELECT id, browser 
     FROM visitor_track 
     WHERE browser != '' AND browser_name IS NULL 
     LIMIT $1`,
    [BATCH_SIZE],
  );

  const records = result.rows;
  if (records.length === 0) {
    return 0;
  }

  console.log(`Processing ${records.length} records...`);

  const updatePromises = records.map(async (record) => {
    try {
      const parsed = parseUA(record.browser);

      await client.query(
        `UPDATE visitor_track 
         SET browser_name = $1, browser_version = $2, os_name = $3, os_version = $4, cpu = $5, device_type = $6 
         WHERE id = $7`,
        [
          parsed.browserName,
          parsed.browserVersion,
          parsed.osName,
          parsed.osVersion,
          parsed.cpu,
          parsed.deviceType,
          record.id,
        ],
      );
    } catch (error) {
      console.error(`Error processing record ${record.id}:`, error);
    }
  });

  await Promise.all(updatePromises);
  return records.length;
}

/**
 * Main execution function
 */
async function main() {
  const client = new Client({
    connectionString: DB_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database successfully");

    let totalProcessed = 0;
    let processedInBatch: number;

    do {
      processedInBatch = await processBatch(client);
      totalProcessed += processedInBatch;
      console.log(`Processed ${totalProcessed} records so far...`);
    } while (processedInBatch > 0);

    console.log(
      `\nProcessing complete! Total records processed: ${totalProcessed}`,
    );

    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(browser_name) as processed,
        COUNT(*) - COUNT(browser_name) as remaining
      FROM visitor_track
    `);

    console.log("\nStatistics:");
    console.log(`Total records: ${stats.rows[0].total}`);
    console.log(`Processed records: ${stats.rows[0].processed}`);
    console.log(`Remaining records: ${stats.rows[0].remaining}`);
  } catch (error) {
    console.error("Error during processing:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

main().catch(console.error);
