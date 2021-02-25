import { strict as assert } from "assert";
import {
  T_ALT,
  T_CAT,
  T_CHAR,
  T_EMPTY,
  T_EPS,
  T_REP,
  T_DELTA,
  fix,
  memo,
  isAtomic,
  isAlt,
  isCharacter,
  isEmpty,
  isEps,
  isRep,
  isCat,
  T_RED,
} from "./000_base.js";

const lazyHandler = {
  // force
  get: function (target, prop, _receiver) {
    if (typeof target[prop] === "function") {
      target[prop] = target[prop]();
    }
    return target[prop];
  },
};

// empty language - ∅ = {}
export const empty = { type: T_EMPTY };

// trivial language - ϵ = {ε}
export const eps = { type: T_EPS };

export const epsilon = (tree) => ({ type: T_EPS, tree });

// singleton language - {x}
export const character = (char) => ({ type: T_CHAR, char });

// language concatenation - L₁◦L₂ = {w₁w₂ : w₁∈L₁ and w₂∈L₂}
export const cat_base = (first, second) =>
  new Proxy({ type: T_CAT, first, second }, lazyHandler);
const cat = (...rest) => rest.reduce(cat_base);

// language union - L₁⋃L₂ = {w : w∈L₁ or w∈L₂}
export const alt_base = (first, second) =>
  new Proxy({ type: T_ALT, first, second }, lazyHandler);
const alt = (...rest) => rest.reduce(alt_base);

// Lⁱ = {w₁w₂...wᵢ : wₓ∈L for 1 ≤ x ≤ i }
// Kleene star - L* = L⁰⋃Lⁱ⋃L²…
export const rep = (lang) => new Proxy({ type: T_REP, lang }, lazyHandler);

// δ(L) = ϵ if ϵ∈L
// δ(L) = ∅ if ϵ∉L
export const delta = (lang) => new Proxy({ type: T_DELTA, lang }, lazyHandler);

export const reduction = (lang, reduce) =>
  new Proxy({ type: T_RED, lang, reduce }, lazyHandler);

export const isReduction = (lang) => lang.type === T_RED;

// Dᵥ(L)={w : vw∈L}
// other names: Brzozowski’s derivative
const derivative = memo(
  [
    { type: "ref", arg: 1 },
    { type: "str", arg: 0 },
  ],
  (char, language) => {
    switch (language.type) {
      case T_EMPTY:
        return empty;
      case T_EPS:
        return empty;
      case T_DELTA:
        return empty;
      case T_CHAR:
        return language.char === char ? epsilon([char]) : empty;
      case T_ALT:
        return alt(
          () => derivative(char, language.first),
          () => derivative(char, language.second)
        );
      case T_CAT:
        return alt(
          cat(delta(language.first), () => derivative(char, language.second)),
          cat(() => derivative(char, language.first), language.second)
        );
      case T_REP:
        return cat(() => derivative(char, language.lang), language);
      case T_RED:
        return reduction(
          () => derivative(char, language.lang),
          language.reduce
        );
      default:
        throw new Error("Should not happen");
    }
  }
);

// because Set uses referential comparison
const arrayToString = memo([{ type: "ref" }], (x) => `[${x.map(toString)}]`);
function toString(x) {
  return Array.isArray(x) ? arrayToString(x) : x;
}

// there is no built-in ordered Set in JS
const removeDuplicates = (list) => {
  const result = [];
  const existing = new Set();
  list.forEach((x) => {
    if (existing.has(toString(x))) return;
    existing.add(toString(x));
    result.push(x);
  });
  return result;
};
const union = (x1, x2) => {
  return removeDuplicates([
    ...(x1 === undefined ? [[]] : x1),
    ...(x2 === undefined ? [[]] : x2),
  ]);
};

const cons = (x1, x2) =>
  [x1, x2]
    .filter((x) => !Array.isArray(x) || x.length > 0)
    .map((x) => (Array.isArray(x) && x.length === 1 ? x[0] : x));

const forset = (x1, x2) => {
  const length = Math.min(x1.length, x2.length);
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(cons(x1[i], x2[i]));
  }
  return removeDuplicates(result);
};

const emptyTree = [];
const emptyEmptyTree = [emptyTree];
const parseNull = fix(
  { arg: [{ type: "ref" }], fixValue: emptyTree },
  (language) => {
    switch (language.type) {
      case T_EMPTY:
        return emptyTree;
      case T_EPS:
        return language.tree;
      case T_CHAR:
        return emptyTree;
      case T_DELTA:
        return parseNull(language.lang);
      case T_REP:
        return emptyEmptyTree;
      case T_ALT:
        return union(parseNull(language.first), parseNull(language.second));
      case T_CAT:
        return forset(parseNull(language.first), parseNull(language.second));
      case T_RED:
        return new Set([...language.reduce(parseNull(language.lang))]);
      default:
        throw new Error("Should not happen");
    }
  }
);

const isEmptyLike = fix(
  { arg: [{ type: "ref" }], fixValue: false },
  (language) => {
    switch (language.type) {
      case T_EMPTY:
        return true;
      case T_EPS:
        return false;
      case T_CHAR:
        return false;
      case T_REP:
        return false;
      case T_ALT:
        return isEmptyLike(language.first) && isEmptyLike(language.second);
      case T_CAT:
        return isEmptyLike(language.first) || isEmptyLike(language.second);
      case T_RED:
        return isEmptyLike(language.lang);
      default:
        // TODO how to handle delta
        // throw new Error("Should not happen");
        return false; // fixValue
    }
  }
);

