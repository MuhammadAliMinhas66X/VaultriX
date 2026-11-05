const PAGE_W = 595.28;
const PAGE_H = 841.89;

const REGULAR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

const REPLACEMENTS = { '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '•': '-', ' ': ' ', '…': '...' };

export const clean = (value) =>
  [...String(value ?? '')]
    .map((char) => {
      if (REPLACEMENTS[char]) return REPLACEMENTS[char];
      const code = char.charCodeAt(0);
      return code < 32 || code > 255 ? '?' : char;
    })
    .join('');

const escapeText = (value) =>
  [...value]
    .map((char) => {
      const code = char.charCodeAt(0);
      if (char === '(' || char === ')' || char === '\\') return `\\${char}`;
      if (code > 126) return `\\${code.toString(8).padStart(3, '0')}`;
      return char;
    })
    .join('');

const fixed = (value) => (Math.round(value * 100) / 100).toString();
const color = (hex) => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => fixed(parseInt(value.slice(index, index + 2), 16) / 255)).join(' ');
};

export class PdfDocument {
  constructor() {
    this.pages = [];
    this.margin = 48;
    this.newPage();
  }

  newPage() {
    this.ops = [];
    this.pages.push(this.ops);
    this.y = this.margin;
  }

  width(text, size, bold = false) {
    const table = bold ? BOLD : REGULAR;
    let total = 0;
    for (const char of clean(text)) {
      const code = char.charCodeAt(0);
      total += code >= 32 && code <= 126 ? table[code - 32] : 556;
    }
    return (total * size) / 1000;
  }

  wrap(text, size, bold, maxWidth) {
    const lines = [];
    String(clean(text))
      .split('\n')
      .forEach((paragraph) => {
        let line = '';
        paragraph.split(' ').forEach((word) => {
          let piece = word;
          while (this.width(piece, size, bold) > maxWidth && piece.length > 1) {
            let cut = piece.length - 1;
            while (cut > 1 && this.width(piece.slice(0, cut), size, bold) > maxWidth) cut -= 1;
            if (line) {
              lines.push(line);
              line = '';
            }
            lines.push(piece.slice(0, cut));
            piece = piece.slice(cut);
          }
          const attempt = line ? `${line} ${piece}` : piece;
          if (this.width(attempt, size, bold) <= maxWidth) line = attempt;
          else {
            if (line) lines.push(line);
            line = piece;
          }
        });
        lines.push(line);
      });
    return lines;
  }

  rect(x, top, w, h, { fill, stroke, lineWidth = 0.75 } = {}) {
    const y = PAGE_H - top - h;
    if (fill) this.ops.push(`${color(fill)} rg`);
    if (stroke) this.ops.push(`${color(stroke)} RG ${fixed(lineWidth)} w`);
    this.ops.push(`${fixed(x)} ${fixed(y)} ${fixed(w)} ${fixed(h)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
  }

  line(x1, top, x2, stroke = '#e5e5e7', lineWidth = 0.75) {
    const y = PAGE_H - top;
    this.ops.push(`${color(stroke)} RG ${fixed(lineWidth)} w ${fixed(x1)} ${fixed(y)} m ${fixed(x2)} ${fixed(y)} l S`);
  }

  text(value, x, baseline, { size = 10, bold = false, fill = '#111114', align = 'left' } = {}) {
    const text = clean(value);
    const w = this.width(text, size, bold);
    const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    this.ops.push(`BT /${bold ? 'F2' : 'F1'} ${fixed(size)} Tf ${color(fill)} rg ${fixed(left)} ${fixed(PAGE_H - baseline)} Td (${escapeText(text)}) Tj ET`);
  }

  ensure(height) {
    if (this.y + height > PAGE_H - this.margin - 24) this.newPage();
  }

  build() {
    const objects = [];
    const add = (body) => {
      objects.push(body);
      return objects.length;
    };
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add('');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    const total = this.pages.length;
    const kids = [];
    this.pages.forEach((ops, index) => {
      const footer = [`BT /F1 8 Tf ${color('#6b6b70')} rg ${fixed(PAGE_W / 2 - 20)} ${'30'} Td (Page ${index + 1} of ${total}) Tj ET`];
      const stream = [...ops, ...footer].join('\n');
      const contentId = objects.length + 2;
      const pageId = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fixed(PAGE_W)} ${fixed(PAGE_H)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
      add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      kids.push(`${pageId} 0 R`);
    });
    objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${total} >>`;

    let output = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((body, index) => {
      offsets.push(output.length);
      output += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = output.length;
    output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((offset) => {
      output += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

    const bytes = new Uint8Array(output.length);
    for (let index = 0; index < output.length; index += 1) bytes[index] = output.charCodeAt(index) & 255;
    return bytes;
  }
}

export const PDF_PAGE = { width: PAGE_W, height: PAGE_H };
