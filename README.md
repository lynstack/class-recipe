# class-recipe

[![npm](https://img.shields.io/npm/v/@lynstack/class-recipe)](https://www.npmjs.com/package/@lynstack/class-recipe)
[![CI](https://github.com/lynstack/class-recipe/actions/workflows/ci.yml/badge.svg)](https://github.com/lynstack/class-recipe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Fast, type-safe class name recipes for any CSS approach, with variants,
compound variants, slots, and a pluggable join function such as
`tailwind-merge`. It also includes `cx`, a drop-in replacement for `clsx`.

[Documentation](https://lynstack.github.io/class-recipe/)

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

- **Fast.** A recipe compiles its config once and caches the class name of
  each selection, so most calls are a lookup. It runs about <!-- report:speedup -->10<!-- /report:speedup -->
  times as many calls per second as `class-variance-authority` (see
  [Performance](#performance)).
- **Type-safe.** Variant names, options, and slots are inferred from the
  config. An unknown option or slot is a type error, and a variant without
  a default is required, so a component cannot forget to choose it.
- **Pluggable.** Bring your own join function, such as `twMerge`, to
  resolve conflicting classes. It runs once per selection, not on every
  call.
- **Small.** <!-- report:size-all -->1.9 kB<!-- /report:size-all --> minified
  and gzipped for the whole package, <!-- report:size-cx -->0.2 kB<!-- /report:size-cx -->
  for `cx` alone. No dependencies, ES modules only, and tree-shakable (see
  [Size](#size)).

## Contents

- [Installation](#installation)
- [Why class-recipe](#why-class-recipe)
- [`cx`](#cx)
- [`cva`](#cva)
- [`sva`](#sva)
- [Writing conflict-free recipes](#writing-conflict-free-recipes)
- [Resolving conflicts with tailwind-merge](#resolving-conflicts-with-tailwind-merge)
- [TypeScript](#typescript)
- [Migrating from class-variance-authority](#migrating-from-class-variance-authority)
- [Performance](#performance)
- [Size](#size)
- [API](#api)

## Installation

```sh tab=npm
npm install @lynstack/class-recipe
```

```sh tab=pnpm
pnpm add @lynstack/class-recipe
```

```sh tab=yarn
yarn add @lynstack/class-recipe
```

The package is ESM only and targets ES2022. Its types require TypeScript
5.4 or newer.

## Why class-recipe

class-recipe solves the same problem as
[class-variance-authority](https://cva.style) and
[tailwind-variants](https://www.tailwind-variants.org): turning component
props into class names. It differs from them in these ways:

<!-- report:why -->

|                            | class-recipe `1.0.0`      | class-variance-authority `0.7.1` | tailwind-variants `3.3.1`, lite |
| -------------------------- | ------------------------- | -------------------------------- | ------------------------------- |
| Slots                      | Yes                       | No                               | Yes                             |
| Variant without a default  | Required by its type      | Optional                         | Optional                        |
| Conflict resolution        | Any join function, cached | Call `twMerge` on the result     | `tailwind-merge`, built in      |
| Recipe calls per second    | 2.3 million               | 243,000                          | 170,000                         |
| Size, minified and gzipped | 1.9 kB                    | 0.5 kB                           | 3.6 kB                          |

<!-- /report:why -->

The calls per second come from the [benchmarks](#compared-with-other-libraries),
and the sizes from [Size](#size).

Choose class-variance-authority if bundle size matters more to you than
call speed and you need no slots. Choose tailwind-variants if you need to
compose recipes with `extend` or apply classes to several slots at once
with `compoundSlots`; class-recipe has neither.

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
selection of variants. It is also exported as `createRecipe`.

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
});

badge({ tone: "success" });
// => "inline-flex rounded-full px-2 text-xs bg-green-100 text-green-800"

badge({ tone: "danger", outlined: true, className: "uppercase" });
// => "inline-flex rounded-full px-2 text-xs bg-red-100 text-red-800 ring-1 ring-inset ring-current uppercase"
```

Classes are added in this order: `base`, then each variant in the order
the config declares it, then the matching compound variants, then
`className`.

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

A compound variant adds its `className` when several variants have
particular options at the same time. For each variant it names, it gives
one option or a list of options; a variant it leaves out matches any
option.

```ts
const button = cva({
  base: "inline-flex rounded-md",
  variants: {
    tone: { neutral: "bg-gray-100", danger: "bg-red-600 text-white" },
    size: { sm: "h-8 px-3", md: "h-10 px-4" },
    outlined: { true: "ring-1 ring-inset" },
  },
  compoundVariants: [
    // When tone is danger and size is md.
    { variants: { tone: "danger", size: "md" }, className: "font-semibold" },
    // When tone is neutral and outlined is true, whatever the size.
    {
      variants: { tone: "neutral", outlined: true },
      className: "ring-gray-300",
    },
  ],
  defaultVariants: { size: "md" },
});

button({ tone: "danger" });
// => "inline-flex rounded-md bg-red-600 text-white h-10 px-4 font-semibold"

button({ tone: "neutral", size: "sm", outlined: true });
// => "inline-flex rounded-md bg-gray-100 h-8 px-3 ring-1 ring-inset ring-gray-300"
```

Conditions are checked after defaults are applied, which is why the first
call matches `size: "md"` without passing it. Matching compound variants
are added in the order they are declared. A compound variant that names an
undeclared variant, or lists no declared option for one, never matches.

### Overriding classes

Pass `className` to add classes after every class of the recipe. These
classes are added, not substituted: one that sets the same CSS property as
a class of the recipe leaves both in the class name. Design the recipe so
that it needs no override (see [Writing conflict-free
recipes](#writing-conflict-free-recipes)), or use a join function such as
`twMerge` (see [Resolving conflicts with
tailwind-merge](#resolving-conflicts-with-tailwind-merge)) to let these
classes replace conflicting ones.

### Variant keys

A recipe lists the names of its variants in `variantKeys`, a frozen array
typed with those names. Use it to split a component's props into the
recipe's variants and the rest, without writing the names again.

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

button.variantKeys; // => ["tone", "size"]

type ButtonProps = ComponentProps<"button"> & VariantsOf<typeof button>;

export function Button({ className, ...props }: ButtonProps) {
  const buttonProps: Partial<typeof props> = { ...props };
  for (const key of button.variantKeys) {
    delete buttonProps[key];
  }
  return (
    <button {...buttonProps} className={button({ ...props, className })} />
  );
}
```

The recipe reads only its variants and `className`, so it can take every
prop of the component. A slot recipe has the same property.

### Undeclared options

The types accept only the options the config declares. A value from
untyped data can still bypass them; an option the config does not declare
adds no classes for its variant, and its class name is built on every call
instead of being cached.

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
      classNames: { header: "border-b" },
    },
  ],
  defaultVariants: { size: "md" },
});

const elevated = card({ elevated: true });
elevated.root; // => "rounded-lg border p-5 shadow-md"
elevated.header; // => "font-semibold text-base border-b"
elevated.body; // => "text-gray-600"

const small = card({ size: "sm", classNames: { body: "italic" } });
small.root; // => "rounded-lg border p-3"
small.header; // => "font-semibold text-sm"
small.body; // => "text-gray-600 italic"

card.variantKeys; // => ["size", "elevated"]
```

A slot recipe follows the same rules as a recipe, with an object of
classes per slot wherever a recipe takes a string, and `classNames`
instead of `className`.

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

Use `VariantsOf` to type the props of a component from its recipe or slot
recipe.

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
variant names. The package also exports the types of every config, props
object, and recipe, such as `RecipeConfig` and `SlotRecipeProps`, for
code that builds on them.

## Migrating from class-variance-authority

The concepts are the same, so most recipes move over with a few
mechanical changes:

| class-variance-authority              | class-recipe                                            |
| ------------------------------------- | ------------------------------------------------------- |
| `cva(base, config)`                   | `cva({ base, ...config })`                              |
| Arrays of classes                     | One string of classes for `base` and for each option    |
| `{ intent: "primary", class: "..." }` | `{ variants: { intent: "primary" }, className: "..." }` |
| `class` or `className` prop           | `className` prop                                        |
| `VariantProps<typeof button>`         | `VariantsOf<typeof button>`                             |
| `twMerge(button(props))`              | `createRecipes({ join: twMerge })`, once                |
| `cx` (`clsx`)                         | `cx`                                                    |

```ts tab=Before
// class-variance-authority
const button = cva("rounded-md font-medium", {
  variants: {
    intent: { primary: "bg-blue-600 text-white", secondary: "bg-gray-100" },
    size: { sm: "h-8 px-3", md: "h-10 px-4" },
  },
  compoundVariants: [{ intent: "primary", size: "md", class: "shadow-sm" }],
  defaultVariants: { intent: "primary", size: "md" },
});
```

```ts tab=After
// class-recipe
const button = cva({
  base: "rounded-md font-medium",
  variants: {
    intent: { primary: "bg-blue-600 text-white", secondary: "bg-gray-100" },
    size: { sm: "h-8 px-3", md: "h-10 px-4" },
  },
  compoundVariants: [
    { variants: { intent: "primary", size: "md" }, className: "shadow-sm" },
  ],
  defaultVariants: { intent: "primary", size: "md" },
});
```

Two behaviors change:

- **A variant without a default becomes required.** Every call that omits
  it is a type error. Add a default to keep it optional.
- **A boolean variant without a default uses its `false` option.**
  class-variance-authority adds no classes for it when the prop is
  omitted.

## Performance

<!-- report:measurement -->

> **Measured on October 3, 2026.**
>
> On an Apple M1 Pro with Node.js 24.21.0, against class-recipe `1.0.0`,
> class-variance-authority `0.7.1`, tailwind-variants `3.3.1`,
> tailwind-merge `3.7.0`, clsx `2.1.1`, and classnames `2.5.1`.

<!-- /report:measurement -->

Performance is the first goal of this library, and it is measured on every
change to it.

A recipe compiles its config once, when it is created: each variant numbers
its options, so a selection of variants becomes one integer. Calling the
recipe reads each variant's option, looks up its number, and returns the
class name cached under that integer. The first call for a selection, or a
call with an undeclared option, builds the class name by concatenating
precomputed strings.

The cache belongs to the recipe, so create each recipe once, at the top
level of a module, not inside a component. It grows with the selections
the recipe is called with, up to one entry per combination of declared
options.

### Compared with other libraries

Each benchmark runs against the built package. Each iteration calls the
same recipe, written for each library, with six different selections, which
cover default variants, compound variants, boolean variants, and class
overrides. Every library returns the same classes. Higher is better.

<!-- report:comparison -->

| Recipe                           | Iterations per second | With `tailwind-merge` |
| -------------------------------- | --------------------: | --------------------: |
| class-recipe `1.0.0`             |             2,308,555 |               671,858 |
| class-variance-authority `0.7.1` |               242,615 |               157,041 |
| tailwind-variants `3.3.1`        |               169,587 |               170,460 |

| Slot recipe               | Iterations per second | With `tailwind-merge` |
| ------------------------- | --------------------: | --------------------: |
| class-recipe `1.0.0`      |             1,300,048 |               846,772 |
| tailwind-variants `3.3.1` |               143,496 |               141,459 |

<!-- /report:comparison -->

Without `tailwind-merge`, tailwind-variants runs from its `lite` entry
point. With it, class-variance-authority calls `twMerge` on every result,
as its documentation recommends. class-variance-authority has no slots.

<!-- report:cx -->

Across every input, `cx`, `clsx`, and `classnames` stay within 30% of each
other, and none is fastest on every input. Calls per second, in millions:

| Input                 | class-recipe `1.0.0` | clsx `2.1.1` | classnames `2.5.1` |
| --------------------- | -------------------: | -----------: | -----------------: |
| Strings               |                 16.5 |         15.4 |               14.8 |
| An object             |                 11.4 |         13.3 |               14.2 |
| An array              |                 15.3 |         13.4 |               13.8 |
| Nested arrays         |                  9.6 |          9.1 |                8.3 |
| Mixed values          |                  7.8 |          7.1 |                7.2 |
| A component's classes |                 15.6 |         13.4 |               13.7 |

<!-- /report:cx -->

### With and without the cache

<!-- report:cache -->

| Recipe        | Iterations per second |
| ------------- | --------------------: |
| With cache    |             2,246,806 |
| Without cache |             1,237,455 |

| Slot recipe   | Iterations per second |
| ------------- | --------------------: |
| With cache    |             1,548,942 |
| Without cache |               557,184 |

<!-- /report:cache -->

### Method

- The benchmarks first check that each call returns the expected classes,
  and that every library compared returns the same ones.
- They import the package by its name, so they run the built bundle, not
  the sources. The test runner reads module exports through getters, so
  each benchmark holds the function under test in a local binding to keep
  that cost out of the measurement.
- Each benchmark adds up the length of the class names it gets, so the
  measurement adds no work of its own, such as hashing strings.
- The benchmarks assert that a recipe and a slot recipe are faster with
  their cache than without it.

Run them with `pnpm bench`, which builds the package first, or with
`pnpm report`, which also writes the results above. The comparisons with
other libraries are in the `*.compare.bench.ts` files. The
benchmarks are not part of CI, because shared runners are too noisy for
timing assertions.

## Size

<!-- report:size -->

Each row bundles only the named exports, minified with Rolldown `1.2.12` and
compressed with gzip, so it shows what an app that imports them ships.

| Imports    | Minified | Minified and gzipped |
| ---------- | -------: | -------------------: |
| `cx`       |   0.4 kB |               0.2 kB |
| `cva`      |   3.3 kB |               1.4 kB |
| `sva`      |   3.7 kB |               1.6 kB |
| Everything |   4.7 kB |               1.9 kB |

Measured the same way, class-variance-authority with `clsx` takes 0.5 kB,
tailwind-variants takes 3.6 kB from its `lite` entry point,
and `tailwind-merge`, which any of them may add, takes 8.5 kB.

<!-- /report:size -->

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
pnpm docs:build # write the docs site from this README
pnpm report # measure speed and size, then update this README and the docs
```

Read [AGENTS.md](AGENTS.md) for the project's rules. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## License

[MIT](LICENSE)
