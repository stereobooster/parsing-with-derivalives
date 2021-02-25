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
    // if (!target.hasOwnProperty(prop)) {
    //   throw new Error(`${target} has no ${prop} property`)
    // }
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

// other names: nullability function
const containsEmptyString = fix(
  { arg: [{ type: "ref" }], fixValue: false },
  (lang) => {
    switch (lang.type) {
      case T_EMPTY:
        return false;
      case T_EPS:
        return true;
      case T_CHAR:
        return false;
      case T_DELTA:
        return containsEmptyString(lang.lang);
      case T_CAT:
        return (
          containsEmptyString(lang.first) && containsEmptyString(lang.second)
        );
      case T_ALT:
        return (
          containsEmptyString(lang.first) || containsEmptyString(lang.second)
        );
      case T_REP:
        return true;
      default:
        throw new Error("Should not happen");
    }
  }
);

// Dᵥ(L)={w : vw∈L}
// other names: Brzozowski’s derivative
const derivative = memo(
  [
    { type: "ref", arg: 1 },
    { type: "str", arg: 0 },
  ],
  (char, lang) => {
    switch (lang.type) {
      case T_EMPTY:
        return empty;
      case T_EPS:
        return empty;
      case T_CHAR:
        return lang.char === char ? eps : empty;
      case T_DELTA:
        return empty;
      case T_CAT:
        return alt(
          cat(delta(lang.first), () => derivative(char, lang.second)),
          cat(() => derivative(char, lang.first), lang.second)
        );
      case T_ALT:
        return alt(
          () => derivative(char, lang.first),
          () => derivative(char, lang.second)
        );
      case T_REP:
        return cat(() => derivative(char, lang.lang), lang);
      default:
        throw new Error("Should not happen");
    }
  }
);

const recognize = (str, lang) => {
  return str.length === 0
    ? containsEmptyString(lang)
    : recognize(str.slice(1), derivative(str[0], lang));
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
const y = character("y");

// δ(∅) = false
assert.equal(containsEmptyString(empty), false);
// δ(ϵ) = true
assert.equal(containsEmptyString(eps), true);
// δ(c) = false
assert.equal(containsEmptyString(x), false);
// δ(L₁∪L₂) = δ(L₁) or δ(L₂)
assert.equal(containsEmptyString(alt(eps, x)), true);
assert.equal(containsEmptyString(alt(x, eps)), true);
assert.equal(containsEmptyString(alt(x, y)), false);
// δ(L₁∘L₂) = δ(L₁) and δ(L₂)
assert.equal(containsEmptyString(cat(x, y)), false);
assert.equal(containsEmptyString(cat(eps, x)), false);
assert.equal(containsEmptyString(cat(x, eps)), false);
assert.equal(containsEmptyString(alt(x, eps), alt(y, eps)), true);
// δ(L*) = true
assert.equal(containsEmptyString(rep(x)), true);
assert.equal(containsEmptyString(rep(empty)), true);

assert.equal(true, recognize("12", number));
assert.equal(false, recognize("x", number));

assert.equal(true, recognize("3", integer));
assert.equal(false, recognize("x", integer));
assert.equal(false, recognize("-", integer));
assert.equal(true, recognize("-3", integer));
assert.equal(false, recognize("3-", integer));

assert.equal(true, recognize("y", cat(alt(x, eps), y)));
assert.equal(false, recognize("yy", cat(alt(x, eps), y)));
assert.equal(true, recognize("xy", cat(alt(x, eps), y)));
assert.equal(false, recognize("xx", cat(alt(x, eps), y)));
assert.equal(true, recognize("y", cat(y, alt(x, eps))));
assert.equal(false, recognize("x", cat(y, alt(x, eps))));
assert.equal(true, recognize("yx", cat(y, alt(x, eps))));
assert.equal(false, recognize("xy", cat(y, alt(x, eps))));

// test for cicles
// L = {x}◦L - this language contains one string of infinite length,
// it is not possible to build recognizer for it
const rlang = letrec((lang) => cat(x, lang));
assert.equal(rlang, rlang.second);
assert.equal(rlang, rlang.second.second);

// regular language
// L = {x}◦(ϵ⋃L)
// L → x | xL
// L = x◦x★
const rightRecursive = letrec((lang) => cat(x, alt(eps, lang)));
assert.equal(false, recognize("y", rightRecursive));
assert.equal(true, recognize("x", rightRecursive));
assert.equal(true, recognize("xx", rightRecursive));

// regular language
// L = (ϵ⋃L)◦{x}
// L → x | Lx
// L = x★◦x
const leftRecursive = letrec((lang) => cat(alt(eps, lang), x));
assert.equal(false, recognize("y", leftRecursive));
assert.equal(true, recognize("x", leftRecursive));
assert.equal(true, recognize("xx", leftRecursive));

// context free language
// L = {[}◦(ϵ⋃L)◦{]}
// L → [] | [L]
const leftBracket = character("[");
const rightBracket = character("]");
const middleRecursive = letrec((lang) =>
  cat(leftBracket, alt(eps, lang), rightBracket)
);
assert.equal(false, recognize("y", middleRecursive));
assert.equal(true, recognize("[]", middleRecursive));
assert.equal(true, recognize("[[]]", middleRecursive));

// L = x★∘x
const ambigious = cat(rep(x), x);
assert.deepEqual(true, recognize("xxx", ambigious));
