// Minimal, dependency-free PDF builder.
//
// Produces a valid single-page PDF (PDF 1.4) with wrapped text using the
// standard Helvetica font. No native bindings, no external packages — safe for
// serverless Node and guaranteed not to break the build. Intended for the
// concise weekly client report (cover line + macro summary + 2-3 paragraph
// narrative), not arbitrary rich layout.

const PAGE_WIDTH = 612; // US Letter @ 72dpi
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const TOP_Y = 740;
const LINE_HEIGHT = 16;
const MAX_LINES = 44; // lines that fit on one page below TOP_Y
const WRAP_CHARS = 92; // approx chars per line at 11pt Helvetica within margins

export interface PdfLine {
  text: string;
  size?: number; // font size in pt (default 11)
  bold?: boolean; // render with Helvetica-Bold
  gap?: number; // extra blank lines after this line
}

// Escape characters that are significant inside a PDF string literal.
function escapePdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Greedy word-wrap a single logical line into multiple physical lines.
export function wrapText(text: string, maxChars = WRAP_CHARS): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Build a one-page PDF from a flat list of text lines.
 * Returns a Buffer containing the complete PDF document.
 */
export function buildSimplePdf(lines: PdfLine[]): Buffer {
  // ── Assemble the content stream ───────────────────────────────────────────
  const ops: string[] = [];
  let y = TOP_Y;
  let rendered = 0;

  for (const line of lines) {
    if (rendered >= MAX_LINES) break;
    const size = line.size ?? 11;
    const font = line.bold ? "F2" : "F1";
    ops.push("BT");
    ops.push(`/${font} ${size} Tf`);
    ops.push(`1 0 0 1 ${MARGIN_X} ${y} Tm`);
    ops.push(`(${escapePdfText(line.text)}) Tj`);
    ops.push("ET");
    y -= LINE_HEIGHT + (line.gap ?? 0) * LINE_HEIGHT;
    rendered++;
  }

  const content = ops.join("\n");
  const contentBytes = Buffer.byteLength(content, "utf-8");

  // ── Build PDF objects ─────────────────────────────────────────────────────
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`
  );
  objects.push(`<< /Length ${contentBytes} >>\nstream\n${content}\nendstream`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  // ── Serialize with byte-accurate xref offsets ───────────────────────────────
  const header = "%PDF-1.4\n";
  let body = "";
  const offsets: number[] = [];
  let cursor = Buffer.byteLength(header, "utf-8");

  objects.forEach((obj, i) => {
    const objNum = i + 1;
    const chunk = `${objNum} 0 obj\n${obj}\nendobj\n`;
    offsets.push(cursor);
    body += chunk;
    cursor += Buffer.byteLength(chunk, "utf-8");
  });

  const xrefOffset = cursor;
  const count = objects.length + 1; // +1 for the free object 0

  let xref = `xref\n0 ${count}\n`;
  xref += "0000000000 65535 f \n";
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  const trailer =
    `trailer\n<< /Size ${count} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(header + body + xref + trailer, "utf-8");
}
