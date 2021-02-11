export const T_EMPTY = Symbol("empty");
export const T_EPS = Symbol("eps");
export const T_CHAR = Symbol("char");
export const T_CAT = Symbol("cat");
export const T_ALT = Symbol("alt");
export const T_REP = Symbol("rep");

export const isEmpty = (lang) => lang.type === T_EMPTY;
export const isEps = (lang) => lang.type === T_EPS;
export const isCharacter = (lang) => lang.type === T_CHAR;
export const isCat = (lang) => lang.type === T_CAT;
export const isAlt = (lang) => lang.type === T_ALT;
export const isRep = (lang) => lang.type === T_REP;

export const toString = (lang, param = undefined) => {
  switch (lang.type) {
    case T_EMPTY:
      return "∅";
    case T_EPS:
      return "ϵ";
    case T_CHAR:
      return lang.char;
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
    // throw new Error("Should not happen");
  }
};

const VISITED = Symbol("visited");
// https://stereobooster.com/posts/referential-vs-structural-comparison/
// ref - referential comparison
// str - structural comparison
const createStore = (type) => (type === "ref" ? new WeakMap() : new Map());
// conf: [{arg: 1, type: str | ref }]
export const memo = (conf, fn) => {
  const argConf = Array.isArray(conf) ? conf : conf.arg;
  if (argConf.length !== fn.length || argConf.length < 1) {
    throw new Error("Wrong memo conf");
  }
  const rootStore = createStore(argConf[0].type);
  return (...args) => {
    let store = rootStore;
    for (let i = 0; i < argConf.length; i++) {
      let key = args[argConf[i].arg === undefined ? i : argConf[i].arg];
      if (argConf[i].key !== undefined) {
        key = argConf[i].key(key);
      }
      if (i < argConf.length - 1) {
        if (!store.has(key)) {
          store.set(key, createStore(argConf[i].type));
        }
        store = store.get(key);
      } else {
        if (!store.has(key)) {
          if (conf.fixValue !== undefined) {
            store.set(key, VISITED);
          }
          store.set(key, fn(...args));
        } else {
          if (conf.fixValue !== undefined && store.get(key) === VISITED) {
            if (
              typeof conf.fixValue === "object" &&
              conf.fixValue.arg !== undefined
            ) {
              store.set(key, args[conf.fixValue.arg]);
            } else {
              store.set(key, conf.fixValue);
            }
          }
          // console.log(`${conf.name} hit cash:`, args.map(toString).join(", "));
        }
        return store.get(key);
      }
    }
  };
};
