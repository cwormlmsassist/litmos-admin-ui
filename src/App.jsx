import { useState } from "react";

const CATALYST_DELETE_URL =
  "https://litmos-admin-jobs-7006227804.development.catalystserverless.com.au/server/bulkDeleteUsers/";

function App() {
  const [jobName, setJobName] = useState("ui_bulk_delete");
  const [rawIds, setRawIds] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runDelete = async () => {
    setError(null);
    setResult(null);

    const userIds = rawIds
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);

    if (userIds.length === 0) {
      setError("Paste at least one user ID.");
      return;
    }

    setRunning(true);

    try {
      const res = await fetch(CATALYST_DELETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobName,
          userIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Litmos Bulk Delete (Admin)</h1>

      <label>
        Job Name
        <br />
        <input
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />
      </label>

      <label>
        User IDs (one per line)
        <br />
        <textarea
          rows={12}
          value={rawIds}
          onChange={(e) => setRawIds(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
      </label>

      <br />

      <button
        onClick={runDelete}
        disabled={running}
        style={{ marginTop: 16, padding: "10px 20px" }}
      >
        {running ? "Running…" : "Run Delete Job"}
      </button>

      {error && (
        <pre style={{ color: "red", marginTop: 20 }}>{error}</pre>
      )}

      {result && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default App;
