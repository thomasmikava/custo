import React, { act, type HTMLProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { buildCusto, CreateCusto, CustoComponentFlags } from "../src";
import { renderHtml, withRoot } from "./helpers";

const { Component } = CreateCusto;

function position(id: string) {
  return function Position({ children, title }: HTMLProps<HTMLElement>) {
    return (
      <div id={id} title={title}>
        {children ?? id}
      </div>
    );
  };
}

function RenderProbe({
  label,
  onRender,
}: {
  label: string;
  onRender: (label: string) => void;
}) {
  onRender(label);
  return <button type="button">{label}</button>;
}

describe("CustoComponent", () => {
  it("renders all positional components in order and passes props to each placement", () => {
    const [UI] = buildCusto({
      defaultValue: {
        Body: Component("section", { id: "body" }).config({
          components: {
            outermostWrapper: [position("outermost")],
            outerBefore: [position("before")],
            outerWrapper: [position("outer")],
            innerWrapper: [position("inner")],
            innerStart: [position("start")],
            innermostWrapper: [position("innermost")],
            innerEnd: [position("end")],
            outerAfter: [position("after")],
          },
        }),
      },
    });
    const markup = renderHtml(
      <UI.Body title="shared">
        <strong id="content">Content</strong>
      </UI.Body>
    );

    expect(
      Array.from(markup.querySelectorAll("[id]"), (node) => node.id)
    ).toEqual([
      "outermost",
      "before",
      "outer",
      "body",
      "inner",
      "start",
      "innermost",
      "content",
      "end",
      "after",
    ]);
    expect(
      markup.querySelector(
        "#outermost > #outer > #body > #inner > #innermost > #content"
      )?.textContent
    ).toBe("Content");
    expect(markup.querySelectorAll('[title="shared"]')).toHaveLength(9);
  });

  it("inserts at a circular index without changing the original definition", () => {
    const base = Component("section").addComponent("innerStart", [
      position("first"),
      position("last"),
    ]);
    const derived = base.addComponent("innerStart", position("middle"), -2);
    const wrapped = derived.addComponent("innerStart", position("wrapped"), 5);

    const renderIds = (configuration: typeof base) =>
      Array.from(
        renderHtml(configuration.render({})).querySelectorAll("[id]"),
        (node) => node.id
      );
    expect(renderIds(base)).toEqual(["first", "last"]);
    expect(renderIds(derived)).toEqual(["first", "middle", "last"]);
    expect(renderIds(wrapped)).toEqual(["first", "wrapped", "middle", "last"]);
  });

  it("combines paired placements in the correct order across a provider boundary", () => {
    const base = Component("section").config({
      components: {
        outerBefore: [position("base-before")],
        innerStart: [position("base-start")],
        innerEnd: [position("base-end")],
        outerAfter: [position("base-after")],
      },
    });
    const patch = Component("section").config({
      components: {
        outerBefore: [position("local-before")],
        innerStart: [position("local-start")],
        innerEnd: [position("local-end")],
        outerAfter: [position("local-after")],
      },
    });
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Body: base },
    });
    const markup = renderHtml(
      <MergingProvider value={{ Body: patch }}>
        <UI.Body>
          <strong id="content">Content</strong>
        </UI.Body>
      </MergingProvider>
    );

    expect(
      Array.from(markup.querySelectorAll("[id]"), (node) => node.id)
    ).toEqual([
      "local-before",
      "base-before",
      "local-start",
      "base-start",
      "content",
      "base-end",
      "local-end",
      "base-after",
      "local-after",
    ]);
  });

  it("evaluates functional defaults against the caller's props", () => {
    const button = Component("button", (props) => ({
      type: "button",
      title: "base",
      "aria-label": `Action ${props.id}`,
    })).props((props) => ({
      className: `button-${props.id}`,
    }));
    const [UI] = buildCusto({ defaultValue: { Button: button } });
    const element = renderHtml(
      <UI.Button id="pay" title="caller">
        Pay
      </UI.Button>
    ).querySelector("button");

    expect(element?.className).toBe("button-pay");
    expect(element?.getAttribute("aria-label")).toBe("Action pay");
    expect(element?.type).toBe("button");
    expect(element?.title).toBe("caller");
  });

  it("uses a custom strategy for combining caller props with defaults", () => {
    const button = Component("button", {
      title: "default",
      className: "base",
    }).config({
      propsToDefaultPropsMergeStrategy: (props, defaults) => ({
        ...props,
        ...defaults,
        className: `${defaults.className} ${props.className}`,
      }),
    });
    const element = renderHtml(
      button.render({ title: "caller", className: "local", children: "Pay" })
    ).querySelector("button");

    expect(element?.title).toBe("default");
    expect(element?.className).toBe("base local");
    expect(element?.textContent).toBe("Pay");
  });

  it("removes configured keys before running the props transform", () => {
    type Props = HTMLProps<HTMLButtonElement> & { internalmarker?: string };
    const transform = vi.fn((props: Props) => ({
      ...props,
      title: "transformed",
    }));
    const button = Component("button")
      .as<Props>()
      .config({
        stripPropKeys: ["internalmarker"],
        transformProps: transform,
      });
    const [UI] = buildCusto({ defaultValue: { Button: button } });
    const element = renderHtml(
      <UI.Button id="target" internalmarker="hidden">
        Pay
      </UI.Button>
    ).querySelector("button");

    expect(transform).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "target" })
    );
    expect(transform.mock.calls[0]?.[0]).not.toHaveProperty("internalmarker");
    expect(element?.title).toBe("transformed");
    expect(element?.hasAttribute("internalmarker")).toBe(false);
  });

  it.each([
    ["default sanitation", "default", false],
    ["sanitation disabled with a flag", "passthrough", true],
    ["sanitation restored by subtracting the flag", "restored", false],
  ] as const)("%s", (_description, mode, passthrough) => {
    type Props = HTMLProps<HTMLButtonElement> & { internalmarker?: string };
    const base = Component("button").as<Props>();
    const pass = base.addFlags(
      CustoComponentFlags.avoidStrippingInvalidDOMProps
    );
    const configurations = {
      default: base,
      passthrough: pass,
      restored: pass.subtractFlags(
        CustoComponentFlags.avoidStrippingInvalidDOMProps
      ),
    };
    const element = renderHtml(
      configurations[mode].render({
        internalmarker: "test",
        id: "target",
      })
    ).querySelector("button");
    expect(element?.hasAttribute("internalmarker")).toBe(passthrough);
    expect(element?.id).toBe("target");
  });

  it("merges styles and calls the incoming handler before the inherited handler", async () => {
    const onClick = vi.fn();
    const defaults = Component("button", {
      style: { color: "red", opacity: 0.5 },
      onClick: () => onClick("base"),
    });
    const override = Component("button", {
      style: { color: "blue" },
      onClick: () => onClick("override"),
    });
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Button: defaults },
    });

    await withRoot(async ({ container, render }) => {
      await render(
        <MergingProvider value={{ Button: override }}>
          <UI.Button>Pay</UI.Button>
        </MergingProvider>
      );
      const button = container.querySelector("button");
      expect(button?.style.color).toBe("blue");
      expect(button?.style.opacity).toBe("0.5");
      await act(() => button?.click());
      expect(onClick.mock.calls).toEqual([["override"], ["base"]]);
    });
  });

  it("memoizes the inner renderer when its props stay equal", async () => {
    const onRender = vi.fn();
    const [UI] = buildCusto({
      defaultValue: { Button: Component(RenderProbe).memo() },
    });

    await withRoot(async ({ container, render }) => {
      await render(<UI.Button label="initial" onRender={onRender} />);
      await render(<UI.Button label="initial" onRender={onRender} />);
      expect(onRender.mock.calls).toEqual([["initial"]]);

      await render(<UI.Button label="changed" onRender={onRender} />);
      expect(onRender.mock.calls).toEqual([["initial"], ["changed"]]);
      expect(container.textContent).toBe("changed");
    });
  });

  it("disables and re-enables inherited props with mergeable", () => {
    const inherited = Component("button", { type: "submit", title: "base" });
    const blocked = Component("button", { className: "local" }).mergeable(
      false
    );

    const noMerge = renderHtml(blocked.mergeClass(inherited).render({}));
    const merged = renderHtml(
      blocked.mergeable(true).mergeClass(inherited).render({})
    );

    expect(noMerge.querySelector("button")?.getAttribute("type")).toBeNull();
    expect(merged.querySelector("button")?.getAttribute("type")).toBe("submit");
    expect(merged.querySelector("button")?.title).toBe("base");
  });

  it("keeps explicit falsy props when overriding inherited DOM defaults", () => {
    const inherited = Component("button", {
      disabled: true,
      tabIndex: 2,
      title: "Default",
    });
    const override = Component("button", {
      disabled: false,
      tabIndex: 0,
      title: "",
    });
    const [UI, { MergingProvider }] = buildCusto({
      defaultValue: { Button: inherited },
    });
    const markup = renderHtml(
      <MergingProvider value={{ Button: override }}>
        <UI.Button>Pay</UI.Button>
      </MergingProvider>
    );

    const button = markup.querySelector("button");
    expect(button?.disabled).toBe(false);
    expect(button?.getAttribute("tabindex")).toBe("0");
    expect(button?.title).toBe("");
  });
});
