/** html2canvas cannot parse modern color()/color-mix(); let the browser resolve them. */
export function normalizeCaptureColors(documentClone: Document, target: HTMLElement): void {
  const context = documentClone.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const view = documentClone.defaultView;
  if (!context || !view) return;
  const cache = new Map<string, string>();
  const resolve = (color: string) => {
    const previous = cache.get(color);
    if (previous) return previous;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    const value = `rgba(${r},${g},${b},${a / 255})`;
    cache.set(color, value);
    return value;
  };
  const replaceColors = (value: string) => {
    const pattern = /\b(?:color-mix|color|oklch|oklab|lab|lch)\(/gi;
    let match: RegExpExecArray | null;
    let result = "";
    let offset = 0;
    while ((match = pattern.exec(value))) {
      let end = pattern.lastIndex;
      let depth = 1;
      while (end < value.length && depth) {
        if (value[end] === "(") depth++;
        else if (value[end] === ")") depth--;
        end++;
      }
      if (depth) break;
      result += value.slice(offset, match.index) + resolve(value.slice(match.index, end));
      offset = end;
      pattern.lastIndex = end;
    }
    return result + value.slice(offset);
  };
  const properties = ["color", "background-color", "background-image", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "outline-color", "text-decoration-color", "box-shadow", "text-shadow"];
  for (const element of [target, ...target.querySelectorAll<HTMLElement>("*")]) {
    const style = view.getComputedStyle(element);
    for (const property of properties) {
      const value = style.getPropertyValue(property);
      if (/\b(?:color-mix|color|oklch|oklab|lab|lch)\(/i.test(value)) element.style.setProperty(property, replaceColors(value), "important");
    }
  }
  // html2canvas misplaces small flex text baselines. Draw these labels from
  // their measured live bounds after the image has been rendered.
  for (const label of target.querySelectorAll<HTMLElement>(CAPTURE_LABELS)) label.style.setProperty("color", "transparent", "important");
}

const CAPTURE_LABELS = ".jumpa-name-full, .jumpa-name-short, .jumpa-mini-name, .jumpa-badge";

export function drawCaptureLabels(canvas: HTMLCanvasElement, target: HTMLElement): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const bounds = target.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const scale = canvas.width / bounds.width;
  context.save();
  context.setTransform(scale, 0, 0, scale, -bounds.left * scale, -bounds.top * scale);
  context.textBaseline = "middle";
  for (const label of target.querySelectorAll<HTMLElement>(CAPTURE_LABELS)) {
    const rect = label.getBoundingClientRect();
    const style = getComputedStyle(label);
    if (!rect.width || !rect.height || style.visibility === "hidden") continue;
    context.save();
    context.beginPath(); context.rect(rect.left, rect.top, rect.width, rect.height); context.clip();
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.fillStyle = style.color;
    let text = label.textContent?.trim() ?? "";
    if (context.measureText(text).width > rect.width) {
      const letters = Array.from(text);
      while (letters.length && context.measureText(letters.join("") + "…").width > rect.width) letters.pop();
      text = letters.length ? letters.join("") + "…" : "";
    }
    // Badges have padding; names are aligned to the start of their text box.
    const padding = Number.parseFloat(style.paddingLeft) || 0;
    context.fillText(text, rect.left + padding, rect.top + rect.height / 2);
    context.restore();
  }
  context.restore();
}
