---
name: class-recipe
description: Write conflict-free component styles with @lynstack/class-recipe (cva or createRecipe, sva or createSlotRecipe, cx) when classes are joined without tailwind-merge. Use this skill whenever you create or change a component whose class names depend on props or state in a project that imports @lynstack/class-recipe, whenever you add or edit a variant, compound variant, or slot, and whenever you are tempted to override a recipe's classes with className, even if the user does not mention the library by name.
---

# Conflict-free recipes with class-recipe

By default, `@lynstack/class-recipe` joins classes with `cx`, which keeps
every class. Nothing removes a conflicting class, so for
`"px-4 px-2"` the winner is whichever rule comes later in the stylesheet,
not in the class string. The result looks right in one place and wrong in
another, and nothing in the code tells you which.

The rules below make conflicts impossible by construction: every CSS
property of an element is set in exactly one place, so there is never
anything to resolve.

The examples use `cva` and `sva`. `createRecipe` and `createSlotRecipe`
are the same functions under longer names; use whichever names the
project already uses.

**Check the setup first.** If the project creates its functions with
`createRecipes({ join: twMerge })` (or another merging join), conflicts
are resolved for it, and these rules are good practice rather than
required. If it imports `cva` or `createRecipe` straight from
`@lynstack/class-recipe`, or uses a plain join, follow them.

## Do

### Set each CSS property of an element in one place

A property lives either in `base` or in one variant, never in both and
never in two variants. Before you add a class, check which property it
sets and whether something else already sets it.

```ts
// Wrong: base sets the border color, and `invalid` sets it again.
const input = cva({
  base: "rounded-md border border-gray-300",
  variants: { invalid: { true: "border-red-600" } },
});
input({ invalid: true });
// => "rounded-md border border-gray-300 border-red-600"

// Right: the border color lives only in the variant, one class per option.
const input = cva({
  base: "rounded-md border",
  variants: {
    invalid: { true: "border-red-600", false: "border-gray-300" },
  },
});
input(); // => "rounded-md border border-gray-300"
input({ invalid: true }); // => "rounded-md border border-red-600"
```

### Put shared classes in `base`, and the differences in variants

A class that every option repeats belongs in `base`. A class that differs
between options belongs in the variant, and in every option of it. No
class string is written twice.

### Derive one variant when several props set the same property

When two props would both set the same property, do not give each its own
variant. Turn them into one variant in the component, so the recipe sees a
single, unambiguous choice.

```tsx
// Wrong: `loading` and `disabled` both set the cursor and the opacity.
// variants: {
//   loading: { true: "cursor-wait opacity-75" },
//   disabled: { true: "cursor-not-allowed opacity-50" },
// }

const button = cva({
  base: "inline-flex items-center rounded-md px-4 py-2",
  variants: {
    state: {
      idle: "cursor-pointer",
      loading: "cursor-wait opacity-75",
      disabled: "cursor-not-allowed opacity-50",
    },
  },
  defaultVariants: { state: "idle" },
});

function buttonState(loading: boolean, disabled: boolean) {
  if (disabled) {
    return "disabled";
  }
  return loading ? "loading" : "idle";
}

export function Button({ loading = false, disabled = false, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={button({ state: buttonState(loading, disabled) })}
    />
  );
}
```

### Let a property that depends on two variants live only in compound variants

If a property depends on a combination, such as the padding of a button
that depends on both its size and whether it holds only an icon, no single
variant sets it. Each compound variant covers one combination and sets it
there.

```ts
const button = cva({
  base: "inline-flex items-center justify-center rounded-md",
  variants: {
    size: { sm: "h-8 text-sm", md: "h-10 text-base" },
    iconOnly: { true: "", false: "" },
  },
  compoundVariants: [
    { variants: { size: "sm", iconOnly: false }, className: "px-3" },
    { variants: { size: "sm", iconOnly: true }, className: "w-8" },
    { variants: { size: "md", iconOnly: false }, className: "px-4" },
    { variants: { size: "md", iconOnly: true }, className: "w-10" },
  ],
  defaultVariants: { size: "md" },
});

button(); // => "inline-flex items-center justify-center rounded-md h-10 text-base px-4"
button({ size: "sm", iconOnly: true });
// => "inline-flex items-center justify-center rounded-md h-8 text-sm w-8"
```

