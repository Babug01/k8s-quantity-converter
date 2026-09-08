import { useMemo, useState } from "react";
import Header from "./components/Header";

const REPO_URL = "https://github.com/Babug01/k8s-quantity-converter";

// Kubernetes resource.Quantity suffix grammar (apimachinery pkg/api/resource):
// binarySI  ::= Ki | Mi | Gi | Ti | Pi | Ei          (powers of 1024)
// decimalSI ::= n | u | m | "" | k | M | G | T | P | E (powers of 10)
// decimalExponent ::= "e"/"E" + signed int, standing on its own as the whole
// suffix (you can't combine "1e9Ki" — the grammar only allows one or the
// other). Verified against real values before writing this in: "500m" CPU ->
// 0.5 cores, "128Mi" -> 134217728 bytes, "1" CPU -> 1 core, "1e9" -> 1e9,
// "2.5Gi" -> 2684354560 bytes, and a garbage suffix like "128Xi" correctly
// errors instead of silently returning NaN.
export const SUFFIX_MULTIPLIERS = {
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  "": 1,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
  Ki: 2 ** 10,
  Mi: 2 ** 20,
  Gi: 2 ** 30,
  Ti: 2 ** 40,
  Pi: 2 ** 50,
  Ei: 2 ** 60,
};

const BINARY_SUFFIXES = new Set(["Ki", "Mi", "Gi", "Ti", "Pi", "Ei"]);
const DECIMAL_SI_SUFFIXES = new Set(["n", "u", "m", "", "k", "M", "G", "T", "P", "E"]);

export function parseQuantity(raw) {
  const str = String(raw).trim();
  if (!str) throw new Error("Enter a quantity");

  // decimalExponent form: a bare number followed by e/E and a signed int,
  // with NO further suffix — this is its own grammar branch, not a mantissa
  // you then also multiply by a unit suffix.
  const sci = str.match(/^([+-]?(?:\d+\.?\d*|\.\d+))[eE]([+-]?\d+)$/);
  if (sci) {
    const mantissa = parseFloat(sci[1]);
    const exponent = parseInt(sci[2], 10);
    return { value: mantissa * 10 ** exponent, suffix: `e${sci[2]}`, kind: "decimalExponent" };
  }

  const m = str.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\s*(.*)$/);
  if (!m) throw new Error(`"${str}" doesn't look like a Kubernetes quantity`);
  const [, numStr, suffixRaw] = m;
  const suffix = suffixRaw.trim();
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) throw new Error(`"${str}" doesn't look like a Kubernetes quantity`);

  if (!(suffix in SUFFIX_MULTIPLIERS)) {
    throw new Error(
      `Unrecognized suffix "${suffix}" — expected one of n, u, m, (none), k, M, G, T, P, E, Ki, Mi, Gi, Ti, Pi, Ei, or scientific notation like 1e9`
    );
  }
  return { value: num * SUFFIX_MULTIPLIERS[suffix], suffix, kind: BINARY_SUFFIXES.has(suffix) ? "binarySI" : "decimalSI" };
}

function trimNum(n, digits = 6) {
  if (!Number.isFinite(n)) return String(n);
  const fixed = n.toFixed(digits);
  return fixed.replace(/\.?0+$/, "") || "0";
}

function bytesToHumanBinary(bytes) {
  const order = ["Ei", "Pi", "Ti", "Gi", "Mi", "Ki"];
  const abs = Math.abs(bytes);
  for (const u of order) {
    const mult = SUFFIX_MULTIPLIERS[u];
    if (abs >= mult) return `${trimNum(bytes / mult, 4)} ${u}`;
  }
  return `${trimNum(bytes, 0)} (bytes)`;
}

function bytesToHumanDecimal(bytes) {
  const order = ["E", "P", "T", "G", "M", "k"];
  const abs = Math.abs(bytes);
  for (const u of order) {
    const mult = SUFFIX_MULTIPLIERS[u];
    if (abs >= mult) return `${trimNum(bytes / mult, 4)} ${u}`;
  }
  return `${trimNum(bytes, 0)} (bytes)`;
}

