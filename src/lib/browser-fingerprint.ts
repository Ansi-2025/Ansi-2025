/**
 * Gera um fingerprint único do navegador para deduplicar visitas
 * Baseado em: user-agent, idioma, timezone, canvas fingerprint
 */

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const text = "canvas-fp";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText(text, 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText(text, 4, 17);

    return canvas.toDataURL().slice(-50);
  } catch {
    return "";
  }
}

export function generateBrowserFingerprint(): string {
  const components = [
    navigator.userAgent || "",
    navigator.language || "",
    new Date().getTimezoneOffset().toString(),
    getCanvasFingerprint(),
    screen.width + "x" + screen.height,
    screen.colorDepth,
  ];

  return btoa(components.join("|")).slice(0, 32);
}

/**
 * Obtém ou cria um fingerprint persistente do navegador
 * Tenta usar localStorage primeiro, depois sessionStorage
 */
export function getPersistentBrowserFingerprint(): string {
  const key = "cancao-de-fe:browser-fingerprint";

  try {
    // Tenta recuperar do localStorage
    const stored = localStorage.getItem(key);
    if (stored) return stored;
  } catch {
    // localStorage pode não estar disponível
  }

  const fingerprint = generateBrowserFingerprint();

  try {
    // Tenta guardar no localStorage
    localStorage.setItem(key, fingerprint);
  } catch {
    // Silenciosamente falha se localStorage não estiver disponível
  }

  return fingerprint;
}
