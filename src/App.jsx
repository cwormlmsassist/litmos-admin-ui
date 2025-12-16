"use strict";

// Node 18+ has fetch built-in
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =======================
// CONFIG
// =======================
const LITMOS_BASE_URL = "https://api.litmos.com.au/v1.svc";
const RATE_DELAY_MS = parseInt(process.env.RATE_DELAY_MS || "700", 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "2", 10);

// =======================
// CORS
// =======================
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// =======================
// MAIN HANDLER
// =======================
module.exports = async (req, res) => {

  // ---- Preflight ----
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    // ---- Parse body ----
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const jobName = body?.jobName;
    const userIds = body?.userIds;

    if (!jobName || typeof jobName !== "string") {
      throw new Error("jobName is required");
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("userIds must be a non-empty array");
    }

    const apiKey = process.env.LITMOS_API_KEY;
    if (!apiKey) {
      throw new Error("Missing LITMOS_API_KEY");
    }

    const results = [];
    let deleted = 0;
    let failed = 0;

    // ---- Sequential delete with rate limiting ----
    for (const userId of userIds) {
      let attempt = 0;
      let success = false;
      let lastError = null;

      while (attempt <= MAX_RETRIES && !success) {
        attempt++;

        try {
          const response = await fetch(
            `${LITMOS_BASE_URL}/users/${encodeURIComponent(userId)}?source=catalyst_bulk_delete`,
            {
              method: "DELETE",
              headers: {
                apikey: apiKey,
              },
            }
          );

          if (response.status === 200 || response.status === 204) {
            success = true;
            deleted++;
            results.push({
              userId,
              status: "deleted",
            });
          } else {
            lastError = `HTTP ${response.status}`;
          }
        } catch (err) {
          lastError = err.message;
        }

        if (!success && attempt <= MAX_RETRIES) {
          await sleep(RATE_DELAY_MS);
        }
      }

      if (!success) {
        failed++;
        results.push({
          userId,
          status: "failed",
          reason: lastError,
        });
      }

      await sleep(RATE_DELAY_MS);
    }

    // ---- Final response ----
    const responseBody = {
      status: "completed",
      jobName,
      totals: {
        requested: userIds.length,
        deleted,
        failed,
      },
      results,
    };

    res.writeHead(200, {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify(responseBody));

  } catch (err) {
    res.writeHead(400, {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ error: err.message }));
  }
};