### Declare an option even when it adds no classes

Write `""` (or `{}` in a slot recipe) for an option with no classes of its
own, such as `plain` or `none`. Every choice then has a name callers can
pass, and the type lists it.

### Style several elements with one slot recipe

When the same variants style more than one element, use `sva`, so one
choice of `tone` sets the root, the icon, and the title together. Keep
class strings that never vary as module-level constants rather than
recipes.

```ts
const alert = sva({
  slots: ["root", "icon", "title"],
  base: {
    root: "flex gap-3 rounded-lg border p-4",
    icon: "size-5 shrink-0",
    title: "font-semibold",
  },
  variants: {
    tone: {
      info: {
        root: "border-blue-200 bg-blue-50",
        icon: "text-blue-600",
        title: "text-blue-900",
      },
      danger: {
        root: "border-red-200 bg-red-50",
        icon: "text-red-600",
        title: "text-red-900",
      },
    },
  },
  defaultVariants: { tone: "info" },
});

const classNames = alert({ tone: "danger" });
classNames.root; // => "flex gap-3 rounded-lg border p-4 border-red-200 bg-red-50"
classNames.icon; // => "size-5 shrink-0 text-red-600"
```

### Type the props from the recipe

Use `VariantsOf` so the component's props follow the recipe, and
`NonNullable` to name the options of one variant.

```ts
import type { VariantsOf } from "@lynstack/class-recipe";

type AlertVariants = VariantsOf<typeof alert>;
export type AlertTone = NonNullable<AlertVariants["tone"]>; // "info" | "danger"
```

### Use `cx` only to add classes that set new properties

`cx` is fine for a class that sets a property the recipe leaves alone,
such as hiding content while a spinner shows:

```tsx
<span className={cx(classNames.label, loading && "invisible")} />
```

If the class would set a property the recipe already sets, make it a
variant instead.

## Don't

### Don't override a recipe with `className` or `classNames`

Passing `className` to a recipe appends classes; it does not replace any.
`button({ className: "px-2" })` on a recipe that sets `px-4` produces both,
and the stylesheet picks the winner. Add an option to the variant that
owns the property instead.

```ts
// Wrong
button({ size: "md", className: "px-2" });

// Right: the recipe declares the choice.
// size: { sm: "h-8 px-3", md: "h-10 px-4", compact: "h-10 px-2" }
button({ size: "compact" });
```

### Don't use compound variants to override a variant

A compound variant adds classes after the variants; it cannot remove one.
If `size` sets `px-4`, a compound variant that adds `px-0` leaves both.
Move the property out of the variant and into the compound variants, as
shown above.

### Don't pick classes with lookup objects or conditionals

Class names that depend on a prop belong in a recipe, not in a
hand-written map or a ternary. A recipe keeps every option in one
declaration, checks the options at the type level, and caches the result.

```tsx
// Wrong
const toneClasses = { info: "bg-blue-50", danger: "bg-red-50" };
<div className={cx("rounded-lg p-4", toneClasses[tone])} />
<div className={tone === "danger" ? "bg-red-50" : "bg-blue-50"} />

// Right
const panel = cva({
  base: "rounded-lg p-4",
  variants: { tone: { info: "bg-blue-50", danger: "bg-red-50" } },
});
<div className={panel({ tone })} />
```

## Checklist before you finish

- For each element, list the CSS properties its classes set: does any
  property appear in more than one of `base`, a variant, or a compound
  variant that can apply together?
- Does any call pass `className` or `classNames` to override a class the
  recipe already sets?
- Is any class chosen by a lookup object or a conditional instead of a
  recipe?
