import { strict as assert } from "assert";
import {
  T_ALT,
  T_CAT,
  T_CHAR,
  T_EMPTY,
  T_EPS,
  T_REP,
  isEmpty,
  isEps,
  isRep,
} from "./000_base.js";

// empty language - ∅ = {}
export const empty = { type: T_EMPTY };

// trivial language - ϵ = {ε}
export const eps = { type: T_EPS };

// singleton language - {x}
export const character = (char) => ({ type: T_CHAR, char });

// language concatenation - L₁◦L₂ = {w₁w₂ : w₁∈L₁ and w₂∈L₂}
export const cat_base = (first, second) => {
  if (isEmpty(first) || isEmpty(second)) {
    return empty;
  } else if (isEps(first)) {
    return second;
  } else if (isEps(second)) {
    return first;
  } else {
    return { type: T_CAT, first, second };
  }
};
const cat = (...rest) => rest.reduce(cat_base);

// language union - L₁⋃L₂ = {w : w∈L₁ or w∈L₂}
export const alt_base = (first, second) => {
  if (isEmpty(first)) {
    return second;
  } else if (isEmpty(second)) {
    return first;
  } else {
    return { type: T_ALT, first, second };
  }
};
const alt = (...rest) => rest.reduce(alt_base);

// Lⁱ = {w₁w₂...wᵢ : wₓ∈L for 1 ≤ x ≤ i }
// Kleene star - L* = L⁰⋃Lⁱ⋃L²…
export const rep = (lang) => {
  if (isEmpty(lang)) {
    return eps;
  }
  if (isEps(lang)) {
    return eps;
  }
  if (isRep(lang)) {
    return lang;
  }
  return { type: T_REP, lang };
};

// δ(L) = true if ϵ∈L
// δ(L) = false if ϵ∉L
// other names: nullability function, delta
const containsEmptyString = (lang) => {
  switch (lang.type) {
    case T_EMPTY:
      return false;
    case T_EPS:
      return true;
    case T_CHAR:
      return false;
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
};

// Dᵥ(L)={w : vw∈L}
// other names: Brzozowski’s derivative
const derivative = (char, lang) => {
  switch (lang.type) {
    case T_EMPTY:
      return empty;
    case T_EPS:
      return empty;
    case T_CHAR:
      return lang.char === char ? eps : empty;
    case T_CAT:
      if (containsEmptyString(lang.first)) {
        return alt(
          cat(derivative(char, lang.first), lang.second),
          derivative(char, lang.second)
        );
      } else {
        return cat(derivative(char, lang.first), lang.second);
      }
    case T_ALT:
      return alt(derivative(char, lang.first), derivative(char, lang.second));
    case T_REP:
      return cat(derivative(char, lang.lang), lang);
    default:
      throw new Error("Should not happen");
  }
};

const recognize = (str, lang) => {
  return str.length === 0
    ? containsEmptyString(lang)
    : recognize(str.slice(1), derivative(str[0], lang));
};

// Tests --------------------------------------------------------------------------

// assert.equal(character("x"), character("x"));

const x = character("x");
const y = character("y");

// R = R
// assert.equal(cat(x, y), cat(x, y));
// Rϵ = ϵR = R
assert.equal(cat(eps, x), x);
assert.equal(cat(x, eps), x);
// R∅ = ∅R = ∅
assert.equal(cat(empty, x), empty);
assert.equal(cat(x, empty), empty);

// R = R
// assert.equal(alt(y, x), alt(y, x));
// R⋃R = R
// assert.equal(alt(x, x), x);
// R⋃S = S⋃R
// assert.equal(alt(y, x), alt(y, x));
// R⋃Ø = Ø⋃R = R
assert.equal(alt(empty, x), x);
assert.equal(alt(x, empty), x);

// R
// assert.equal(rep(x), rep(x));
// Ø* = ϵ
assert.equal(rep(empty), eps);
// ϵ* = ϵ
assert.equal(rep(empty), eps);
// (R*)*= R*
const r = rep(x);
assert.equal(rep(r), r);

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

// Dᵥ(∅) = ∅
assert.equal(derivative("x", empty), empty);
// Dᵥ(ϵ) = ∅
assert.equal(derivative("x", eps), empty);
// Dᵥ(v) = ϵ
assert.equal(derivative("x", x), eps);
// Dᵥ(v′) = ∅ if v≠v′
assert.equal(derivative("y", x), empty);
// Dᵥ(L*) = Dᵥ(L)∘L*
assert.equal(derivative("x", r), derivative("x", r));
assert.equal(derivative("x", r), r);
assert.equal(derivative("y", r), empty);
// Dᵥ(L₁∪L₂) = Dᵥ(L₁)∪Dᵥ(L₂)
assert.equal(derivative("y", alt(x, y)), eps);
// Dᵥ(L₁∘L₂) = Dᵥ(L₁)∘L₂∪Dᵥ(L₂) if ϵ∈L₁
assert.equal(derivative("y", cat(alt(x, eps), y)), eps);
assert.equal(derivative("y", cat(alt(y, eps), x)), x);
assert.equal(derivative("x", cat(alt(x, eps), y)), y);
// Dᵥ(L₁∘L₂) = Dᵥ(L₁)∘L₂ if ϵ∉L₁
assert.equal(derivative("y", cat(x, y)), empty);
assert.equal(derivative("y", cat(y, x)), x);

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
