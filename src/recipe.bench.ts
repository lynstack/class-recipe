import { createRecipe, createRecipes } from "@lynstack/class-recipe";
import { describe, expect, it } from "vitest";
import type { TestContext } from "vitest";

const base =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2";

const config = {
  base,
  variants: {
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
  },
  compoundVariants: [
    { variants: { variant: "danger", size: "lg" }, className: "font-bold" },
    {
      variants: { variant: ["outline", "ghost"], disabled: true },
      className: "border-dashed",
    },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
    disabled: false,
  },
} as const;

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

type Recipe = (props: (typeof selections)[number]) => string;

const recipes: Readonly<Record<string, Recipe>> = {
  cached: createRecipe(config),
  uncached: createRecipes({ cache: false }).createRecipe(config),
};

describe("recipe", () => {
  it.for(Object.entries(recipes))(
    "%s returns the expected classes",
    ([, recipe]: readonly [string, Recipe]) => {
      expect(selections.map((selection) => recipe(selection))).toStrictEqual(
        expected,
      );
    },
  );

  it("is faster with the cache", async ({ bench }: TestContext) => {
    expect.hasAssertions();

    let length = 0;
    const result = await bench.compare(
      ...Object.entries(recipes).map(
        ([name, recipe]: readonly [string, Recipe]) =>
          bench(name, () => {
            for (const selection of selections) {
              length += recipe(selection).length;
            }
          }),
      ),
    );

    expect(length).toBeGreaterThan(0);
    expect(result.get("cached")).toBeFasterThan(result.get("uncached"));
  });
});
