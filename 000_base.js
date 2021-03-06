export const T_EMPTY = Symbol("empty");
export const T_EPS = Symbol("epsilon");
export const T_CHAR = Symbol("character");
export const T_CAT = Symbol("concatenation");
export const T_ALT = Symbol("alternation");
export const T_REP = Symbol("repetition");
export const T_DELTA = Symbol("delta");
export const T_RED = Symbol("reduction");

export const isEmpty = (lang) => lang.type === T_EMPTY;
export const isEps = (lang) => lang.type === T_EPS;
export const isCharacter = (lang) => lang.type === T_CHAR;
export const isCat = (lang) => lang.type === T_CAT;
export const isAlt = (lang) => lang.type === T_ALT;
export const isRep = (lang) => lang.type === T_REP;

export const isAtomic = (lang) =>
  isEmpty(lang) || isEps(lang) || isCharacter(lang);

// https://stereobooster.com/posts/referential-vs-structural-comparison/
// ref - referential comparison
// str - structural comparison
const createStore = (type) => (type === "ref" ? new WeakMap() : new Map());

// conf: [{arg?: 1, type: str | ref }]
export const memo = (argConf, fn) => {
  const rootStore = createStore(argConf[0].type);
  return (...args) => {
    let store = rootStore;
    for (let i = 0; i < argConf.length; i++) {
      let key = args[argConf[i].arg === undefined ? i : argConf[i].arg];
      if (i < argConf.length - 1) {
        if (!store.has(key)) {
          store.set(key, createStore(argConf[i + 1].type));
        }
        store = store.get(key);
      } else {
        if (!store.has(key)) {
          store.set(key, fn(...args));
        }
        return store.get(key);
      }
    }
  };
};

const VISITED = Symbol("visited");
const DEFAULT = Symbol("default");
// conf: { argConf: {arg?: 1, type: str | ref, key?: () => {} }, fixValue: ... }
export const fix = (conf, fn) => {
  const argConf = conf.arg;
  // if (argConf.length !== fn.length || argConf.length < 1) {
  //   throw new Error("Wrong memo conf");
  // }
  let rootStore = createStore(argConf[0].type);
  // let depth = 0;
  return (...args) => {
    // if (!rootStore) rootStore = createStore(argConf[0].type);
    let store = rootStore;
    for (let i = 0; i < argConf.length; i++) {
      let key = args[argConf[i].arg === undefined ? i : argConf[i].arg];
      key = key || DEFAULT;
      if (i < argConf.length - 1) {
        if (!store.has(key)) {
          store.set(key, createStore(argConf[i + 1].type));
        }
        store = store.get(key);
      } else {
        // console.log(Array(depth + 1).join(" ") + depth );
        // depth++;
        let result;
        if (store.get(key) === VISITED) {
          result = conf.fixValue;
        } else {
          store.set(key, VISITED);
          result = fn(...args);
          store.set(key, result);
        }
        // depth--;
        // if (depth === 0) {
        //   rootStore = undefined;
        // }
        return result;
      }
    }
  };
};

export const toString = fix(
  { arg: [{ type: "ref" }, { type: "str" }], fixValue: "∞" },
  (lang, param = undefined) => {
    switch (lang.type) {
      case T_EMPTY:
        return "∅";
      case T_EPS:
        return "ϵ";
      case T_CHAR:
        return lang.char;
      case T_DELTA:
        return "δ";
      case T_RED:
        return "→";
      case T_CAT: {
        const result = `${toString(lang.first, T_CAT)}∘${toString(
          lang.second,
          T_CAT
        )}`;
        return param === T_CAT ? result : `(${result})`;
      }
      case T_ALT: {
        const result = `${toString(lang.first, T_ALT)}⋃${toString(
          lang.second,
          T_ALT
        )}`;
        return param === T_ALT ? result : `(${result})`;
      }
      case T_REP:
        return `[${toString(lang.lang)}]★`;
      default:
        return lang;
    }
  }
);

// conf: { argConf: {arg?: 1, type: str | ref, key?: () => {} }, fixValue?: ... }
// export const memoFix = (conf, fn) => {
//   const argConf = Array.isArray(conf) ? conf : conf.arg;
//   if (argConf.length !== fn.length || argConf.length < 1) {
//     throw new Error("Wrong memo conf");
//   }
//   const rootStore = createStore(argConf[0].type);
//   return (...args) => {
//     let store = rootStore;
//     for (let i = 0; i < argConf.length; i++) {
//       let key = args[argConf[i].arg === undefined ? i : argConf[i].arg];
//       if (argConf[i].key !== undefined) {
//         key = argConf[i].key(key);
//       }
//       if (i < argConf.length - 1) {
//         if (!store.has(key)) {
//           store.set(key, createStore(argConf[i].type));
//         }
//         store = store.get(key);
//       } else {
//         if (!store.has(key)) {
//           if (conf.fixValue !== undefined) {
//             store.set(key, VISITED);
//           }
//           store.set(key, fn(...args));
//         } else {
//           if (conf.fixValue !== undefined && store.get(key) === VISITED) {
//             if (
//               typeof conf.fixValue === "object" &&
//               conf.fixValue.arg !== undefined
//             ) {
//               store.set(key, args[conf.fixValue.arg]);
//             } else {
//               store.set(key, conf.fixValue);
//             }
//           }
//           // console.log(`${conf.name} hit cash:`, args.map(toString).join(", "));
//         }
//         return store.get(key);
//       }
//     }
//   };
// };
