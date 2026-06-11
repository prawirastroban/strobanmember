/**
 * Safe calculator for builder "calculated field" expressions.
 *
 * Whitelist:
 *   - identifiers (must match a measure key already in the row scope, A-Za-z0-9_)
 *   - numeric literals (123, 12.5)
 *   - operators: + - * /
 *   - parentheses
 *
 * No function calls, no string literals, no variables outside scope.
 * Hard limit: expression length <= 120 chars.
 */

type Token = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(expr: string): Token[] {
  if (expr.length > 120) throw new Error("Ekspresi terlalu panjang (max 120 karakter)");
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === " " || c === "\t") { i++; continue; }
    if ("+-*/()".includes(c)) { tokens.push({ t: "op", v: c }); i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const num = parseFloat(expr.slice(i, j));
      if (!Number.isFinite(num)) throw new Error("Angka tidak valid");
      tokens.push({ t: "num", v: num }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++;
      tokens.push({ t: "id", v: expr.slice(i, j) }); i = j; continue;
    }
    throw new Error(`Karakter tidak diizinkan: "${c}"`);
  }
  return tokens;
}

/** Pratt parser → AST → evaluator with scope. */
export function evaluateExpression(expr: string, scope: Record<string, number>): number {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];

  function parseExpr(): number {
    let lhs = parseTerm();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = eat().v as string;
      const rhs = parseTerm();
      lhs = op === "+" ? lhs + rhs : lhs - rhs;
    }
    return lhs;
  }
  function parseTerm(): number {
    let lhs = parseFactor();
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = eat().v as string;
      const rhs = parseFactor();
      if (op === "*") lhs = lhs * rhs;
      else lhs = rhs === 0 ? 0 : lhs / rhs;
    }
    return lhs;
  }
  function parseFactor(): number {
    const tk = peek();
    if (!tk) throw new Error("Ekspresi terpotong");
    if (tk.t === "op" && tk.v === "(") {
      eat();
      const v = parseExpr();
      const close = eat();
      if (!close || close.t !== "op" || close.v !== ")") throw new Error("Kurung tidak seimbang");
      return v;
    }
    if (tk.t === "op" && tk.v === "-") {
      eat();
      return -parseFactor();
    }
    if (tk.t === "num") { eat(); return tk.v; }
    if (tk.t === "id") {
      eat();
      if (!(tk.v in scope)) throw new Error(`Field "${tk.v}" tidak tersedia`);
      return Number(scope[tk.v]) || 0;
    }
    throw new Error("Token tak dikenal");
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error("Sintaks tidak valid");
  return result;
}

/** Validate without evaluating, returning {ok, error?}. */
export function validateExpression(expr: string, available: string[]): { ok: boolean; error?: string } {
  const scope: Record<string, number> = {};
  available.forEach((k) => { scope[k] = 1; });
  try { evaluateExpression(expr, scope); return { ok: true }; }
  catch (e: any) { return { ok: false, error: e?.message || "Invalid expression" }; }
}