# class-recipe

Fast, type-safe class name recipes for any CSS approach, with variants,
compound variants, slots, and a pluggable join function such as
`tailwind-merge`. It also includes `cx`, a drop-in replacement for `clsx`.

```ts
import { cva } from "@lynstack/class-recipe";

const button = cva({
  base: "inline-flex items-center rounded-md font-medium",
  variants: {
    tone: {
      neutral: "bg-gray-100 text-gray-900",
      danger: "bg-red-600 text-white",
    },
    size: {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4",
    },
  },
  defaultVariants: { size: "md" },
});

button({ tone: "danger" });
// => "inline-flex items-center rounded-md font-medium bg-red-600 text-white h-10 px-4"
```

- **Type-safe.** Variant names, options, and slots are inferred from the
  config. An unknown option or slot is a type error, and a variant without
  a default is required.
- **Fast.** A recipe compiles its config once and caches the class name
  of each selection, so most calls are a lookup (see
  [Performance](#performance)).
- **Pluggable.** Bring your own join function, such as `twMerge`, to
  resolve conflicting classes. It runs once per selection, not on every
  call.
- **Small.** No dependencies, ES modules only, and tree-shakable.

## Installation

```sh
npm install @lynstack/class-recipe
```

```sh
pnpm add @lynstack/class-recipe
```

```sh
yarn add @lynstack/class-recipe
```

The package is ESM only and targets ES2022. Its types require TypeScript
5.4 or newer.

## `cx`

`cx` joins class names and skips falsy values. It accepts the same inputs
as `clsx` (strings, numbers, objects, and nested arrays) and returns the
same output, so you can replace `clsx` with it.

```ts
import { cx } from "@lynstack/class-recipe";

cx("btn", isActive && "btn-active", { "btn-disabled": isDisabled });
// => "btn btn-active" when isActive is true and isDisabled is false

cx(["flex", ["items-center", null]], { hidden: false }, 0, "");
// => "flex items-center"
```

## `cva`

`cva` creates a recipe, which returns the class name of one element for a
selection of variants. It is also exported as `createRecipe`. It takes one
config object, unlike the `cva` of `class-variance-authority`, which takes
the base classes as a separate argument.

```ts
import { cva } from "@lynstack/class-recipe";

const badge = cva({
  // Applied whatever the variants.
  base: "inline-flex rounded-full px-2 text-xs",
  // For each variant, the classes of each option.
  variants: {
    tone: {
      neutral: "bg-gray-100 text-gray-700",
      success: "bg-green-100 text-green-800",
      danger: "bg-red-100 text-red-800",
    },
    outlined: {
      true: "ring-1 ring-inset ring-current",
    },
  },
  // Classes added when several variants match at the same time.
  compoundVariants: [
    {
      variants: { tone: ["success", "danger"], outlined: true },
      className: "font-semibold",
    },
  ],
});

badge({ tone: "success" });
// => "inline-flex rounded-full px-2 text-xs bg-green-100 text-green-800"

badge({ tone: "danger", outlined: true, className: "uppercase" });
// => "inline-flex rounded-full px-2 text-xs bg-red-100 text-red-800 ring-1 ring-inset ring-current font-semibold uppercase"
```

### Default and required variants

A variant listed in `defaultVariants` may be omitted, and then uses its
default. A variant without a default is required, so a component cannot
forget to choose, for example, its tone. When every variant has a default,
the argument itself is optional.

```ts
const stack = cva({
  variants: {
    gap: { sm: "gap-2", md: "gap-4" },
    direction: { row: "flex-row", column: "flex-col" },
  },
  defaultVariants: { gap: "md", direction: "column" },
});

stack(); // => "gap-4 flex-col"
stack({ direction: "row" }); // => "gap-4 flex-row"
stack({ gap: undefined }); // => "gap-4 flex-col"
```

### Boolean variants

A variant with an option named `"true"` or `"false"` also accepts the
booleans `true` and `false`, and declares the missing one of those two
options without classes. A variant whose only options are `"true"` and
`"false"` is optional and defaults to `false`.

```ts
const input = cva({
  base: "rounded-md border",
  variants: {
    invalid: { true: "border-red-600", false: "border-gray-300" },
    disabled: { true: "opacity-50" },
  },
});

input(); // => "rounded-md border border-gray-300"
input({ invalid: true, disabled: true });
// => "rounded-md border border-red-600 opacity-50"
```

### Compound variants

Each compound variant names, for some variants, the option or the list of
options it matches, and adds its `className` when all of them match. A
variant it leaves out matches any option. Conditions are checked against
the selection after defaults are applied, and matching compound variants
are added in order, after the classes of the variants. A compound variant
that names an undeclared variant, or lists no declared option for one,
never matches.

### Overriding classes

Pass `className` to add classes after every class of the recipe. These
classes are added, not substituted: one that sets the same CSS property as
a class of the recipe leaves both in the class name. Design the recipe so
that it needs no override (see [Writing conflict-free
recipes](#writing-conflict-free-recipes)), or use a join function such as
`twMerge` (see [Resolving conflicts with
tailwind-merge](#resolving-conflicts-with-tailwind-merge)) to let these
classes replace conflicting ones.

## `sva`

`sva` creates a slot recipe, which styles a component made of several
elements, its slots, and returns an object with the class name of every
slot. It is also exported as `createSlotRecipe`.

```ts
import { sva } from "@lynstack/class-recipe";

const card = sva({
  slots: ["root", "header", "body"],
  base: {
    root: "rounded-lg border",
    header: "font-semibold",
    body: "text-gray-600",
  },
  variants: {
    size: {
      sm: { root: "p-3", header: "text-sm" },
      md: { root: "p-5", header: "text-base" },
    },
    elevated: {
      true: { root: "shadow-md" },
    },
  },
  compoundVariants: [
    {
      variants: { size: "md", elevated: true },
      classNames: { root: "shadow-lg" },
    },
  ],
  defaultVariants: { size: "md" },
});

const classNames = card({ classNames: { body: "italic" } });
classNames.root; // => "rounded-lg border p-5"
classNames.header; // => "font-semibold text-base"
classNames.body; // => "text-gray-600 italic"
```

Every slot is present in the result, as `""` when it has no classes. The
result is frozen, and calling the recipe again with the same variants
returns the same object, which keeps props stable for memoized
components. Passing `classNames` with at least one class returns a new
object.

## Writing conflict-free recipes

By default, classes are joined with `cx`, which keeps every class. When two
classes set the same CSS property, such as `px-4` and `px-2`, the one
defined later in the stylesheet wins, whatever their order in the class
name. A recipe avoids this by construction when it sets each CSS property
of an element in one place:

- **Set each property in `base` or in one variant, never in both.** Give
  every option of the variant its own class, rather than a default in
  `base` that an option overrides.
- **Turn props that set the same property into one variant.** For
  example, derive a `state` of `idle`, `loading`, or `disabled` from the
  `loading` and `disabled` props, rather than a variant for each.
- **Set a property that depends on several variants only in compound
  variants**, with one compound variant for each combination.
- **Add an option rather than an override.** `className`, `classNames`,
  and compound variants add classes after the variants; they never remove
  one.

```ts
// Conflicting: base and the variant both set the border color.
const conflicting = cva({
  base: "rounded-md border border-gray-300",
  variants: { invalid: { true: "border-red-600" } },
});

conflicting({ invalid: true });
// => "rounded-md border border-gray-300 border-red-600"

// Conflict-free: only the variant sets it.
const input = cva({
  base: "rounded-md border",
  variants: {
    invalid: { true: "border-red-600", false: "border-gray-300" },
  },
});

input({ invalid: true }); // => "rounded-md border border-red-600"
```

These rules, with more examples, are available as an agent skill. Install
it in your project with the [skills](https://skills.sh) CLI:

```sh
npx skills add lynstack/class-recipe
```

Or give your coding agent this prompt to use it in the current session
without installing it:

```text
Run `npx skills use lynstack/class-recipe` and follow the generated skill instructions now. Read its complete output, redirecting it to a temporary file first if necessary.
```

The skill also ships in the package, so you can point your agent to
`node_modules/@lynstack/class-recipe/skills/class-recipe/SKILL.md`, or copy
the `skills/class-recipe` folder into your agent's skills folder, such as
`.claude/skills`.

## Resolving conflicts with tailwind-merge

To resolve conflicting classes, such as `px-4` and `px-2`, rather than
avoid them, create the functions with a join function of your choice,
once, in a module of your own:

```ts
// src/lib/recipe.ts
import { createRecipes } from "@lynstack/class-recipe";
import { twMerge } from "tailwind-merge";

export const { cx, cva, sva } = createRecipes({ join: twMerge });
```

```ts
import { cva, cx } from "./lib/recipe";

const button = cva({
  base: "rounded-md px-4 py-2",
  variants: { size: { sm: "px-2 py-1", md: "" } },
});

button({ size: "sm", className: "px-3" }); // => "rounded-md py-1 px-3"
cx("p-2", isLarge && "p-4"); // => "p-4" when isLarge is true
```

A join function receives the class strings in order of precedence, lowest
first, and returns the final class name: any
`(...classNames: readonly string[]) => string` works. It always receives at
least one class string, and never an empty one. A recipe calls it once for
each declared selection of variants and caches the result, then again for
each call that passes `className` or `classNames`, or an undeclared option.
The configured `cx` first joins its inputs like the default `cx`, then
passes the result to the join function. `createRecipes` also returns
`createRecipe` and `createSlotRecipe`, the same functions as the `cva` and
`sva` it returns.

### Turning off the cache

Recipes cache the class names of each declared selection of variants (see
[Performance](#performance)). Pass `cache: false` to build them on every
call instead, alone or together with `join`:

```ts
export const { cx, cva, sva } = createRecipes({ cache: false });
```

Without the cache, a slot recipe returns a new object on every call, even
for the same variants.

## TypeScript

Use `VariantsOf` to type the props of a component from its recipe.

```tsx
import { cva, type VariantsOf } from "@lynstack/class-recipe";
import type { ComponentProps } from "react";

const button = cva({
  base: "inline-flex rounded-md",
  variants: {
    tone: { neutral: "bg-gray-100", danger: "bg-red-600 text-white" },
    size: { sm: "h-8 px-3", md: "h-10 px-4" },
  },
  defaultVariants: { size: "md" },
});

type ButtonProps = ComponentProps<"button"> & VariantsOf<typeof button>;
// VariantsOf<typeof button> is
// { readonly tone: "neutral" | "danger"; readonly size?: "sm" | "md" | undefined }

export function Button({ tone, size, className, ...props }: ButtonProps) {
  return <button className={button({ tone, size, className })} {...props} />;
}
```

The names `className` and `classNames` are reserved and cannot be used as
variant names.

## Performance

Performance is the first goal of this library, and it is measured on every
change to it.

A recipe compiles its config once, when it is created: each variant numbers
its options, so a selection of variants becomes one integer. Calling the
recipe reads each variant's option, looks up its number, and returns the
class name cached under that integer. The first call for a selection, or a
call with an undeclared option, builds the class name by concatenating
precomputed strings. The cache holds at most one entry per combination of
declared options, since an undeclared option is never cached.

### Results

Measured on an Apple M1 Pro with Node.js 24.21.0, against the built
package. Each iteration calls a recipe with six different selections, which
cover default variants, compound variants, boolean variants, and
`className` overrides. Higher is better.

| Recipe        | Iterations per second |
| ------------- | --------------------: |
| With cache    |             2,259,595 |
| Without cache |             1,270,927 |

| Slot recipe   | Iterations per second |
| ------------- | --------------------: |
| With cache    |             1,588,326 |
| Without cache |               569,028 |

Across six input shapes, `cx` runs between 7.8 and 21 million times per
second.

### Method

- The benchmarks first check that each call returns the expected classes.
- They import the package by its name, so they run the built bundle, not
  the sources. The test runner reads module exports through getters, so
  each benchmark holds the function under test in a local binding to keep
  that cost out of the measurement.
- Each benchmark adds up the length of the class names it gets, so the
  measurement adds no work of its own, such as hashing strings.
- The benchmarks assert that a recipe and a slot recipe are faster with
  their cache than without it.

Run them with `pnpm bench`, which builds the package first. They are not
part of CI, because shared runners are too noisy for timing assertions.

## API

| Export             | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `cx`               | Joins class names, skipping falsy values. Compatible with `clsx`.         |
| `cva`              | Creates a recipe that returns the class name of one element.              |
| `sva`              | Creates a slot recipe that returns the class names of several elements.   |
| `createRecipe`     | The same function as `cva`, under a longer name.                          |
| `createSlotRecipe` | The same function as `sva`, under a longer name.                          |
| `createRecipes`    | Returns `cx` and the recipe creators with a custom join or cache setting. |
| `VariantsOf`       | The variants a recipe accepts, without `className` or `classNames`.       |

Every export is documented with TSDoc, so your editor shows the full
reference, including the types of each config and its props.

## Contributing

The project uses pnpm and Node.js 24 LTS.

```sh
pnpm install
pnpm check # build, package checks, typecheck, lint, format check, tests
pnpm bench # build, then benchmarks
pnpm test:coverage # tests with a coverage report
```

Read [AGENTS.md](AGENTS.md) for the project's rules. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## License

[MIT](LICENSE)
