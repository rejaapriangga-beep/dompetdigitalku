// app/calc-eval.ts
// Evaluator ekspresi aritmatika sederhana & AMAN (bukan eval()/Function() —
// menghindari risiko code injection) untuk mode "Kalkulator" pada input
// nominal. Mendukung + - * / (dan alias × ÷ x) serta tanda kurung.
// Dipakai supaya pengguna bisa langsung ketik "15000+25000+8000" saat
// menjumlahkan beberapa struk belanja jadi satu transaksi.
//
// PENTING soal tanda titik: di sini "." dianggap PEMISAH RIBUAN ala id-ID
// (mis. "100.000" = seratus ribu), BUKAN titik desimal ala pemrograman —
// karena app ini cuma pakai Rupiah bulat, tidak ada kebutuhan desimal sama
// sekali di tempat lain. Titik cuma dibuang saat parsing, tidak
// memengaruhi nilainya (beda dari Number() biasa yang akan membaca
// "100.000" sebagai 100).

type Token = { type: "num"; value: number } | { type: "op"; value: string };

function tokenize(expr: string): Token[] | null {
  // Normalisasi alias operator kasual ke bentuk standar sebelum tokenize.
  const normalized = expr.replace(/[×x]/gi, "*").replace(/[÷]/g, "/");
  const tokens: Token[] = [];
  let i = 0;
  while (i < normalized.length) {
    const ch = normalized[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < normalized.length && /[0-9.]/.test(normalized[j])) j++;
      const raw = normalized.slice(i, j);
      // Buang titik (pemisah ribuan), bukan diperlakukan sebagai desimal.
      const withoutSeparators = raw.replace(/\./g, "");
      const num = Number(withoutSeparators);
      if (Number.isNaN(num)) return null;
      tokens.push({ type: "num", value: num });
      i = j;
      continue;
    }
    return null; // karakter tidak dikenal
  }
  return tokens;
}

// Recursive-descent parser: expr -> term (('+'|'-') term)*
//                            term -> factor (('*'|'/') factor)*
//                            factor -> NUM | '(' expr ')' | '-' factor
class Parser {
  private tokens: Token[];
  private pos = 0;
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  private peek() {
    return this.tokens[this.pos];
  }
  private next() {
    return this.tokens[this.pos++];
  }
  parseExpr(): number | null {
    let value = this.parseTerm();
    if (value === null) return null;
    while (this.peek()?.type === "op" && (this.peek()!.value === "+" || this.peek()!.value === "-")) {
      const op = this.next() as { type: "op"; value: string };
      const rhs = this.parseTerm();
      if (rhs === null) return null;
      value = op.value === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  private parseTerm(): number | null {
    let value = this.parseFactor();
    if (value === null) return null;
    while (this.peek()?.type === "op" && (this.peek()!.value === "*" || this.peek()!.value === "/")) {
      const op = this.next() as { type: "op"; value: string };
      const rhs = this.parseFactor();
      if (rhs === null) return null;
      if (op.value === "/" && rhs === 0) return null; // hindari pembagian nol
      value = op.value === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  private parseFactor(): number | null {
    const tok = this.peek();
    if (!tok) return null;
    if (tok.type === "op" && tok.value === "-") {
      this.next();
      const inner = this.parseFactor();
      return inner === null ? null : -inner;
    }
    if (tok.type === "op" && tok.value === "(") {
      this.next();
      const inner = this.parseExpr();
      if (inner === null) return null;
      const close = this.next();
      if (!close || close.type !== "op" || close.value !== ")") return null;
      return inner;
    }
    if (tok.type === "num") {
      this.next();
      return tok.value;
    }
    return null;
  }
  isAtEnd() {
    return this.pos >= this.tokens.length;
  }
}

/**
 * Evaluasi ekspresi aritmatika sederhana (mis. "15000+25000+8000").
 * @returns hasil (bisa negatif/desimal) kalau valid, atau null kalau
 * ekspresinya kosong/tidak lengkap/tidak valid.
 */
export function evaluateExpression(expr: string): number | null {
  const trimmed = expr.trim();
  if (!trimmed) return null;
  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length === 0) return null;
  const parser = new Parser(tokens);
  const result = parser.parseExpr();
  if (result === null || !parser.isAtEnd() || !Number.isFinite(result)) return null;
  return result;
}