const isEpsLike = fix(
  { arg: [{ type: "ref" }], fixValue: true },
  (language) => {
    switch (language.type) {
      case T_EMPTY:
        return false;
      case T_EPS:
        return true;
      case T_CHAR:
        return false;
      case T_REP:
        return isEmptyLike(language.lang) || isEpsLike(language.lang);
      case T_ALT:
        return isEpsLike(language.first) && isEpsLike(language.second);
      case T_CAT:
        return isEpsLike(language.first) && isEpsLike(language.second);
      case T_RED:
        return isEpsLike(language.lang);
      default:
        // TODO how to handle delta
        // throw new Error("Should not happen");
        return true; // fixValue
    }
  }
);

const compact = memo([{ type: "ref" }], (language) => {
  if (isEmpty(language) || isEps(language)) {
    return language;
  }
  if (isEmptyLike(language)) {
    return empty;
  }
  if (isEpsLike(language)) {
    return epsilon(parseNull(language));
  }
  if (isCharacter(language)) {
    return language;
  }
  if (isRep(language)) {
    if (isEmptyLike(language.lang)) {
      return epsilon(emptyEmptyTree);
    } else {
      return rep(() => compact(language.lang));
    }
  }
  if (isAlt(language)) {
    if (isEmptyLike(language.first)) {
      return compact(language.second);
    }
    if (isEmptyLike(language.second)) {
      return compact(language.first);
    }
    return alt(
      () => compact(language.first),
      () => compact(language.second)
    );
  }
  if (isCat(language)) {
    // TODO
    // [(∘ (nullp t) L2)   (→ (K L2) (λ (w2) (cons t w2)))]
    // [(∘ L1 (nullp t))   (→ (K L1) (λ (w1) (cons w1 t)))]
    return cat(
      () => compact(language.first),
      () => compact(language.second)
    );
  }
  if (isReduction(language)) {
    // TODO
    // [(→ (and e (? ε?)) f)
    //   (ε (for/set ([t (parse-null e)]) (f t)))]
    // [(→ (∘ (nullp t) L2) f)   (→ (K L2) (λ (w2) (f (cons t w2))))]
    // [(→ (→ L f) g)            (→ (K L) (compose g f))]
    // [(→ L f)                  (→ (K L) f)]))
  }
  return language;
});

const parse = (str, lang) => {
  return str.length === 0
    ? parseNull(lang)
    : parse(str.slice(1), compact(derivative(str[0], lang)));
};

const letrec = (fn) => {
  const fakeLang = {};
  const lang = fn(fakeLang);
  if (isAtomic(lang)) {
    throw new Error("Immediate children of rec should be non-atomic language");
  }
  Object.entries(lang).forEach(([key, value]) => (fakeLang[key] = value));
  return fakeLang;
};

// Tests --------------------------------------------------------------------------

const digit = alt(
  character("0"),
  character("1"),
  character("2"),
  character("3"),
  character("4"),
  character("5"),
  character("6"),
  character("7"),
  character("8"),
  character("9")
);
const number = rep(digit);
const integer = cat(alt(eps, character("-")), digit, number);

const x = character("x");

// regular language
// L = {x}◦(ϵ⋃L)
// L → x | xL
// L = x◦x★
const rightRecursive = letrec((lang) => cat(x, alt(eps, lang)));

// regular language
// L = (ϵ⋃L)◦{x}
// L → x | Lx
// L = x★◦x
const leftRecursive = letrec((lang) => cat(alt(eps, lang), x));

// context free language
// L = {[}◦(ϵ⋃L)◦{]}
// L → [] | [L]
const leftBracket = character("[");
const rightBracket = character("]");
const middleRecursive = letrec((lang) =>
  cat(leftBracket, alt(eps, lang), rightBracket)
);

assert.deepEqual([["1", "2"]], parse("12", number));
assert.deepEqual([[["-", "1"], "2"]], parse("-12", integer));
assert.deepEqual([["x", "x"]], parse("xx", rightRecursive));
assert.deepEqual([["x", "x"]], parse("xx", leftRecursive));
assert.deepEqual([[["[", ["[", "]"]], "]"]], parse("[[]]", middleRecursive));

assert.deepEqual([["x", ["x", "x"]]], parse("xxx", rep(x)));
assert.deepEqual([["x", ["x", "x"]]], parse("xxx", rightRecursive));
assert.deepEqual([[["x", "x"], "x"]], parse("xxx", leftRecursive));

// L → Exp2
// Exp1 → Exp1 * Exp1 | Exp1 / Exp1 | (Exp1) | Number
// Exp2 → Exp2 + Exp2 | Exp2 - Exp2 | (Exp2) | Exp1
const leftParen = character("(");
const rightParen = character(")");
const multiply = character("*");
const divide = character("/");
const plus = character("+");
const minus = character("-");
const exp1 = letrec((exp1) =>
  alt(
    cat(exp1, multiply, exp1),
    cat(exp1, divide, exp1),
    cat(leftParen, exp1, rightParen),
    number
  )
);
const exp2 = letrec((exp2) =>
  alt(
    cat(exp2, plus, exp2),
    cat(exp2, minus, exp2),
    cat(leftParen, exp2, rightParen),
    exp1
  )
);
const ambiguous = exp2;
// returns 2 trees
assert.deepEqual(
  [
    [
      ["1", "+"],
      [["1", "-"], "1"],
    ],
    [[[["1", "+"], "1"], "-"], "1"],
  ],
  parse("1+1-1", ambiguous)
);

// returns 1 tree
assert.deepEqual(
  [
    [
      ["1", "+"],
      [["1", "*"], "1"],
    ],
  ],
  parse("1+1*1", ambiguous)
);

// returns 1 tree
assert.deepEqual(
  [
    [
      ["1", "+"],
      [["(", [["1", "-"], "1"]], ")"],
    ],
  ],
  parse("1+(1-1)", ambiguous)
);
