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

// const cons1 = (x1, x2) => [x1, x2];
const cons2 = (x1, x2) =>
  [x1, x2]
    .filter((x) => !Array.isArray(x) || x.length > 0)
    .map((x) => (Array.isArray(x) && x.length === 1 ? x[0] : x));

const cons = cons2;
const forset = (x1, x2) => {
  const length = Math.min(x1.length, x2.length);
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(cons(x1[i], x2[i]));
  }
  return removeDuplicates(result);
};

const emptyTree = [];
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
        // return emptyTree;
        return [[]];
      case T_ALT:
        return union(parseNull(language.first), parseNull(language.second));
      case T_CAT:
        return forset(parseNull(language.first), parseNull(language.second));
      default:
        throw new Error("Should not happen");
    }
  }
);

const parse = (str, lang) => {
  return str.length === 0
    ? parseNull(lang)
    : parse(str.slice(1), derivative(str[0], lang));
};

const letrec = (fn) => {
  const fakeLang = {}; // { recursive: true };
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

// with cons1
// assert.deepEqual([["1", ["2", []]]], parse("12", number));
// assert.deepEqual(
//   [
//     [
//       ["-", "1"],
//       ["2", []],
//     ],
//   ],
//   parse("-12", integer)
// );
// assert.deepEqual([["x", ["x", []]]], parse("xx", rightRecursive));
// assert.deepEqual([[[[], "x"], "x"]], parse("xx", leftRecursive));
// assert.deepEqual(
//   [[["[", [["[", []], "]"]], "]"]],
//   parse("[[]]", middleRecursive)
// );

// with cons2
assert.deepEqual([["1", "2"]], parse("12", number));
assert.deepEqual([[["-", "1"], "2"]], parse("-12", integer));
assert.deepEqual([["x", "x"]], parse("xx", rightRecursive));
assert.deepEqual([["x", "x"]], parse("xx", leftRecursive));
assert.deepEqual([[["[", ["[", "]"]], "]"]], parse("[[]]", middleRecursive));

assert.deepEqual([["x", ["x", "x"]]], parse("xxx", rep(x)));
assert.deepEqual([["x", ["x", "x"]]], parse("xxx", rightRecursive));
assert.deepEqual([[["x", "x"], "x"]], parse("xxx", leftRecursive));
