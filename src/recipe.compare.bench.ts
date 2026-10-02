import { createRecipes, cva } from "@lynstack/class-recipe";
import { describe, expect, it } from "vitest";
import type { TestContext } from "vitest";
import { cva as cvaLibrary } from "class-variance-authority";
import { tv } from "tailwind-variants";
import { tv as tvLite } from "tailwind-variants/lite";
import { twMerge } from "tailwind-merge";

const merging = createRecipes({ join: twMerge });

const base =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2";

const variants = {
  variant: {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-50",
    ghost: "bg-transparent hover:bg-gray-50",
  },
  size: {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  },
  disabled: {
    true: "pointer-events-none opacity-50",
    false: "",
  },
} as const;

const defaultVariants = {
  variant: "primary",
  size: "md",
  disabled: false,
} as const;

const recipeConfig = {
  base,
  variants,
  compoundVariants: [
    { variants: { variant: "danger", size: "lg" }, className: "font-bold" },
    {
      variants: { variant: ["outline", "ghost"], disabled: true },
      className: "border-dashed",
    },
  ],
  defaultVariants,
} as const;

const cvaButton = cvaLibrary(base, {
  variants,
  compoundVariants: [
    { variant: "danger", size: "lg", className: "font-bold" },
    {
      variant: ["outline", "ghost"],
      disabled: true,
      className: "border-dashed",
    },
  ],
  defaultVariants,
});

const selections = [
  {},
  { variant: "secondary" },
  { variant: "danger", size: "lg" },
  { variant: "outline", size: "sm", disabled: true },
  { variant: "ghost", className: "w-full" },
  { variant: "danger", size: "sm", disabled: true, className: "mt-2" },
] as const;

const expected = [
  `${base} bg-blue-600 text-white hover:bg-blue-700 h-10 px-4`,
  `${base} bg-gray-100 text-gray-900 hover:bg-gray-200 h-10 px-4`,
  `${base} bg-red-600 text-white hover:bg-red-700 h-12 px-6 text-lg font-bold`,
  `${base} border border-gray-300 bg-transparent hover:bg-gray-50 h-8 px-3 text-sm pointer-events-none opacity-50 border-dashed`,
  `${base} bg-transparent hover:bg-gray-50 h-10 px-4 w-full`,
  `${base} bg-red-600 text-white hover:bg-red-700 h-8 px-3 text-sm pointer-events-none opacity-50 mt-2`,
];

const baseWithoutFontWeight =
  "inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2";

const mergedExpected = [
  expected[0],
  expected[1],
  `${baseWithoutFontWeight} bg-red-600 text-white hover:bg-red-700 h-12 px-6 text-lg font-bold`,
  expected[3],
  expected[4],
  expected[5],
];

type Recipe = (selection: (typeof selections)[number]) => string;

interface RecipeGroup {
  readonly candidates: Readonly<Record<string, Recipe>>;
  readonly expected: readonly (string | undefined)[];
}

const recipeGroups: Readonly<Record<string, RecipeGroup>> = {
  "without tailwind-merge": {
    candidates: {
      "class-recipe": cva(recipeConfig),
      "class-variance-authority": (selection) => cvaButton(selection),
      "tailwind-variants": tvLite({
        base,
        variants,
        compoundVariants: [
          { variant: "danger", size: "lg", class: "font-bold" },
          {
            variant: ["outline", "ghost"],
            disabled: true,
            class: "border-dashed",
          },
        ],
        defaultVariants,
      }),
    },
    expected,
  },
  "with tailwind-merge": {
    candidates: {
      "class-recipe": merging.cva(recipeConfig),
      "class-variance-authority": (selection) => twMerge(cvaButton(selection)),
      "tailwind-variants": tv({
        base,
        variants,
        compoundVariants: [
          { variant: "danger", size: "lg", class: "font-bold" },
          {
            variant: ["outline", "ghost"],
            disabled: true,
            class: "border-dashed",
          },
        ],
        defaultVariants,
      }),
    },
    expected: mergedExpected,
  },
};

describe("recipe compared with other libraries", () => {
  describe.for(Object.entries(recipeGroups))(
    "%s",
    ([, group]: readonly [string, RecipeGroup]) => {
      it.for(Object.entries(group.candidates))(
        "%s returns the expected classes",
        ([, recipe]: readonly [string, Recipe]) => {
          expect(
            selections.map((selection) => recipe(selection)),
          ).toStrictEqual(group.expected);
        },
      );

      it("benchmark", async ({ bench }: TestContext) => {
        expect.hasAssertions();

        let length = 0;
        await bench.compare(
          ...Object.entries(group.candidates).map(
            ([name, recipe]: readonly [string, Recipe]) =>
              bench(name, () => {
                for (const selection of selections) {
                  length += recipe(selection).length;
                }
              }),
          ),
        );

        expect(length).toBeGreaterThan(0);
      });
    },
  );
});
