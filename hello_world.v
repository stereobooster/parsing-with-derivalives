type Language = ConcatenatedLanguage | EmptyLanguage | KleeneStarLanguage | SingletonLanguage |
	TrivialLanguage | UnitedLanguage

// Empty language Ø = {}
struct EmptyLanguage {}

const (
	empty = Language(EmptyLanguage{})
)

// Trivial language {ε} - eps-type
struct TrivialLanguage {}

const (
	trivial = Language(TrivialLanguage{})
)

// Singleton language {x} - symbol-type
struct SingletonLanguage {
	symbol rune
}

fn character(s rune) Language {
	return Language(SingletonLanguage{s})
}

// L₁L₂ = {w₁w₂ | w₁∈L₁, w₂∈L₂}
struct ConcatenatedLanguage {
	first  Language
	second Language
}

// identity rules
// Re = eR = R
fn concat(first Language, second Language, rest ...Language) Language {
	mut result := if first is TrivialLanguage {
		second
	} else if second is TrivialLanguage {
		first
	} else {
		Language(ConcatenatedLanguage{first, second})
	}
	for x in rest {
		result = concat(result, x)
	}
	return result
}

// L₁⋃L₂ = {w | w∈L₁ or w∈L₂}
struct UnitedLanguage {
	first  Language
	second Language
}

// identity rules
// R+Ø = Ø+R = R
// R+S = S+R
// (ε+R)*= R*
fn union_lang(first Language, second Language, rest ...Language) Language {
	mut result := if first is EmptyLanguage {
		second
	} else if second is EmptyLanguage {
		first
	} else {
		Language(UnitedLanguage{first, second})
	}
	for x in rest {
		result = union_lang(result, x)
	}
	return result
}

// L* = L⁰⋃Lⁱ⋃L²…
struct KleeneStarLanguage {
	lang Language
}

// identity rules
// Ø* = {ε}
// {ε}* = {ε}
// (R*)*= R*
fn star(lang Language) Language {
	return match lang {
		EmptyLanguage { trivial }
		TrivialLanguage { trivial }
		KleeneStarLanguage { Language(lang) }
		else { Language(KleeneStarLanguage{lang}) }
	}
}

// delta or Nullability function - returns true if the language contains the empty string
fn is_null(lang Language) bool {
	result := match lang {
		// δ(∅) = false
		EmptyLanguage {
			false
		}
		// δ({ε}) = true
		TrivialLanguage {
			true
		}
		// δ(c) = false
		SingletonLanguage {
			false
		}
		// δ(L∗) = true
		KleeneStarLanguage {
			true
		}
		// δ(L1∪L2) = δ(L1) or δ(L2)
		UnitedLanguage {
			is_null(lang.first) || is_null(lang.second)
		}
		// δ(L1∘L2) = δ(L1) and δ(L2)
		ConcatenatedLanguage {
			is_null(lang.first) && is_null(lang.second)
		}
	}
	return result
}

// returns Brzozowski's derivative of Language by symbol
fn derivalive(lang Language, symbol rune) Language {
	result1 := match lang {
		// Dc(∅) = ∅
		EmptyLanguage {
			empty
		}
		// Dc({ε})= ∅
		TrivialLanguage {
			empty
		}
		// Dc(c)={ε}
		// Dc(c′) = ∅ if c ≠ c′
		SingletonLanguage {
			result := if lang.symbol == symbol { trivial } else { empty }
			result
		}
		// Dc(L∗)=Dc(L)∘L∗
		KleeneStarLanguage {
			concat(derivalive(lang.lang, symbol), lang)
		}
		// Dc(L1∪L2)=Dc(L1)∪Dc(L2)
		UnitedLanguage {
			union_lang(derivalive(lang.first, symbol), derivalive(lang.second, symbol))
		}
		// Dc(L1∘L2)=Dc(L1)∘L2 if ε∉L1
		// Dc(L1∘L2)=Dc(L1)∘L2∪Dc(L2) if ε∈L1
		ConcatenatedLanguage {
			result := if is_null(lang.first) { concat(derivalive(lang.first, symbol),
					union_lang(lang.second, derivalive(lang.second, symbol))) } else { concat(derivalive(lang.first,
					symbol), lang.second) }
			result
		}
	}
	return result1
}

const (
	digit  = union_lang(character(`0`), character(`1`), character(`2`), character(`3`),
		character(`4`), character(`5`), character(`6`), character(`7`), character(`8`),
		character(`9`))
	number = star(digit)
)

// Determines whether a string belongs to a language
fn is_match(word string, lang Language) bool {
	return if word.len == 0 {
		is_null(lang)
	} else {
		is_match(word[0..(word.len - 1)], derivalive(lang, word[0]))
	}
}

fn main() {
	if is_match('12345678901', number) {
		println('number')
	} else {
		println('not a number')
	}
}
