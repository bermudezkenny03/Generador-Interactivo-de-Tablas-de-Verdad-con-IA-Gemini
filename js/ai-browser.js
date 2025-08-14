// js/ai-browser.js
const API_KEY = window.GEMINI_API_KEY;
const MODEL = window.GEMINI_MODEL || "gemini-2.0-flash";
if (!API_KEY) alert("No se encontró GEMINI_API_KEY en js/config.js");

/* =========================
   Imagen: preprocesamiento
========================= */
async function preprocessImageToBase64(
  file,
  { maxW = 1200, contrast = 1.2, brightness = 1.05 } = {}
) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.filter = `contrast(${contrast}) brightness(${brightness})`;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(file.type || "image/jpeg", 0.9).split(",")[1];
}

/* =========================
   Parseo de JSON en texto
========================= */
function extractFirstJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}
  const start = text.indexOf("{"),
    end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  const m = text.match(/```json([\s\S]*?)```/i);
  if (m && m[1]) {
    try {
      return JSON.parse(m[1]);
    } catch {}
  }
  return null;
}

/* =========================
   Normalización de fórmula
========================= */
function toPrettySymbols(input = "") {
  let s = input;
  s = s.replace(/```[\s\S]*?```/g, " "); // quita bloques markdown
  s = s.replace(/^\$+|\$+$/g, " "); // quita $...$
  s = s.replace(/\\\[|\\\]/g, " "); // quita \[ \]
  s = s.replace(/\\neg\b|\\lnot\b|~(?!\w)/g, "¬");
  s = s.replace(/\\land\b|\\wedge\b/g, "∧");
  s = s.replace(/\\lor\b|\\vee\b/g, "∨");
  s = s.replace(/\\to\b|\\implies\b|->/g, "→");
  s = s.replace(/\\leftrightarrow\b|\\iff\b|<->/g, "↔");
  s = s.replace(/\bnot\b/gi, "¬");
  s = s.replace(/\band\b/gi, "∧");
  s = s.replace(/\bor\b/gi, "∨");
  s = s.replace(/⇒|⟹/g, "→");
  s = s.replace(/⇔|⟺/g, "↔");
  s = s.replace(/∼/g, "¬");
  s = s.replace(/[［【｛〈《]/g, "(").replace(/[］】｝〉》]/g, ")");
  return s.replace(/\s+/g, " ").trim();
}
function prettyToAscii(input = "") {
  let s = toPrettySymbols(input);
  s = s.replace(/↔/g, "<->");
  s = s.replace(/→/g, "->");
  s = s.replace(/¬/g, "!");
  s = s.replace(/∧/g, "&&");
  s = s.replace(/∨/g, "||");
  s = s.replace(/\s*&&\s*/g, " && ");
  s = s.replace(/\s*\|\|\s*/g, " || ");
  s = s.replace(/\s*<->\s*/g, " <-> ");
  s = s.replace(/\s*->\s*/g, " -> ");
  s = s.replace(/[.,;:]$/g, "");
  return s.replace(/\s{2,}/g, " ").trim();
}
function normalizeVars(s = "") {
  s = s.replace(/\(\s+/g, "(").replace(/\s+\)\s*/g, ")");
  return s.replace(/\b([a-z])\b/g, (_, v) => v.toUpperCase());
}
function normalizeForParser(raw = "") {
  let s = toPrettySymbols(raw);
  s = prettyToAscii(s);
  s = normalizeVars(s);
  return s;
}