const styles = {
  root: { minHeight: "100dvh", display: "flex", flexDirection: "column" },
  content: { fontFamily: "system-ui, sans-serif", padding: "24px 32px", maxWidth: 820, margin: "0 auto", color: "var(--text, #1a1a1a)", width: "100%", boxSizing: "border-box", background: "var(--bg-subtle, #f0efed)", flex: 1 },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, opacity: 0.6, margin: "4px 0 20px" },
  tabs: { display: "flex", gap: 8, marginBottom: 20 },
  tabBtn: (active) => ({
    padding: "8px 16px", borderRadius: 8, border: active ? "none" : "1px solid var(--border, #e5e7eb)",
    background: active ? "var(--accent, #4f46e5)" : "transparent", color: active ? "#fff" : "var(--text, #1a1a1a)",
    cursor: "pointer", fontSize: 13, fontWeight: 600,
  }),
  gotcha: {
    padding: "10px 14px", borderRadius: 8, border: "1px solid #e0a05c", background: "rgba(224,160,92,0.1)",
    color: "#c97f2e", fontSize: 12.5, marginBottom: 18, lineHeight: 1.5,
  },
  row: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  input: {
    padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border, #e5e7eb)",
    background: "var(--input-bg, #f9fafb)", color: "var(--text, #1a1a1a)", fontSize: 15, flex: 1, minWidth: 220,
    fontFamily: "'SFMono-Regular', Consolas, monospace",
  },
  errorBox: {
    padding: 14, borderRadius: 8, border: "1px solid #e05c5c", background: "rgba(224,92,92,0.08)",
    color: "#e05c5c", fontSize: 13, marginBottom: 20,
  },
  resultGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 20 },
  card: { background: "var(--input-bg, #f9fafb)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: "12px 14px" },
  cardLabel: { fontSize: 11, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 },
  cardValue: { fontSize: 15, fontWeight: 600, fontFamily: "'SFMono-Regular', Consolas, monospace", wordBreak: "break-all" },
  plainLine: {
    padding: "12px 16px", borderRadius: 8, background: "rgba(79,70,229,0.08)", color: "var(--text, #1a1a1a)",
    fontSize: 14, marginBottom: 20,
  },
  sectionTitle: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6, marginBottom: 10 },
  legendTable: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  legendTh: { textAlign: "left", padding: "4px 8px 4px 0", opacity: 0.5, fontWeight: 600, textTransform: "uppercase", fontSize: 10 },
  legendTd: { padding: "6px 8px 6px 0", fontFamily: "'SFMono-Regular', Consolas, monospace", verticalAlign: "top" },
  examples: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  exampleChip: {
    padding: "5px 12px", borderRadius: 20, border: "1px solid var(--border, #e5e7eb)", background: "transparent",
    color: "var(--text, #1a1a1a)", cursor: "pointer", fontSize: 12, fontFamily: "'SFMono-Regular', Consolas, monospace",
  },
};

