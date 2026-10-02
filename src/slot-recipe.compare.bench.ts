import { createRecipes, sva } from "@lynstack/class-recipe";
import { describe, expect, it } from "vitest";
import type { TestContext } from "vitest";
import { tv } from "tailwind-variants";
import { tv as tvLite } from "tailwind-variants/lite";
import { twMerge } from "tailwind-merge";

const merging = createRecipes({ join: twMerge });

const slots = {
  root: "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
  icon: "shrink-0",
  label: "truncate",
};

const slotVariants = {
  variant: {
    primary: { root: "bg-blue-600 text-white hover:bg-blue-700" },
    secondary: { root: "bg-gray-100 text-gray-900 hover:bg-gray-200" },
    danger: { root: "bg-red-600 text-white", icon: "text-white" },
    ghost: { root: "bg-transparent hover:bg-gray-50", icon: "text-gray-500" },
  },
  size: {
    sm: { root: "h-8 px-3 text-sm", icon: "size-4" },
    md: { root: "h-10 px-4", icon: "size-5" },
    lg: { root: "h-12 px-6 text-lg", icon: "size-6", label: "tracking-wide" },
  },
  loading: {
    true: { root: "cursor-wait", icon: "animate-spin" },
    false: {},
  },
} as const;

const slotDefaultVariants = {
  variant: "primary",
  size: "md",
  loading: false,
} as const;

const slotRecipeConfig = {
  slots: ["root", "icon", "label"],
  base: slots,
  variants: slotVariants,
  compoundVariants: [
    {
      variants: { variant: "danger", size: "lg" },
      classNames: { label: "font-bold" },
    },
    {
      variants: { variant: ["ghost", "secondary"], loading: true },
      classNames: { root: "opacity-75" },
    },
  ],
  defaultVariants: slotDefaultVariants,
} as const;

const button = sva(slotRecipeConfig);
const mergingButton = merging.sva(slotRecipeConfig);

interface SlotOverrides {
  readonly root?: string;
  readonly icon?: string;
  readonly label?: string;
}

interface SlotVariants {
  readonly variant?: "primary" | "secondary" | "danger" | "ghost";
  readonly size?: "sm" | "md" | "lg";
  readonly loading?: boolean;
}

interface SlotCase {
  readonly variants: SlotVariants;
  readonly classNames: SlotOverrides;
}

const slotCases: readonly SlotCase[] = [
  { variants: {}, classNames: {} },
  { variants: { variant: "secondary" }, classNames: {} },
  { variants: { variant: "danger", size: "lg" }, classNames: {} },
  {
    variants: { variant: "ghost", size: "sm", loading: true },
    classNames: {},
  },
  { variants: { variant: "ghost" }, classNames: { root: "w-full" } },
  {
    variants: { variant: "danger", size: "sm" },
    classNames: { label: "uppercase" },
  },
];

const slotSelections = new Map(
  slotCases.map((slotCase) => [
    slotCase,
    { ...slotCase.variants, classNames: slotCase.classNames },
  ]),
);

const slotExpected = [
  {
    root: `${slots.root} bg-blue-600 text-white hover:bg-blue-700 h-10 px-4`,
    icon: "shrink-0 size-5",
    label: "truncate",
  },
  {
    root: `${slots.root} bg-gray-100 text-gray-900 hover:bg-gray-200 h-10 px-4`,
    icon: "shrink-0 size-5",
    label: "truncate",
  },
  {
    root: `${slots.root} bg-red-600 text-white h-12 px-6 text-lg`,
    icon: "shrink-0 text-white size-6",
    label: "truncate tracking-wide font-bold",
  },
  {
    root: `${slots.root} bg-transparent hover:bg-gray-50 h-8 px-3 text-sm cursor-wait opacity-75`,
    icon: "shrink-0 text-gray-500 size-4 animate-spin",
    label: "truncate",
  },
  {
    root: `${slots.root} bg-transparent hover:bg-gray-50 h-10 px-4 w-full`,
    icon: "shrink-0 text-gray-500 size-5",
    label: "truncate",
  },
  {
    root: `${slots.root} bg-red-600 text-white h-8 px-3 text-sm`,
    icon: "shrink-0 text-white size-4",
    label: "truncate uppercase",
  },
];

type SlotRecipe = (slotCase: SlotCase) => SlotOverrides;

const tvSlotButton = tvLite({
  slots,
  variants: slotVariants,
  compoundVariants: [
    { variant: "danger", size: "lg", class: { label: "font-bold" } },
    {
      variant: ["ghost", "secondary"],
      loading: true,
      class: { root: "opacity-75" },
    },
  ],
  defaultVariants: slotDefaultVariants,
});
const tvMergingSlotButton = tv({
  slots,
  variants: slotVariants,
  compoundVariants: [
    { variant: "danger", size: "lg", class: { label: "font-bold" } },
    {
      variant: ["ghost", "secondary"],
      loading: true,
      class: { root: "opacity-75" },
    },
  ],
  defaultVariants: slotDefaultVariants,
});

const slotGroups: Readonly<
  Record<string, Readonly<Record<string, SlotRecipe>>>
> = {
  "without tailwind-merge": {
    "class-recipe": (slotCase) => button(slotSelections.get(slotCase)),
    "tailwind-variants": ({ variants: selection, classNames }) => {
      const result = tvSlotButton(selection);
      return {
        root: result.root({ class: classNames.root }),
        icon: result.icon({ class: classNames.icon }),
        label: result.label({ class: classNames.label }),
      };
    },
  },
  "with tailwind-merge": {
    "class-recipe": (slotCase) => mergingButton(slotSelections.get(slotCase)),
    "tailwind-variants": ({ variants: selection, classNames }) => {
      const result = tvMergingSlotButton(selection);
      return {
        root: result.root({ class: classNames.root }),
        icon: result.icon({ class: classNames.icon }),
        label: result.label({ class: classNames.label }),
      };
    },
  },
};

describe("slot recipe compared with other libraries", () => {
  describe.for(Object.entries(slotGroups))(
    "%s",
    ([, candidates]: readonly [
      string,
      Readonly<Record<string, SlotRecipe>>,
    ]) => {
      it.for(Object.entries(candidates))(
        "%s returns the expected classes",
        ([, recipe]: readonly [string, SlotRecipe]) => {
          expect(slotCases.map((slotCase) => recipe(slotCase))).toStrictEqual(
            slotExpected,
          );
        },
      );

      it("benchmark", async ({ bench }: TestContext) => {
        expect.hasAssertions();

        let length = 0;
        await bench.compare(
          ...Object.entries(candidates).map(
            ([name, recipe]: readonly [string, SlotRecipe]) =>
              bench(name, () => {
                for (const slotCase of slotCases) {
                  const { root = "", icon = "", label = "" } = recipe(slotCase);
                  length += root.length + icon.length + label.length;
                }
              }),
          ),
        );

        expect(length).toBeGreaterThan(0);
      });
    },
  );
});
