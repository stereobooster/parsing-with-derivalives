# Parsing with derivatives

- blog post http://matt.might.net/articles/parsing-with-derivatives/
- video https://www.youtube.com/watch?v=ZzsK8Am6dKU
- paper http://matt.might.net/papers/might2011derivatives.pdf
- implementation http://www.ucombinator.org/projects/parsing/
- another implementation https://github.com/webyrd/relational-parsing-with-derivatives

## Notation

| Name             | Regular expression | Chomskian grammar | PCRE                   | Language                      |
| ---------------- | ------------------ | ----------------- | ---------------------- | ----------------------------- |
| empty language   | `∅`                |                   |                        | `{}`                          |
| trivial language | `ϵ`                | S → ε             | `^$`¹ or `^.{0}$`¹     | `{ε}`                         |
| singleton lang.  | `a`                | S → a             | `^a$`                  | `{a}`                         |
| concatenation    | `ab` or `a∘b`      | S → ab            | `^ab$`                 | `{ab}` or `{a}∘{b}`           |
| union            | `a+b` or `a⋃b`     | S → a \| b        | `^[ab]$` or `^(a\|b)$` | `{a,b}` or `{a}⋃{b}`          |
| Kleene star²     | `a*` or `a★`       | S → ε \| aS       | `^a*$` or `^a{0,}$`    | `{ε,a,aa, ...}`               |
| Kleene plus      | `aa*` or `a∘a★`    | S → a \| aS       | `^a+$` or `^a{1,}$`    | `{a,aa, ...}`                 |
|                  | `a+ϵ` or `a⋃ϵ`     | S → a \| ε        | `^a?$` or `^a{0,1}$`   | `{a,ε}` or `{a}⋃{ε}`          |
| alphabet         |                    | S → a \| b \| ... | `^.$`¹                 | `{a,b,c,d, ...}` or `Σ`       |
| difference       |                    | S → b \| c \| ... | `^[^a]$`¹              | `{b,c,d,e, ...}` or `Σ - {a}` |

¹ - approximation
² - repetition

[PCRE](http://www.pcre.org/current/doc/html/pcre2pattern.html#SEC1) - Perl Compatible Regular Expressions

```
*      0 or more quantifier
+      1 or more quantifier; also "possessive quantifier"
?      0 or 1 quantifier; also quantifier minimizer
^      assert start of string (or line, in multiline mode)
$      assert end of string (or line, in multiline mode)
.      match any character except newline (by default)
[      start character class definition
|      start of alternative branch
^      negate the class, but only if the first character
]      terminates the character class
```

Idea: use new node of type "recursive" instead of `letrec` function
