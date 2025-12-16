"use strict";

const https = require("https");

const RATE_DELAY_MS = Number(process.env.RATE_DELAY_MS || 700);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);
const LITMOS_API_KEY = process.env.LITMOS_API_KEY;
const LITMOS_BASE_URL = "https://api.litmos.com.au/v1.svc/users";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function deleteUser(userId, attempt = 1) {
  return new Promise((resolve) => {
    const req = https.request(
      `${LITMOS_BASE_URL}/${userId}?source=bulk_delete`,
      {
        method: "DELETE",
        headers: {
          "apikey": LITMOS_API_KEY,
          "Content-Type": "application/json"
        }
      },
      res => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          resolve({ userId, status: "deleted" });
        } else if (res.statusCode >= 500 && attempt <= MAX_RETRIES) {
          resolve(deleteUser(userId, attempt + 1));
        } else {
          resolve({
            userId,
            status: "failed",
            reason: `HTTP ${res.statusCode}`
          });
        }
      }
    );

    req.on("error", err => {
      if (attempt <= MAX_RETRIES) {
        resolve(deleteUser(userId, attempt + 1));
      } else {
        resolve({ userId, status: "failed", reason: err.message });
      }
    });

    req.end();
  });
}

module.exports = async (req, res) => {

  /* ---------- CORS ---------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  /* -------------------------- */

  if (req.method !== "POST") {
    res.writeHead(405);
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  let body = "";
  req.on("data", chunk => body += chunk);

  req.on("end", async () => {
    let payload;

    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    const { jobName, userIds } = payload;

    if (!jobName || !Array.isArray(userIds) || userIds.length === 0) {
      res.writeHead(400);
      return res.end(JSON.stringify({
        error: "job
