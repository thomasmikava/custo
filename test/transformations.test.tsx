import React, {
  type ComponentPropsWithoutRef,
  createRef,
  forwardRef,
  memo,
  useState,
} from "react";
import { describe, expect, it, vi } from "vitest";
import {
  buildCusto,
  CreateCusto,
  CustoComponent,
  CustoType,
  createComponentsTransformation,
  transformToCusto,
} from "../src";
import { renderHtml, withRoot } from "./helpers";

function Badge({ children, ...props }: ComponentPropsWithoutRef<"span">) {
  return <span {...props}>{children}</span>;
}

const MemoBadge = memo(Badge);

const RefButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button">
>(function RefButton({ children, ...props }, ref) {
  return (
    <button {...props} ref={ref}>
      {children}
    </button>
  );
});

function useAmount(quantity: number) {
  const [price] = useState(6);
  return quantity * price;
}

describe("transformToCusto", () => {
  it("turns nested string, numeric, and null values into renderable text", () => {
    const input = {
      Summary: { Title: "Order", Total: 0, Optional: null },
      metadata: true,
    };
    const transformed = transformToCusto.Texts(input);
    const [UI] = buildCusto({ defaultValue: { Summary: transformed.Summary } });

    const markup = renderHtml(
      <>
        <h2>
          <UI.Summary.Title />
        </h2>
        <p>
          <UI.Summary.Total />
        </p>
        <div>
          <UI.Summary.Optional />
        </div>
      </>
    );

    expect(markup.querySelector("h2")?.textContent).toBe("Order");
    expect(markup.querySelector("p")?.textContent).toBe("0");
    expect(markup.querySelector("div")?.textContent).toBe("");
    expect(transformed.metadata).toBe(true);
    expect(input.Summary.Title).toBe("Order");
  });

  it("preserves existing Custo definitions when transforming text", () => {
    const existing = {
      Text: CreateCusto.Text("existing"),
      Data: CreateCusto.Data("data"),
      Component: CreateCusto.Component("button"),
      Function: CreateCusto.Function(() => "function"),
    };
    const transformed = transformToCusto.Texts(existing);

    for (const key of ["Text", "Data", "Component", "Function"] as const) {
      expect(transformed[key]).toBe(existing[key]);
    }
  });

  it("treats __proto__ as an own key when transforming and building a tree", () => {
    const input: { __proto__: { Label: string } } = JSON.parse(
      '{"__proto__":{"Label":"Scoped"}}'
    );
    const definitions = transformToCusto.Texts(input);
    const [UI] = buildCusto({ defaultValue: definitions });
    const Label = Object.getOwnPropertyDescriptor(UI, "__proto__")?.value.Label;

    expect(Object.getPrototypeOf(definitions)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(UI)).toBe(Object.prototype);
    expect(renderHtml(<Label />).textContent).toBe("Scoped");
  });

  it("wraps plain, memoized, and forwardRef components in a nested tree", async () => {
    const definitions = transformToCusto.Components({
      Display: { Badge, MemoBadge },
      Actions: { Button: RefButton },
    });
    const [UI] = buildCusto({ defaultValue: definitions });
    const ref = createRef<HTMLButtonElement>();

    await withRoot(async ({ container, render }) => {
      await render(
        <>
          <UI.Display.Badge title="plain">Plain</UI.Display.Badge>
          <UI.Display.MemoBadge title="memo">Memoized</UI.Display.MemoBadge>
          <UI.Actions.Button ref={ref}>Pay</UI.Actions.Button>
        </>
      );

      expect(
        Array.from(container.querySelectorAll("span"), (node) => node.title)
      ).toEqual(["plain", "memo"]);
      expect(ref.current).toBe(container.querySelector("button"));
      expect(ref.current?.textContent).toBe("Pay");
    });
  });

  it("applies a component mapper to wrapped and plain definitions", () => {
    const existing = CreateCusto.Component("span", { className: "existing" });
    const text = CreateCusto.Text("Label");
    const mapper = vi.fn((component: CustoComponent<any>) =>
      component.props({ title: "mapped" })
    );
    const transform = createComponentsTransformation(mapper);
    const definitions = transform({
      Group: { Existing: existing, Plain: Badge, Text: text },
    });
    const [UI] = buildCusto({ defaultValue: definitions });
    const markup = renderHtml(
      <>
        <UI.Group.Existing />
        <UI.Group.Plain />
        <UI.Group.Text />
      </>
    );

    expect(mapper).toHaveBeenCalledTimes(2);
    expect(definitions.Group.Text).toBe(text);
    expect(markup.querySelectorAll('span[title="mapped"]')).toHaveLength(2);
    expect(markup.querySelector(".existing")?.getAttribute("title")).toBe(
      "mapped"
    );
    expect(renderHtml(existing.render({})).querySelector("span")?.title).toBe(
      ""
    );
    expect(markup.textContent).toBe("Label");
  });

  it("applies a component mapper to the lazy result of a component hook", () => {
    function useBadge(_props: ComponentPropsWithoutRef<"span">) {
      const [title] = useState("original");
      return CreateCusto.Component(Badge, { title });
    }
    const hook = CreateCusto.hookOf.Component(useBadge);
    const transform = createComponentsTransformation((component) =>
      component.props({ title: "mapped" })
    );
    const [Mapped] = buildCusto({ defaultValue: transform({ Badge: hook }) });
    const [Original] = buildCusto({ defaultValue: { Badge: hook } });

    expect(renderHtml(<Mapped.Badge />).querySelector("span")?.title).toBe(
      "mapped"
    );
    expect(renderHtml(<Original.Badge />).querySelector("span")?.title).toBe(
      "original"
    );
  });

  it("turns nested data hooks into callable slots", () => {
    const definitions = transformToCusto.Hooks(CustoType.data, {
      Price: { Total: useAmount, currency: "EUR" },
    });
    const [UI] = buildCusto({
      defaultValue: { Price: { Total: definitions.Price.Total } },
    });

    function Total({ quantity }: { quantity: number }) {
      return <output>{UI.Price.Total.use(quantity)}</output>;
    }

    expect(definitions.Price.Total.type).toBe(CustoType.data);
    expect(definitions.Price.Total.isSafe).toBe(false);
    expect(definitions.Price.currency).toBe("EUR");
    expect(renderHtml(<Total quantity={3} />).textContent).toBe("18");
  });

  it("preserves existing hook wrappers and marks new functions safe", () => {
    const existing = CreateCusto.Hook(() => "existing");
    const input = {
      Nested: { Existing: existing, Double: (value: number) => value * 2 },
    };
    const transformed = transformToCusto.Functions(CustoType.hook, input);
    const [UI] = buildCusto({ defaultValue: transformed });

    function Double() {
      return <output>{UI.Nested.Double.use(7)}</output>;
    }

    expect(transformed.Nested.Existing).toBe(existing);
    expect(transformed.Nested.Double.isSafe).toBe(true);
    expect(renderHtml(<Double />).textContent).toBe("14");
  });

  it("wraps values returned by text functions", () => {
    const { Label } = transformToCusto.Functions(CustoType.text, {
      Label: (number: number) => `Order ${number}`,
    });

    expect(Label.isSafe).toBe(true);
    expect(Label.type).toBe(CustoType.text);
    expect(Label.use(12)).toEqual(CreateCusto.Text("Order 12"));
  });

  it("wraps React components returned by component functions", () => {
    const { Badge: Render } = transformToCusto.Functions(CustoType.component, {
      Badge: () => Badge,
    });

    expect(Render.type).toBe(CustoType.component);
    const configuration = Render.use();
    expect(configuration).toBeInstanceOf(CustoComponent);
    expect(configuration).toHaveProperty("component", Badge);
  });
});
