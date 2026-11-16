import React, { act, type HTMLProps, useState } from "react";
import type { ContextSelectorMiniHook } from "react-flexible-contexts";
import { describe, expect, it } from "vitest";
import { buildCusto, CreateCusto, CustoType } from "../src";
import { renderHtml, withRoot } from "./helpers";

function selectorFor(
  root: unknown
): ContextSelectorMiniHook<readonly unknown[]> {
  function select(): readonly unknown[];
  function select<Result>(
    project: (...values: readonly unknown[]) => Result
  ): Result;
  function select<Result>(project?: (...values: readonly unknown[]) => Result) {
    return project ? project(root) : [root];
  }
  return select;
}

function useEstimate(count: number) {
  const [rate] = useState(4);
  return CreateCusto.Data(rate * count);
}

type ButtonProps = HTMLProps<HTMLButtonElement>;

function useBaseButton(_props: ButtonProps) {
  const [className] = useState("base");
  return CreateCusto.Component("button", { className, type: "submit" });
}

function useLocalButton(_props: ButtonProps) {
  const [className] = useState("local");
  return CreateCusto.Component("button", { className });
}

describe("customized hooks and text", () => {
  it("renders numeric, empty, and rich text defaults", () => {
    const [UI] = buildCusto({
      defaultValue: {
        Zero: CreateCusto.Text(0),
        Empty: CreateCusto.Text(null),
        Rich: CreateCusto.Text(<strong>Rich</strong>),
      },
    });
    const markup = renderHtml(
      <>
        <p>
          <UI.Zero />
        </p>
        <p>
          <UI.Empty />
        </p>
        <p>
          <UI.Rich />
        </p>
      </>
    );

    expect(
      Array.from(markup.querySelectorAll("p"), (node) => node.textContent)
    ).toEqual(["0", "", "Rich"]);
    expect(markup.querySelector("strong")?.textContent).toBe("Rich");
  });

  it("accepts rich text and empty overrides on a text slot", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Label: CreateCusto.Text("Default") },
    });
    const markup = renderHtml(
      <>
        <MergingProvider value={{ Label: <em>Emphasized</em> }}>
          <p>
            <UI.Label />
          </p>
        </MergingProvider>
        <MergingProvider value={{ Label: CreateCusto.Text(null) }}>
          <p>
            <UI.Label />
          </p>
        </MergingProvider>
      </>
    );

    expect(markup.querySelector("em")?.textContent).toBe("Emphasized");
    expect(markup.lastElementChild?.textContent).toBe("");
  });

  it("exposes raw and transformed values and lets an individual render opt out", () => {
    const defaults = { Label: CreateCusto.Text("Pay now") };
    const result = buildCusto({ defaultValue: defaults });
    const uppercase = CreateCusto.Function(
      (value: Parameters<typeof CreateCusto.Text>[0]) =>
        typeof value === "string" ? value.toUpperCase() : value
    );
    const UI = CreateCusto.Tree<typeof defaults>(result.Container, {
      getTextTransformationHook: () => uppercase,
    });

    function Values() {
      const raw = UI.Label.useRawValue();
      const transformed = UI.Label.useValue();
      return (
        <output>
          {raw} / {transformed}
        </output>
      );
    }
    const markup = renderHtml(
      <>
        <p>
          <UI.Label />
        </p>
        <p>
          <UI.Label disableTextTransformer />
        </p>
        <Values />
      </>
    );

    expect(
      Array.from(markup.querySelectorAll("p"), (node) => node.textContent)
    ).toEqual(["PAY NOW", "Pay now"]);
    expect(markup.querySelector("output")?.textContent).toBe(
      "Pay now / PAY NOW"
    );
  });

  it("resolves custom tree prefixes before using per-slot and per-type fallbacks", () => {
    const template = {
      Checkout: {
        Title: CreateCusto.Text("template"),
        Subtitle: CreateCusto.Text("template"),
        Caption: CreateCusto.Text("template"),
        Amount: CreateCusto.Data(0),
      },
    };
    const UI = CreateCusto.Tree(
      template,
      selectorFor({ account: { ui: { Checkout: { Title: "Selected" } } } }),
      {
        prefixes: ["account", "ui"],
        defaultValue: { Checkout: { Subtitle: CreateCusto.Text("Per slot") } },
        defaultValuesByTypes: {
          [CustoType.text]: CreateCusto.Text("Per type"),
          [CustoType.data]: CreateCusto.Data(5),
        },
      }
    );

    function Output() {
      return <output>{UI.Checkout.Amount.use()}</output>;
    }
    const markup = renderHtml(
      <>
        <p>
          <UI.Checkout.Title />
        </p>
        <p>
          <UI.Checkout.Subtitle />
        </p>
        <p>
          <UI.Checkout.Caption />
        </p>
        <Output />
      </>
    );

    expect(
      Array.from(markup.querySelectorAll("p"), (node) => node.textContent)
    ).toEqual(["Selected", "Per slot", "Per type"]);
    expect(markup.querySelector("output")?.textContent).toBe("5");
  });

  it("runs a text hook and unwraps its result", () => {
    function useGreeting() {
      const [greeting] = useState("Hello");
      return greeting;
    }
    const [UI] = buildCusto({
      defaultValue: { Greeting: CreateCusto.hookOf.Text(useGreeting) },
    });

    expect(renderHtml(<UI.Greeting />).textContent).toBe("Hello");
  });

  it("forwards arguments to data hooks and unwraps CustoData results", () => {
    const [UI] = buildCusto({
      defaultValue: { Estimate: CreateCusto.hookOf.Data(useEstimate) },
    });
    function Estimate({ quantity }: { quantity: number }) {
      return <output>{UI.Estimate.use(quantity)}</output>;
    }

    expect(renderHtml(<Estimate quantity={3} />).textContent).toBe("12");
    expect(renderHtml(<Estimate quantity={0} />).textContent).toBe("0");
  });

  it("keeps data-hook state when the caller changes an argument", async () => {
    function useQuantity(initial: number) {
      const [quantity, setQuantity] = useState(initial);
      return { quantity, increment: () => setQuantity((value) => value + 1) };
    }
    const [UI] = buildCusto({
      defaultValue: { Quantity: CreateCusto.hookOf.Data(useQuantity) },
    });
    function Quantity({ initial }: { initial: number }) {
      const { quantity, increment } = UI.Quantity.use(initial);
      return (
        <button type="button" onClick={increment}>
          {quantity}
        </button>
      );
    }

    await withRoot(async ({ container, render }) => {
      await render(<Quantity initial={3} />);
      await act(() => container.querySelector("button")?.click());
      expect(container.textContent).toBe("4");
      await render(<Quantity initial={10} />);
      expect(container.textContent).toBe("4");
    });
  });

  it("merges component definitions produced by two hooks", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Button: CreateCusto.hookOf.Component(useBaseButton) },
    });
    const override = CreateCusto.hookOf.Component(useLocalButton);
    const button = renderHtml(
      <MergingProvider value={{ Button: override }}>
        <UI.Button>Checkout</UI.Button>
      </MergingProvider>
    ).querySelector("button");

    expect(button?.className).toBe("local base");
    expect(button?.type).toBe("submit");
    expect(button?.textContent).toBe("Checkout");
  });

  it("changes a safe function or raw override without resetting consumer state", async () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: {
        Result: CreateCusto.Function((value: number) => value * 2),
      },
    });
    function Result() {
      const [count, setCount] = useState(1);
      return (
        <button type="button" onClick={() => setCount(count + 1)}>
          {count}:{UI.Result.use(count)}
        </button>
      );
    }

    await withRoot(async ({ container, render }) => {
      await render(
        <MergingProvider value={{}}>
          <Result />
        </MergingProvider>
      );
      await act(() => container.querySelector("button")?.click());
      expect(container.textContent).toBe("2:4");

      const override = CreateCusto.Function((value: number) => value * 3);
      await render(
        <MergingProvider value={{ Result: override }}>
          <Result />
        </MergingProvider>
      );
      expect(container.textContent).toBe("2:6");

      await render(
        <MergingProvider value={{ Result: 0 }}>
          <Result />
        </MergingProvider>
      );
      expect(container.textContent).toBe("2:0");
    });
  });

  it("keeps local state when useRawValue reads a new literal", async () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Label: CreateCusto.Text("Default") },
    });
    function ReadText() {
      const [count, setCount] = useState(0);
      return (
        <button type="button" onClick={() => setCount(count + 1)}>
          {count}:{UI.Label.useRawValue()}
        </button>
      );
    }

    await withRoot(async ({ container, render }) => {
      await render(
        <MergingProvider value={{}}>
          <ReadText />
        </MergingProvider>
      );
      await act(() => container.querySelector("button")?.click());
      await render(
        <MergingProvider value={{ Label: "Scoped" }}>
          <ReadText />
        </MergingProvider>
      );
      expect(container.textContent).toBe("1:Scoped");
    });
  });

  it("keeps local state when useValue reads a new literal", async () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Label: CreateCusto.Text("Default") },
    });
    function ReadText() {
      const [count, setCount] = useState(0);
      return (
        <button type="button" onClick={() => setCount(count + 1)}>
          {count}:{UI.Label.useValue()}
        </button>
      );
    }
    await withRoot(async ({ container, render }) => {
      await render(
        <MergingProvider value={{}}>
          <ReadText />
        </MergingProvider>
      );
      await act(() => container.querySelector("button")?.click());
      await render(
        <MergingProvider value={{ Label: "Scoped" }}>
          <ReadText />
        </MergingProvider>
      );
      expect(container.textContent).toBe("1:Scoped");
    });
  });

  it("forwards the original arguments through a chain of Custo functions", () => {
    const inner = CreateCusto.Function(
      (left: number, right: number) => left - right
    );
    const middle = CreateCusto.functionOf.Function(
      (_left: number, _right: number) => inner
    );
    const outer = CreateCusto.functionOf.Function(
      (_left: number, _right: number) => middle
    );

    expect(outer.use(9, 4)).toBe(5);
    expect(outer.use(1, 6)).toBe(-5);
  });

  it("propagates hook safety through a returned hook and keeps clone flags independent", () => {
    const inner = CreateCusto.Hook(() => "result");
    const outer = CreateCusto.functionOf.Hook(() => inner);
    expect(outer.isSafe).toBe(true);
    expect(outer.use()).toBe("result");
    expect(outer.isSafe).toBe(false);

    const asFunction = inner.getFuncVersion();
    const asHook = asFunction.getHookVersion();
    expect(inner.isSafe).toBe(false);
    expect(asFunction.isSafe).toBe(true);
    expect(asHook.isSafe).toBe(false);
    expect(asHook.use()).toBe("result");
  });
});
