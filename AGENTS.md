# class-recipe

`@lynstack/class-recipe` is a small, dependency-free TypeScript library for
building class names. It exports:

- `cx`, a drop-in replacement for `clsx`.
- `cva` (also exported as `createRecipe`), which maps variants to the class
  name of one element.
- `sva` (also exported as `createSlotRecipe`), which maps variants to the
  class names of several elements (slots).
- `createRecipes`, which returns `cx` and the recipe creators bound to a
  custom join function, such as `twMerge`, or with the cache turned off.

The README and the docs lead with the short names, `cva` and `sva`.

It is a public package, published to npm as an ES module only.

## Layout

- `src/index.ts` is the only entry point; every public export goes through
  it. tsdown bundles it into `dist/index.js` and `dist/index.d.ts`.
- `src/cx.ts`, `src/recipe.ts`, `src/slot-recipe.ts`,
  `src/create-recipes.ts`, `src/join.ts`, and `src/types.ts` hold the public
  API and its types.
- The other modules in `src` are internal. `src/variants.ts` compiles
  variants into numbered options, so a selection becomes an integer key;
  `src/selector.ts` caches results by that key; `src/compile-recipe.ts` and
  `src/compile-slot-recipe.ts` build the recipe functions.
- Tests sit next to the code as `*.test.ts`, and benchmarks as
  `*.bench.ts`. A benchmark imports the package by its name, so it runs
  against the built bundle, never against the sources directly. The
  `*.compare.bench.ts` benchmarks measure the same work in other libraries
  (`clsx`, `classnames`, `class-variance-authority`, `tailwind-variants`),
  which are development dependencies only; the README and the docs report
  their results.
- `scripts` holds Node.js programs for maintainers, written in TypeScript
  that Node.js runs directly. `scripts/report` runs the benchmarks,
  measures the bundle sizes, and saves the results in
  `scripts/report/latest.json`. `scripts/docs` writes those results between
  the `<!-- report:name -->` markers of the README, then builds the docs
  page from the README and the template `scripts/docs/page.html`.
- `fixtures/consumer` is a package that uses the built library; compiling
  it checks the published declarations.
- `skills/class-recipe/SKILL.md` is an agent skill that ships with the
  package. It teaches agents in consuming projects to write recipes whose
  classes never conflict.
- `docs` is the documentation site, plain HTML and CSS served by GitHub
  Pages from that folder. It follows the lynstack design system.
  `docs/index.html` is generated from the README; never edit it by hand.
  Edit the README for content, `scripts/docs/page.html` for the page
  around it, and `scripts/docs/sections.ts` for where each section of the
  README appears in the navigation.

## Commands

Run `pnpm check` before every commit. It builds the package (which runs
publint and Are the Types Wrong), typechecks, compiles the consumer
fixture, lints, checks formatting, runs the tests, and checks that the
README and the docs match `scripts/report/latest.json` and each other.

- `pnpm test` runs the tests.
- `pnpm test:coverage` runs the tests and reports coverage. Use it to
  find behavior without a test; it sets no threshold, and a test written
  only to cover a line adds nothing.
- `pnpm bench` builds the package and runs the benchmarks. Run it after
  every change to `src`.
- `pnpm report` builds the package, runs every benchmark, measures the
  bundle sizes, and writes the results, with the date, into the README and
  the docs. Run it before a release, and after a change that affects speed
  or size; it takes a few minutes.
- `pnpm docs:build` writes the README's report markers and builds
  `docs/index.html` from the README. Run it after every change to the
  README.
- `pnpm format` formats every file.

## Rules

### General

**Ask before making an open decision.** When a choice would be costly to
change later (a public API, a dependency, the build or release process),
propose an option, explain why you recommend it, and wait for approval
before proceeding.

**Treat the public API as a contract.** Everything exported from
`src/index.ts`, including types, follows semantic versioning. Do not
rename, remove, or change the behavior of an export without a major
version. Keep internals out of `src/index.ts`; export a type only when
users need to name it.

**Document every public export with TSDoc.** Describe what it does, its
parameters (`@param`), its type parameters (`@typeParam`), and its return
value (`@returns`), with an `@example` for each function. Keep the README
and the TSDoc in agreement, and check that every example produces the
output it shows.

**Keep the README, the docs, and the skill in agreement.** The README and
`skills/class-recipe/SKILL.md` describe the same API and the same advice.
When a change affects what one of them says, update the other in the same
commit, run `pnpm docs:build` to rebuild the docs, and check that every
example in the README and the skill produces the output it shows. Never
write a measured number by hand; `pnpm report` writes them all.

**Add no runtime dependencies.** The package ships with none. A
development dependency is added only when its value clearly outweighs its
cost.

**Ship ES modules only.** Do not add a CommonJS build. Write relative
imports with the `.js` extension, as `module: nodenext` requires.

**Test behavior and types.** Every behavior has a runtime test, and every
public type has a type test (`expectTypeOf`, or `@ts-expect-error` for
input that must be rejected). A test that only exercises the types still
asserts the runtime outcome.

**Performance comes first.** A recipe and a slot recipe must be faster
with the cache than without it. The benchmarks assert this; never merge a
change that makes them fail. Back every optimization with a benchmark
showing that it matters, and keep the hot paths (`cx` and a cached recipe
call) free of allocations.

**Benchmark soundly.** Check that the code returns the expected classes
before timing it, rotate between several inputs in each iteration, and
measure only the library's work.

**Pin dependencies to exact versions.** Do not use version ranges. Pin
GitHub Actions to a commit SHA, with the version in a comment.

**Use the latest stable release.** Add languages, runtimes, tools, and
dependencies at their latest stable version, never a pre-release (alpha,
beta, RC, or nightly). If a project publishes long-term support (LTS)
releases, use its latest LTS release. Look up the current version when you
add it; do not rely on memory.

**Use only current, recommended practices.** Do not use any feature, API,
library, option, or pattern that its maintainers have deprecated, marked as
legacy, or discouraged, even if it still works. Check the official
documentation for the currently recommended approach before relying on
something. When a dependency deprecates something the project uses,
migrate away from it; do not suppress the warning.

**Comment only when truly necessary.** Code that explains itself needs no
comment. If code needs a comment to be understood, first rewrite it to be
clearer (better names, smaller functions); a comment is never an excuse for
hard-to-read code. When a comment is needed, keep it short and describe the
code as it is now, never its history or earlier versions. TSDoc on public
exports is documentation, not a comment, and is always required.

**Language.** Write code, comments, commit messages, and documentation in
American English.

**Commits.** Use Conventional Commits (`feat:`, `fix:`, `refactor:`,
`docs:`, `test:`, `build:`, `ci:`, `perf:`, `chore:`), with one logical
change per commit. Mark a breaking change with `!` and a
`BREAKING CHANGE:` footer.

**When blocked, stop and report.** Do not disable a check, weaken a test, or
add an exception to get past an obstacle.
