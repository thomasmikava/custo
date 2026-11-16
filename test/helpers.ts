import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";

export function renderHtml(view: ReactNode) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(view);
  return container;
}

export async function withRoot(
  run: (fixture: {
    container: HTMLDivElement;
    render: (view: ReactNode) => Promise<void>;
  }) => Promise<void>
) {
  const environment = Object.getOwnPropertyDescriptor(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT"
  );
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await run({
      container,
      render: async (view) => {
        await act(() => root.render(view));
      },
    });
  } finally {
    try {
      await act(() => root.unmount());
    } finally {
      if (environment) {
        Object.defineProperty(
          globalThis,
          "IS_REACT_ACT_ENVIRONMENT",
          environment
        );
      } else {
        Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
      }
    }
  }
}
