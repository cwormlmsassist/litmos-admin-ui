import { useState } from "react";

export default function App() {
  const [jobName, setJobName] = useState("ui_bulk_delete");
  const [userText, setUserText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDelete = async () => {
    setError(null);
    setResult(null);

    const userIds = userText
      .split("\n")
      .map(v => v.trim())
      .filter(Boolean);

    if (userIds.length === 0) {
      setError("No user IDs provided");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        import.meta.env.VITE_CATALYST_FUNCTION_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobName, userIds })
        }
      );

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Failed to call delete service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>Litmos Bulk Delete (Admin)</h1>

      <label>Job Name</label><br />
      <input
        value={jobName}
        onChange={e => setJobName(e.target.value)}
        style={{ width: 400 }}
      /><br /><br />

      <label>User IDs (one per line)</label><br />
      <textarea
        rows={12}
        cols={60}
        value={userText}
        onChange={e => setUserText(e.target.value)}
      /><br /><br />

      <button onClick={runDelete} disabled={loading}>
        {loading ? "Running…" : "Run Delete Job"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