/* =========================
   Variantes para “entrar”
========================= */
// P <-> Q => (P -> Q) && (Q -> P) ; A -> B -> C => A -> (B -> C)
function expandEquivAndImp(formula) {
  let s = formula;
  for (let i = 0; i < 3; i++) {
    s = s.replace(
      /(\([^()]*\)|[A-Z])\s*<->\s*(\([^()]*\)|[A-Z])/g,
      "($1 -> $2) && ($2 -> $1)"
    );
  }
  s = s.replace(
    /([A-Z\)\]])\s*->\s*([A-Z\(\[][^)]*?)\s*->\s*([A-Z\(\[][^)]*)/g,
    "$1 -> ($2 -> $3)"
  );
  return s;
}
// XOR a DNF: (P&&!Q)||(!P&&Q)
function expandXor(formula) {
  let s = formula.replace(/⊕|\^/g, " XOR ");
  s = s.replace(
    /(\([^()]*\)|[A-Z])\s*XOR\s*(\([^()]*\)|[A-Z])/g,
    "(($1 && !$2) || (!$1 && $2))"
  );
  return s;
}
function tightenNegations(formula) {
  return formula
    .replace(/!([A-Z](?![A-Za-z0-9_]))/g, "!$1")
    .replace(/!(\s*\()/g, "!$1");
}
function wrapIfBare(formula) {
  const f = formula.trim();
  if (!f.startsWith("(") || !f.endsWith(")")) return `(${f})`;
  return f;
}

/* =========================
   Prompt y llamada a Gemini
========================= */
const PROMPT_STRICT = `
Eres experto en lógica proposicional. Analiza SOLO la IMAGEN del enunciado.
Devuelve EXCLUSIVAMENTE un JSON (sin texto adicional) con este esquema:

{
  "formula_pretty": "misma fórmula usando ¬ ∧ ∨ → ↔ y variables MAYÚSCULAS A,B,C...",
  "formula_ascii": "misma fórmula pero SOLO con ! && || -> <-> y variables MAYÚSCULAS A,B,C...",
  "method": "tipo de operación o método lógico usado, ej: tabla de verdad, equivalencias, método de verdad, inferencia directa, etc.",
  "notes": "string breve explicando la interpretación",
  "truth_table": [
    { "assignment": {"A": true, "B": false}, "result": true }
  ]
}

Reglas:
- Usa SOLO ! && || -> <-> en formula_ascii.
- "method" debe describir brevemente el método o enfoque lógico detectado (por ejemplo: 'Método de tablas de verdad', 'Equivalencia lógica', 'Resolución por inferencia', 'Condicional material', etc.).
- No inventes operadores que no estén en el enunciado (nada de XOR salvo que lo expandas).
- Si hay varias interpretaciones, elige la MÁS estándar y explícalo en "notes".
- Si no es 100% proposicional (cuantificadores), reduce a proposición plausible.
- NO incluyas LaTeX ni texto fuera del JSON.
Ejemplo:
{"formula_pretty":"(A ∧ B) → C","formula_ascii":"(A && B) -> C","method":"Método de tablas de verdad","notes":"Interpretación estándar","truth_table":[{"assignment":{"A":false,"B":false},"result":true}]}
`.trim();


async function sendImageToGemini(file, promptText, temperature = 0) {
  const b64 = await preprocessImageToBase64(file);
  const body = {
    contents: [
      { role: "user", parts: [{ text: promptText }] },
      {
        role: "user",
        parts: [{ inlineData: { mimeType: file.type, data: b64 } }],
      },
    ],
    generationConfig: {
      temperature,
      response_mime_type: "application/json",
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message || JSON.stringify(j);
    } catch {
      try {
        detail = await res.text();
      } catch {}
    }
    throw new Error(`Error ${res.status}: ${detail || "Solicitud inválida"}`);
  }
  return res.json();
}

// (Opcional) OCR de rescate (si incluyes Tesseract en index.html)
async function ocrWithTesseract(file, lang = "spa+eng") {
  if (!window.Tesseract) return "";
  const worker = await Tesseract.createWorker(lang);
  const {
    data: { text },
  } = await worker.recognize(file);
  await worker.terminate();
  return text;
}
async function sendTextToGeminiAsJson(text) {
  const body = {
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      temperature: 0,
      response_mime_type: "application/json",
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  return res.json();
}

/* =========================
   “Aplicador” con variantes
========================= */
function tryApplyToInput(
  formula,
  { checkId = "table-target", maxTries = 6 } = {}
) {
  const input = document.getElementById("expressionInput");
  const target = document.getElementById(checkId);
  const before = target ? target.innerHTML.length : 0;

  const tryOnce = (f) => {
    input.value = f;
    input.dispatchEvent(new Event("input", { bubbles: true })); // activa tu oninput="go()"
  };

  const candidates = [];
  candidates.push(formula);
  candidates.push(expandEquivAndImp(formula));
  candidates.push(expandXor(formula));
  candidates.push(expandXor(expandEquivAndImp(formula)));
  candidates.push(wrapIfBare(formula));
  candidates.push(wrapIfBare(expandXor(expandEquivAndImp(formula))));

  let applied = false;
  for (let i = 0; i < candidates.length && i < maxTries; i++) {
    tryOnce(tightenNegations(candidates[i]));
    const after = target ? target.innerHTML.length : 0;
    if (after > before) {
      applied = true;
      break;
    }
  }
  return applied;
}

/* =========================
   UI / Eventos
========================= */
const fileInput = document.getElementById("exerciseImage");
const sendBtn = document.getElementById("sendToAiBtn");
const statusEl = document.getElementById("aiStatus");
const preview = document.getElementById("imagePreview");
const answerTA = document.getElementById("aiAnswer");
const applyBtn = document.getElementById("applyParsedFormulaBtn");

// Vista previa
fileInput?.addEventListener("change", () => {
  preview.innerHTML = "";
  const f = fileInput.files?.[0];
  if (!f) return;
  if (!f.type.startsWith("image/")) {
    fileInput.value = "";
    return alert("Solo imágenes (PNG/JPG/WebP).");
  }
  if (f.size > 8 * 1024 * 1024) {
    fileInput.value = "";
    return alert("Imagen muy grande. Máx. 8MB.");
  }
  const img = document.createElement("img");
  img.style.maxWidth = "420px";
  img.style.borderRadius = "8px";
  img.style.boxShadow = "0 2px 12px rgba(0,0,0,.15)";
  img.src = URL.createObjectURL(f);
  preview.appendChild(img);
});

// Enviar a IA (con reintento y OCR opcional)
sendBtn?.addEventListener("click", async () => {
  const f = fileInput?.files?.[0];
  if (!f) return alert("Selecciona una imagen primero");

  statusEl.textContent = "Procesando con IA...";
  answerTA.value = "";

  try {
    // 1er intento
    let data = await sendImageToGemini(f, PROMPT_STRICT, 0);
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed = extractFirstJson(text);

    // 2do intento si no hay fórmula_ascii o formula
    if (!(parsed?.formula_ascii || parsed?.formula_pretty || parsed?.formula)) {
      statusEl.textContent = "Reintentando…";
      const HARD =
        PROMPT_STRICT +
        `
IMPORTANTE:
- Responde SOLO el JSON, sin backticks ni comentarios.
- Asegúrate de incluir "formula_ascii" usando estrictamente ! && || -> <-> y variables A,B,C...`;
      data = await sendImageToGemini(f, HARD, 0);
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      parsed = extractFirstJson(text);
    }

    // (Opcional) 3er intento con OCR
    if (
      !(parsed?.formula_ascii || parsed?.formula_pretty || parsed?.formula) &&
      window.Tesseract
    ) {
      statusEl.textContent = "OCR…";
      const txt = await ocrWithTesseract(f);
      const promptText =
        PROMPT_STRICT + `\n\nTexto extraído (OCR):\n${txt}\n\n`;
      const j = await sendTextToGeminiAsJson(promptText);
      const t = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      parsed = extractFirstJson(t) || parsed;
    }

    // Mostrar en textarea
    if (parsed) {
      answerTA.value = JSON.stringify(parsed, null, 2);

      // Auto-aplicar priorizando formula_ascii
      const asciiFromModel = parsed.formula_ascii;
      const prettyFromModel = parsed.formula_pretty || parsed.formula;

      if (asciiFromModel) {
        const ok = tryApplyToInput(asciiFromModel);
        if (!ok && prettyFromModel) {
          const ascii = normalizeForParser(prettyFromModel);
          tryApplyToInput(ascii);
        }
      } else if (prettyFromModel) {
        const ascii = normalizeForParser(prettyFromModel);
        tryApplyToInput(ascii);
      }
    } else {
      answerTA.value = text.trim() || "Sin texto de respuesta.";
    }
  } catch (err) {
    console.error("Gemini error:", err);
    alert(err.message || "Error procesando la imagen.");
  } finally {
    statusEl.textContent = "";
  }
});

// Botón: aplicar manual
applyBtn?.addEventListener("click", () => {
  const obj = extractFirstJson(answerTA.value) || {};
  let formula =
    obj.formula_ascii ||
    obj.formula_pretty ||
    obj.formula ||
    getFormulaFromTextarea(answerTA.value);
  if (!formula) return alert("No se encontró fórmula en la respuesta.");
  if (!/[\!\&\|\-<>]/.test(formula)) formula = normalizeForParser(formula);

  const ok = tryApplyToInput(formula);
  if (!ok) {
    const fallback = expandXor(expandEquivAndImp(formula));
    tryApplyToInput(fallback);
  }
});

// Helper: si el textarea no es JSON, intenta regex / plano
function getFormulaFromTextarea(text) {
  try {
    const obj = JSON.parse(text);
    if (obj?.formula_ascii) return String(obj.formula_ascii);
    if (obj?.formula_pretty) return String(obj.formula_pretty);
    if (obj?.formula) return String(obj.formula);
  } catch {}
  const m = text.match(/"formula(?:_ascii|_pretty)?"\s*:\s*"([^"]+)"/);
  if (m) return m[1];
  return text?.trim() || "";
}
