// netlify/functions/evaluate.js
//
// Evalúa una respuesta abierta del estudiante llamando a la API de Anthropic
// desde el servidor (Netlify Function), usando la clave guardada de forma
// segura en la variable de entorno ANTHROPIC_API_KEY. La clave NUNCA se
// expone al navegador del estudiante.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido." }) };
  }

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "ANTHROPIC_API_KEY no está configurada en el servidor. Añádela en Netlify → Site configuration → Environment variables."
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON inválido en la solicitud." }) };
  }

  const { studentText, maxPts, evalContext } = payload;

  if (typeof maxPts !== "number" || !evalContext) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Faltan parámetros (maxPts, evalContext)." }) };
  }

  const sys = `Eres un evaluador clínico que apoya un simulador educativo de Entrevista Psicológica (primer acercamiento / anamnesis) para estudiantes de Psicología. Evalúas ÚNICAMENTE la respuesta escrita del estudiante en la escena descrita, dentro del marco de una primera entrevista clínica (no se espera diagnóstico cerrado ni intervención psicoterapéutica estructurada en una sola sesión). Debes responder EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional, sin marcadores de código, con esta forma exacta:
{"score": <entero entre 0 y ${maxPts}>, "feedback": "<retroalimentación breve, 1-2 frases, en español, dirigida al estudiante>", "strength": "<una fortaleza concreta si la hay, o cadena vacía>", "error": "<un error concreto detectado si lo hay, o cadena vacía>"}
Criterios de evaluación para esta escena: ${evalContext}
Evalúa con criterio profesional pero constructivo. Una respuesta vacía, irrelevante o que refleje malas prácticas de entrevista (por ejemplo, preguntas cerradas o inductivas cuando correspondía explorar de forma abierta, diagnosticar prematuramente, dar consejos personales en vez de explorar, prometer confidencialidad absoluta ante riesgo vital, o pasar por alto una señal de riesgo) debe recibir un puntaje bajo.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        system: sys,
        messages: [{ role: "user", content: `Respuesta del estudiante: "${studentText || ""}"` }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) throw new Error("Sin bloque de texto en la respuesta de la API.");

    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const score = Math.max(0, Math.min(maxPts, Math.round(parsed.score)));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        score,
        feedback: parsed.feedback || "",
        strength: parsed.strength || "",
        error: parsed.error || ""
      })
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: `No se pudo evaluar con la API: ${e.message}` })
    };
  }
};
