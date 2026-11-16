import React, { type ComponentPropsWithoutRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  buildCusto,
  CreateCusto,
  CustoComponentFlags,
  createProviderMergingLogic,
} from "../src";
import { renderHtml } from "./helpers";

const { Component, Data, Text } = CreateCusto;

function LinkButton({ children, ...props }: ComponentPropsWithoutRef<"a">) {
  return <a {...props}>{children}</a>;
}

describe("provider configuration", () => {
  it("keeps independently built customization trees isolated", () => {
    const defaults = { Label: Text("Default") };
    const [First, { MergingProvider }] = buildCusto({ defaultValue: defaults });
    const [Second] = buildCusto({ defaultValue: defaults });

    const markup = renderHtml(
      <MergingProvider value={{ Label: "First scope" }}>
        <p>
          <First.Label />
        </p>
        <p>
          <Second.Label />
        </p>
      </MergingProvider>
    );

    expect(
      Array.from(markup.querySelectorAll("p"), (node) => node.textContent)
    ).toEqual(["First scope", "Default"]);
  });

  it("can use another customization slot as a default renderer", () => {
    const [Design, { MergingProvider }] = buildCusto({
      defaultValue: {
        Button: Component("button", { title: "design default" }),
      },
    });
    const [Checkout] = buildCusto({
      defaultValue: { Actions: { Pay: Component(Design.Button) } },
    });

    const markup = renderHtml(
      <MergingProvider
        value={{ Button: Component("button", { className: "partner" }) }}
      >
        <Checkout.Actions.Pay>Pay</Checkout.Actions.Pay>
      </MergingProvider>
    );

    const button = markup.querySelector("button");
    expect(button?.textContent).toBe("Pay");
    expect(button?.className).toBe("partner");
    expect(button?.title).toBe("design default");
  });

  it("accepts a plain React component at an existing component slot", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: {
        Button: Component("button", { type: "submit" }),
        Label: Text("Continue"),
      },
    });

    const markup = renderHtml(
      <MergingProvider value={{ Button: LinkButton }}>
        <UI.Button>
          <UI.Label />
        </UI.Button>
      </MergingProvider>
    );

    expect(markup.querySelector("a")?.textContent).toBe("Continue");
    expect(markup.querySelector("a")?.hasAttribute("type")).toBe(false);
    expect(markup.querySelector("button")).toBeNull();
  });

  it("honors a default merge flag when the incoming renderer has a different tag", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Button: Component("button", { title: "default title" }) },
      defaultMergeFlags: new Set([
        CustoComponentFlags.avoidMergingDifferentComponents,
      ]),
    });

    const markup = renderHtml(
      <>
        <MergingProvider
          value={{ Button: Component("button", { className: "same" }) }}
        >
          <UI.Button>Same tag</UI.Button>
        </MergingProvider>
        <MergingProvider
          value={{ Button: Component("a", { href: "#details" }) }}
        >
          <UI.Button>Different tag</UI.Button>
        </MergingProvider>
      </>
    );

    expect(markup.querySelector("button")?.title).toBe("default title");
    expect(markup.querySelector("a")?.getAttribute("href")).toBe("#details");
    expect(markup.querySelector("a")?.hasAttribute("title")).toBe(false);
  });

  it("passes inherited flags to a custom component merge strategy", () => {
    const inherited = Component("button", { className: "inherited" });
    const mergeStrategy = vi.fn((_incoming, previous) => previous);
    const override = Component("button", { className: "incoming" }).config({
      mergeStrategy,
    });
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Button: inherited },
      defaultMergeFlags: ["package"],
    });

    const markup = renderHtml(
      <MergingProvider value={{ Button: override }}>
        <UI.Button>Pay</UI.Button>
      </MergingProvider>
    );

    expect(markup.querySelector("button")?.className).toBe("inherited");
    expect(mergeStrategy).toHaveBeenCalledExactlyOnceWith(
      override,
      inherited,
      new Set(["package"])
    );
  });

  it("lets a custom provider convert input and expose added merge flags", () => {
    const defaults = { Label: Text("Default") };
    const result = buildCusto({
      defaultValue: defaults,
      defaultMergeFlags: ["package"],
    });
    const [UI] = result;
    const Provider = result.Container.addProvider(
      createProviderMergingLogic<string, typeof defaults>({
        transformationHook: (label) => ({ Label: Text(label) }),
        mergeFlags: ["custom"],
      })
    );

    function Flags() {
      const { mergeFlags } = result.Container.useValue();
      return <output>{Array.from(mergeFlags ?? []).join(",")}</output>;
    }

    const markup = renderHtml(
      <Provider value="Scoped">
        <p>
          <UI.Label />
        </p>
        <Flags />
      </Provider>
    );

    expect(markup.querySelector("p")?.textContent).toBe("Scoped");
    expect(markup.querySelector("output")?.textContent).toBe("custom,package");
  });

  it("creates an empty tree without defaults and supports a value from the raw container", () => {
    const result = buildCusto<{ label: string }>({ defaultValue: undefined });

    function Output() {
      return <output>{result.Container.useValue().value.label}</output>;
    }

    expect(result[0]).toEqual({});
    const markup = renderHtml(
      <result.Container.Provider value={{ value: { label: "supplied" } }}>
        <Output />
      </result.Container.Provider>
    );
    expect(markup.textContent).toBe("supplied");
  });

  it("calls mergeDecisionFn only for collisions, with a nested path", () => {
    const shared = Text("unchanged");
    const defaults = {
      Nested: { Label: Text("Default"), Shared: shared, Other: Text("other") },
    };
    const override = { Nested: { Label: "Scoped", Shared: shared } };
    const paths: string[] = [];
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: defaults,
      mergeDecisionFn: (path) => {
        paths.push(path);
        return { skip: false };
      },
    });

    const markup = renderHtml(
      <MergingProvider value={override}>
        <UI.Nested.Label /> / <UI.Nested.Other />
      </MergingProvider>
    );

    expect(markup.textContent).toBe("Scoped / other");
    expect(paths).toEqual(["Nested", "Nested.Label"]);
  });

  it("lets a disabled layer inherit the active provider above it", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Label: Text("Default") },
    });
    const markup = renderHtml(
      <MergingProvider value={{ Label: "Outer" }}>
        <MergingProvider value={{ Label: "Disabled" }} __disabled>
          <UI.Label />
        </MergingProvider>
      </MergingProvider>
    );

    expect(markup.textContent).toBe("Outer");
  });

  it("honors explicit provider order even when the higher priority layer is outside", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Label: Text("Default") },
    });
    const markup = renderHtml(
      <MergingProvider value={{ Label: "Outer" }} __order={10}>
        <MergingProvider value={{ Label: "Inner" }}>
          <UI.Label />
        </MergingProvider>
      </MergingProvider>
    );

    expect(markup.textContent).toBe("Outer");
  });

  it("replaces an object stored as a Data leaf", () => {
    type Summary = { label?: string; count: number };
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Summary: Data<Summary>({ label: "Default", count: 2 }) },
    });
    function Output() {
      const summary = UI.Summary.use();
      return (
        <output>
          {summary.label ?? "unlabeled"}:{summary.count}
        </output>
      );
    }

    const markup = renderHtml(
      <MergingProvider value={{ Summary: { count: 0 } }}>
        <Output />
      </MergingProvider>
    );

    expect(markup.textContent).toBe("unlabeled:0");
  });

  it("replaces nested data values while inheriting sibling settings", () => {
    interface Style {
      color?: string;
      name?: string;
      styles?: string;
    }

    const serialized = { name: "parent", styles: "color:red" };
    const local = { color: "blue" };
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: {
        Tabs: { style: Data<Style>({}), Label: Text("Default") },
      },
    });
    const read = vi.fn();
    function Output() {
      read(UI.Tabs.style.use());
      return <UI.Tabs.Label />;
    }

    const markup = renderHtml(
      <MergingProvider value={{ Tabs: { style: serialized, Label: "Parent" } }}>
        <MergingProvider value={{ Tabs: { style: local } }}>
          <Output />
        </MergingProvider>
      </MergingProvider>
    );

    expect(read.mock.calls[0]?.[0]).toBe(local);
    expect(markup.textContent).toBe("Parent");
  });

  it("replaces a null text or data value in a nested provider", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: {
        Title: Text("Default"),
        Count: Data<number | null>(1),
      },
    });
    function Output() {
      return <output>{UI.Count.use()}</output>;
    }

    const markup = renderHtml(
      <MergingProvider value={{ Title: null, Count: null }}>
        <MergingProvider value={{ Title: "Restored", Count: 0 }}>
          <UI.Title />
          <Output />
        </MergingProvider>
      </MergingProvider>
    );

    expect(markup.textContent).toBe("Restored0");
  });

  it("does not merge props from an inherited React element into its replacement", () => {
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Label: Text("Default") },
    });
    const markup = renderHtml(
      <MergingProvider value={{ Label: <a href="/old">Old</a> }}>
        <MergingProvider value={{ Label: <button type="button">New</button> }}>
          <UI.Label />
        </MergingProvider>
      </MergingProvider>
    );

    expect(markup.querySelector("button")?.outerHTML).toBe(
      '<button type="button">New</button>'
    );
  });

  it("copies a JSON __proto__ key as data when inheriting a provider value", () => {
    const { Container, Contexts } = buildCusto({
      defaultValue: { Label: Text("Default") },
    });
    const { MergingProvider } = Contexts;
    const inherited = JSON.parse('{"__proto__":{"injected":true}}');
    const read = vi.fn();
    function Output() {
      read(Container.useValue().value);
      return null;
    }

    renderHtml(
      <MergingProvider value={inherited}>
        <MergingProvider value={{}}>
          <Output />
        </MergingProvider>
      </MergingProvider>
    );

    const value = read.mock.calls[0]?.[0];
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(value, "__proto__")?.value).toEqual({
      injected: true,
    });
    expect(value.injected).toBeUndefined();
  });
});
