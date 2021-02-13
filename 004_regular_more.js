import { toString } from "./000_base.js";
import { character, cat_base, alt_base, rep, eps } from "./001_regular.js";

// PCRE: abc = abc
const cat = (...rest) => {
  if (rest.length === 1) {
    if (typeof rest[0] !== "string") throw new Error("Argument error");
    rest = rest[0].split("").map(character);
  }
  return rest.reduce(cat_base);
};

// PCRE: [abc] = a⋃b⋃c
const alt = (...rest) => {
  if (rest.length === 1) {
    if (typeof rest[0] !== "string") throw new Error("Argument error");
    rest = rest[0].split("").map(character);
  }
  return rest.reduce(alt_base);
};

// PCRE: x*   = x*
// const rep  = ...

// PCRE: x+   = xx*
const oneOrMore = (lang) => cat(lang, rep(lang));

// PCRE: x?   = x⋃ϵ
const oneOrZero = (lang) => alt(lang, eps);

// PCRE: [^x] = Σ - x

// PCRE: .    = Σ