function ResultCard({ label, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function CpuTab() {
  const [input, setInput] = useState("500m");
  const parsed = useMemo(() => {
    try {
      return { data: parseQuantity(input), error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }, [input]);

  const cores = parsed.data?.value;
  const plain =
    cores == null
      ? ""
      : cores === 1
      ? "That's exactly 1 full CPU core."
      : cores < 1
      ? `That's ${trimNum(cores * 1000, 2)} millicores — ${trimNum(cores * 100, 4)}% of one core.`
      : `That's ${trimNum(cores, 4)} cores — enough to fully use ${Math.floor(cores)} core${Math.floor(cores) === 1 ? "" : "s"}${cores % 1 !== 0 ? ` plus ${trimNum((cores % 1) * 1000, 0)}m more` : ""}.`;

  return (
    <div>
      <div style={styles.examples}>
        {["500m", "1", "2500m", "100n", "0.1", "2"].map((ex) => (
          <button key={ex} style={styles.exampleChip} onClick={() => setInput(ex)}>{ex}</button>
        ))}
      </div>
      <div style={styles.row}>
        <input style={styles.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. 500m, 2, 100n" spellCheck={false} />
      </div>
      {parsed.error && <div style={styles.errorBox}>{parsed.error}</div>}
      {parsed.data && (
        <>
          <div style={styles.resultGrid}>
            <ResultCard label="Raw base unit" value={`${trimNum(cores, 9)} cores`} />
            <ResultCard label="Cores" value={trimNum(cores, 6)} />
            <ResultCard label="Millicores" value={`${trimNum(cores * 1000, 3)}m`} />
            <ResultCard label="Nanocores" value={trimNum(cores * 1e9, 0)} />
          </div>
          <div style={styles.plainLine}>{plain}</div>
        </>
      )}
    </div>
  );
}

function MemoryTab() {
  const [input, setInput] = useState("128Mi");
  const parsed = useMemo(() => {
    try {
      return { data: parseQuantity(input), error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }, [input]);

  const bytes = parsed.data?.value;
  const plain =
    bytes == null ? "" : `That's ${bytes.toLocaleString()} bytes — roughly ${bytesToHumanBinary(bytes)}B (${bytesToHumanDecimal(bytes)}B decimal).`;

  return (
    <div>
      <div style={styles.examples}>
        {["128Mi", "1Gi", "512M", "2Gi", "256Ki", "1e9"].map((ex) => (
          <button key={ex} style={styles.exampleChip} onClick={() => setInput(ex)}>{ex}</button>
        ))}
      </div>
      <div style={styles.row}>
        <input style={styles.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. 128Mi, 1Gi, 512M" spellCheck={false} />
      </div>
      {parsed.error && <div style={styles.errorBox}>{parsed.error}</div>}
      {parsed.data && (
        <>
          <div style={styles.resultGrid}>
            <ResultCard label="Raw base unit" value={`${bytes.toLocaleString()} bytes`} />
            <ResultCard label="Binary (IEC)" value={`${bytesToHumanBinary(bytes)}B`} />
            <ResultCard label="Decimal (SI)" value={`${bytesToHumanDecimal(bytes)}B`} />
            <ResultCard label="Mebibytes" value={`${trimNum(bytes / SUFFIX_MULTIPLIERS.Mi, 4)} Mi`} />
            <ResultCard label="Gibibytes" value={`${trimNum(bytes / SUFFIX_MULTIPLIERS.Gi, 4)} Gi`} />
          </div>
          <div style={styles.plainLine}>{plain}</div>
        </>
      )}
    </div>
  );
}

const SUFFIX_LEGEND = [
  { suffix: "n", meaning: "nano — ×10⁻⁹ (CPU only, in practice: nanocores)" },
  { suffix: "u", meaning: "micro — ×10⁻⁶" },
  { suffix: "m", meaning: "milli — ×10⁻³ (500m CPU = half a core)" },
  { suffix: "(none)", meaning: "×1 — whole cores for CPU, bytes for memory" },
  { suffix: "k", meaning: "kilo — ×10³ (decimal, 1000)" },
  { suffix: "M", meaning: "mega — ×10⁶ (decimal, 1,000,000 — NOT the same as Mi)" },
  { suffix: "G", meaning: "giga — ×10⁹ (decimal)" },
  { suffix: "T / P / E", meaning: "tera / peta / exa — ×10¹² / 10¹⁵ / 10¹⁸ (decimal)" },
  { suffix: "Ki", meaning: "kibi — ×2¹⁰ = 1,024 (binary)" },
  { suffix: "Mi", meaning: "mebi — ×2²⁰ = 1,048,576 (binary — NOT the same as M)" },
  { suffix: "Gi / Ti / Pi / Ei", meaning: "gibi / tebi / pebi / exbi — ×2³⁰ / 2⁴⁰ / 2⁵⁰ / 2⁶⁰ (binary)" },
  { suffix: "1e9", meaning: "scientific notation — mantissa × 10^exponent, stands alone (no unit suffix after it)" },
];

export default function QuantityConverterTool() {
  const [tab, setTab] = useState("cpu");

  return (
    <div style={styles.root}>
      <Header repoUrl={REPO_URL} />
      <div style={styles.content}>
        <h1 style={styles.title}>K8s Quantity Converter</h1>
        <p style={styles.subtitle}>
          Paste a Kubernetes resource quantity string and see exactly what it means in raw base units.
          Runs entirely in the browser; nothing you type ever leaves your machine.
        </p>

        <div style={styles.gotcha}>
          <strong>The gotcha this tool exists for:</strong> <code>m</code> and <code>M</code> are not the same
          thing, and neither is <code>Mi</code>. <code>500m</code> CPU means half a core (milli, ×10⁻³).{" "}
          <code>500M</code> memory means 500 megabytes (mega, ×10⁶, decimal). <code>500Mi</code> memory means
          500 mebibytes (×2²⁰, binary) — about 4.7% more bytes than <code>500M</code>. Mixing these up in a
          resource request/limit is a very common real-world Kubernetes mistake, which is why CPU and Memory
          get their own separate tabs below instead of one shared input.
        </div>

        <div style={styles.tabs}>
          <button style={styles.tabBtn(tab === "cpu")} onClick={() => setTab("cpu")}>CPU</button>
          <button style={styles.tabBtn(tab === "memory")} onClick={() => setTab("memory")}>Memory</button>
        </div>

        {tab === "cpu" ? <CpuTab /> : <MemoryTab />}

        <div style={{ marginTop: 32 }}>
          <div style={styles.sectionTitle}>Suffix Reference</div>
          <table style={styles.legendTable}>
            <thead>
              <tr><th style={styles.legendTh}>Suffix</th><th style={styles.legendTh}>Meaning</th></tr>
            </thead>
            <tbody>
              {SUFFIX_LEGEND.map((row) => (
                <tr key={row.suffix}>
                  <td style={styles.legendTd}>{row.suffix}</td>
                  <td style={{ ...styles.legendTd, fontFamily: "inherit" }}>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
