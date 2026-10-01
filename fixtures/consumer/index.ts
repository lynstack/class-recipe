import {
  createRecipe,
  createRecipes,
  createSlotRecipe,
  cva,
  cx,
  sva,
} from "@lynstack/class-recipe";
import type { VariantsOf } from "@lynstack/class-recipe";

const button = createRecipe({
  base: "inline-flex",
  compoundVariants: [
    { className: "font-bold", variants: { size: "lg", tone: "danger" } },
  ],
  defaultVariants: { size: "md" },
  variants: {
    disabled: { true: "opacity-50" },
    size: { lg: "h-12", md: "h-10" },
    tone: { danger: "bg-red-600", neutral: "bg-gray-100" },
  },
});

type ButtonVariants = VariantsOf<typeof button>;

const card = createSlotRecipe({
  slots: ["root", "title"],
  variants: { size: { md: { root: "p-4", title: "text-base" } } },
});

const pill = cva({
  base: "rounded-full",
  variants: { tone: { danger: "bg-red-100", neutral: "bg-gray-100" } },
});

const field = sva({
  slots: ["label", "input"],
  variants: { invalid: { true: { input: "border-red-600" } } },
});

const merged = createRecipes({
  join: (...classNames) => cx(classNames),
});

const className: string = button({ tone: "danger" });

export { button, card, className, field, merged, pill };
export type { ButtonVariants };
