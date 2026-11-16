import React, {
  act,
  type ComponentPropsWithoutRef,
  type ComponentType,
  createRef,
  type HTMLProps,
  type PropsWithChildren,
  useState,
} from "react";
import { describe, expect, it } from "vitest";
import {
  buildCusto,
  CreateCusto,
  CustoComponentFlags,
  WrapInCustHookChangeError,
} from "../src";
import { renderHtml, withRoot } from "./helpers";

interface CheckoutSlots {
  Clickables: {
    Button: ComponentType<PropsWithChildren>;
    Cancel: ComponentType<PropsWithChildren>;
  };
  Label: ComponentType;
}

function Checkout({ ui: UI }: { ui: CheckoutSlots }) {
  return (
    <>
      <UI.Clickables.Button>
        <UI.Label />
      </UI.Clickables.Button>
      <UI.Clickables.Cancel>Cancel</UI.Clickables.Cancel>
    </>
  );
}

function DesignButton({
  children,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return <button {...props}>{children}</button>;
}

function DefaultsSummary({
  ui: UI,
}: {
  ui: {
    Amount: { use: () => number };
    Message: { use: () => string };
  };
}) {
  return (
    <output>
      {UI.Amount.use()} {UI.Message.use()}
    </output>
  );
}

function Counter({
  ui: UI,
}: {
  ui: {
    Behavior: { use: () => string };
    Label: ComponentType;
  };
}) {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      {UI.Behavior.use()} {count} <UI.Label />
    </button>
  );
}

const RecoveringCounter = WrapInCustHookChangeError(Counter);

function useOriginalBehavior() {
  return useState("original")[0];
}

function useReplacementBehavior() {
  const [label] = useState("replacement");
  return label;
}

describe("buildCusto", () => {
  it("inherits omitted entries through nested providers and isolates sibling scopes", () => {
    const [ui, { MergingProvider }] = buildCusto({
      defaultValue: {
        Clickables: {
          Button: CreateCusto.Component("button", {
            type: "submit",
            className: "default",
          }),
          Cancel: CreateCusto.Component("button", { type: "reset" }),
        },
        Label: CreateCusto.Text("Pay now"),
      },
    });

    const markup = renderHtml(
      <>
        <MergingProvider
          value={{
            Clickables: {
              Button: CreateCusto.Component<HTMLProps<HTMLButtonElement>>(
                null,
                { className: "partner" }
              ),
            },
            Label: "Place order",
          }}
        >
          <MergingProvider value={{ Label: "Confirm order" }}>
            <Checkout ui={ui} />
          </MergingProvider>
          <Checkout ui={ui} />
        </MergingProvider>
        <Checkout ui={ui} />
      </>
    );
    const submitButtons = [...markup.querySelectorAll("button[type=submit]")];

    expect(submitButtons.map((button) => button.textContent)).toEqual([
      "Confirm order",
      "Place order",
      "Pay now",
    ]);
    expect(submitButtons.map((button) => button.className)).toEqual([
      "partner default",
      "partner default",
      "default",
    ]);
    expect(markup.querySelectorAll("button[type=reset]")).toHaveLength(3);
  });

  it("uses a custom default renderer and the override's explicit prop merge strategy", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: {
        Button: CreateCusto.Component(DesignButton, {
          type: "submit",
          title: "default",
        }),
      },
    });
    const patch = CreateCusto.Component<ComponentPropsWithoutRef<"button">>(
      null,
      { className: "partner", title: "override" }
    ).config({
      propsMergeStrategy: (incoming, inherited) => ({
        ...inherited,
        ...incoming,
      }),
    });

    const button = renderHtml(
      <MergingProvider value={{ Button: patch }}>
        <UI.Button title="explicit">Pay</UI.Button>
      </MergingProvider>
    ).querySelector("button");

    expect(button?.type).toBe("submit");
    expect(button?.className).toBe("partner");
    expect(button?.title).toBe("explicit");
    expect(button?.textContent).toBe("Pay");
  });

  it("renders component, text, data, and function overrides", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: {
        Wrapper: CreateCusto.Component("section"),
        Label: CreateCusto.Text("Total"),
        Amount: CreateCusto.Data(10),
        Message: CreateCusto.Function(() => "estimated"),
      },
    });

    const markup = renderHtml(
      <MergingProvider
        value={{
          Wrapper: CreateCusto.Component("article"),
          Label: "Subtotal",
          Amount: 20,
          Message: CreateCusto.Function(() => "confirmed"),
        }}
      >
        <UI.Wrapper>
          <UI.Label /> <DefaultsSummary ui={UI} />
        </UI.Wrapper>
      </MergingProvider>
    );
    expect(markup.querySelector("article")?.textContent).toBe(
      "Subtotal 20 confirmed"
    );
  });

  it.each([
    ["MergingProvider", "submit"],
    ["NonMergingProvider", null],
    ["NonPackageMergingProvider", null],
  ] as const)(
    "%s applies its component merge policy and inherits omitted entries",
    (mode, expectedType) => {
      const [UI, contexts] = buildCusto({
        defaultValue: {
          Button: CreateCusto.Component("button", { type: "submit" }).addFlags(
            CustoComponentFlags.isPackageDefaultValue
          ),
          Label: CreateCusto.Text("Pay"),
        },
      });
      const Provider = contexts[mode];
      const markup = renderHtml(
        <Provider
          value={{
            Button: CreateCusto.Component("button", { className: "local" }),
          }}
        >
          <UI.Button>
            <UI.Label />
          </UI.Button>
        </Provider>
      );
      const button = markup.querySelector("button");

      expect(contexts.Provider).toBe(contexts.NonMergingProvider);
      expect(button?.getAttribute("type")).toBe(expectedType);
      expect(button?.className).toBe("local");
      expect(button?.textContent).toBe("Pay");
    }
  );

  it("keeps provider merge policies separate when they receive the same override object", () => {
    const [UI, { MergingProvider, NonPackageMergingProvider }] = buildCusto({
      defaultValue: {
        Button: CreateCusto.Component("button", { type: "submit" }).addFlags(
          CustoComponentFlags.isPackageDefaultValue
        ),
      },
    });
    const value = {
      Button: CreateCusto.Component("button", { className: "local" }),
    };
    const markup = renderHtml(
      <>
        <MergingProvider value={value}>
          <UI.Button>Merge</UI.Button>
        </MergingProvider>
        <NonPackageMergingProvider value={value}>
          <UI.Button>Replace</UI.Button>
        </NonPackageMergingProvider>
      </>
    );

    expect(
      Array.from(markup.querySelectorAll("button"), (button) =>
        button.getAttribute("type")
      )
    ).toEqual(["submit", null]);
  });

  it("transforms a provider input before merging and the resolved value before reading", () => {
    const defaultValue = { Label: CreateCusto.Text("Pay now") };
    const result = buildCusto<
      typeof defaultValue,
      { value: { Label: string } },
      string
    >({
      contextDisplayName: "Checkout",
      defaultValue,
      layerTransformationHook: (label) => ({
        Label: CreateCusto.Text(label),
      }),
      rawToFinalValueHook: (raw) => ({
        ...raw,
        value: { Label: String(raw.value.Label.getRaw()).toUpperCase() },
      }),
    });
    const [UI, contexts] = result;
    const markup = renderHtml(
      <contexts.MergingProvider value={contexts.createValue("place order")}>
        <UI.Label />
      </contexts.MergingProvider>
    );

    expect(markup.textContent).toBe("PLACE ORDER");
    expect(result.Contexts).toBe(contexts);
    expect(result.Container.context).toHaveProperty("displayName", "Checkout");
  });

  it("honors mergeDecisionFn at a conflicting nested path", () => {
    const result = buildCusto({
      defaultValue: {
        Clickables: {
          Button: CreateCusto.Component("button", { type: "submit" }),
          Cancel: CreateCusto.Component("button", { type: "reset" }),
        },
        Label: CreateCusto.Text("Pay now"),
      },
      mergeDecisionFn: (path) => ({ skip: path === "Clickables.Button" }),
    });
    const [ui, { MergingProvider }] = result;

    const markup = renderHtml(
      <MergingProvider
        value={{
          Clickables: {
            Button: CreateCusto.Component("button", { className: "local" }),
          },
        }}
      >
        <Checkout ui={ui} />
      </MergingProvider>
    );

    expect(markup.querySelector(".local")?.getAttribute("type")).toBeNull();
    expect(markup.querySelector(".local")?.textContent).toBe("Pay now");
    expect(markup.querySelector("button[type=reset]")?.textContent).toBe(
      "Cancel"
    );
  });

  it("applies path-specific decisions when sibling branches reuse the same definitions", () => {
    const defaults = {
      Button: CreateCusto.Component("button", { type: "submit" }),
    };
    const patch = {
      Button: CreateCusto.Component("button", { className: "local" }),
    };
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Primary: defaults, Secondary: defaults },
      mergeDecisionFn: (path) => ({ skip: path === "Secondary.Button" }),
    });
    const markup = renderHtml(
      <MergingProvider value={{ Primary: patch, Secondary: patch }}>
        <UI.Primary.Button>Primary</UI.Primary.Button>
        <UI.Secondary.Button>Secondary</UI.Secondary.Button>
      </MergingProvider>
    );

    expect(
      Array.from(markup.querySelectorAll("button"), (button) =>
        button.getAttribute("type")
      )
    ).toEqual(["submit", null]);
  });

  it("updates mounted values, forwards refs, and remounts after a hook implementation changes", async () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: {
        Behavior: CreateCusto.Hook(useOriginalBehavior),
        Label: CreateCusto.Text("initial"),
        Button: CreateCusto.Component("button"),
      },
    });
    const ref = createRef<HTMLButtonElement>();

    await withRoot(async ({ container, render }) => {
      const renderLayer = (
        value: Parameters<typeof MergingProvider>[0]["value"]
      ) =>
        render(
          <MergingProvider value={value}>
            <RecoveringCounter ui={UI} />
            <UI.Button ref={ref}>Ref target</UI.Button>
          </MergingProvider>
        );
      const counter = () => container.querySelector("button");

      await renderLayer({});
      const original = counter();
      expect(original?.textContent).toBe("original 0 initial");
      expect(ref.current).toBe(container.lastElementChild);

      await act(() => counter()?.click());
      await renderLayer({ Label: "updated" });
      expect(counter()?.textContent).toBe("original 1 updated");
      expect(counter()).toBe(original);

      await renderLayer({
        Label: "updated",
        Behavior: CreateCusto.Hook(useReplacementBehavior),
      });
      expect(counter()?.textContent).toBe("replacement 0 updated");
      expect(counter()).not.toBe(original);
    });
  });
});
