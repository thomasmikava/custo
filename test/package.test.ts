// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "vitest";

const publicExports = [
  "CreateCusto",
  "CustoComponent",
  "CustoComponentFlags",
  "CustoType",
  "WrapInCustHookChangeError",
  "buildCusto",
  "createComponentsTransformation",
  "createProviderMergingLogic",
  "transformToCusto",
];

const renderCheckout = `
  assert.deepEqual(Object.keys(custo).sort(), ${JSON.stringify(publicExports)});
  const customization = custo.buildCusto({
    defaultValue: {
      Button: custo.CreateCusto.Component("button", { type: "submit" }),
      Label: custo.CreateCusto.Text("Pay"),
    },
  });
  const [UI, { MergingProvider }] = customization;
  assert.equal("memoContainer" in customization, false);
  const checkout = React.createElement(MergingProvider, { value: { Label: "Checkout" } },
    React.createElement(UI.Button, null, React.createElement(UI.Label)));
  assert.equal(renderToStaticMarkup(checkout), '<button type="submit">Checkout</button>');
`;

function runNode(format: "commonjs" | "module", code: string) {
  execFileSync(process.execPath, [`--input-type=${format}`, "-e", code], {
    env: { ...process.env, NODE_ENV: "production" },
  });
}

describe("package entry points", () => {
  it("supports the public CommonJS API with Node require", () => {
    runNode(
      "commonjs",
      `
      const assert = require("node:assert/strict");
      const React = require("react");
      const { renderToStaticMarkup } = require("react-dom/server");
      const custo = require("custo");
      assert(require.resolve("custo").endsWith("index.js"));
      ${renderCheckout}
      assert.throws(() => require("custo/lib/index.js"), {
        code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
      });
    `
    );
  });

  it("supports native Node ESM and shares class identity with CommonJS", () => {
    runNode(
      "module",
      `
      import assert from "node:assert/strict";
      import { createRequire } from "node:module";
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import * as custo from "custo";
      assert(import.meta.resolve("custo").endsWith("index.node.mjs"));
      ${renderCheckout}

      const commonjs = createRequire(import.meta.url)("custo");
      const button = commonjs.CreateCusto.Component("button");
      assert(button instanceof custo.CustoComponent);
      assert.equal(custo.buildCusto, commonjs.buildCusto);
      await assert.rejects(import("custo/lib/index.mjs"), {
        code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
      });
    `
    );
  });

  it("renders through the standalone ESM build and accepts a container from another bundle", () => {
    runNode(
      "module",
      `
      import assert from "node:assert/strict";
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import * as custo from "./lib/index.mjs";
      import commonjs from "./lib/index.js";
      ${renderCheckout}
      const { Container } = commonjs.buildCusto({
        defaultValue: { Label: commonjs.CustoType.text },
      });
      const ExternalUI = custo.CreateCusto.Tree(Container);
      const consumer = React.createElement(Container.Provider,
        { value: { value: { Label: "Shared container" } } },
        React.createElement(ExternalUI.Label));
      assert.equal(renderToStaticMarkup(consumer), "Shared container");
    `
    );
  });

  it("resolves public TypeScript types in both formats and blocks private types", () => {
    const directory = mkdtempSync(join(tmpdir(), "custo-types-"));
    const modules = join(directory, "node_modules");
    try {
      mkdirSync(modules);
      symlinkSync(process.cwd(), join(modules, "custo"), "junction");
      const esm = join(directory, "consumer.mts");
      const commonjs = join(directory, "consumer.cts");
      writeFileSync(
        esm,
        `
        import {
          buildCusto, CreateCusto, type CustoComponentOptions, type CustoTree,
          type CustoProviderRawValue, type CustoProviderValue, type DeeplyOptionalCustoProviderValue,
        } from "custo";
        // @ts-expect-error Generic unwrapping helpers are internal.
        import type { ToVeryGeneralCusto } from "custo";
        // @ts-expect-error Declaration subpaths are private.
        import type { CustoData } from "custo/lib/classes/data.js";
        const options: CustoComponentOptions<{ title?: string }> = { stripPropKeys: ["title"] };
        const defaults = { Button: CreateCusto.Component("button").config(options), Label: CreateCusto.Text("Pay") };
        const result = buildCusto({ defaultValue: defaults });
        const ui: CustoTree<typeof defaults> = result[0];
        const raw: CustoProviderRawValue<typeof defaults> = { value: defaults };
        const value: CustoProviderValue<typeof result.Container> = defaults;
        const overrides: DeeplyOptionalCustoProviderValue<typeof result.Container> = { Label: "Checkout" };
        result.Contexts.createValue(overrides);
        const CustomProvider = result.Container.addProvider((label: string, inherited) => ({
          ...inherited,
          value: { ...inherited.value, Label: CreateCusto.Text(label) },
        }));
        CustomProvider.createValue("Checkout");
        // @ts-expect-error The merge cache is private.
        result.memoContainer;
      `
      );
      writeFileSync(
        commonjs,
        `
        import custo = require("custo");
        const defaults = { Label: custo.CreateCusto.Text("Pay") };
        const [ui, contexts] = custo.buildCusto({ defaultValue: defaults });
        const tree: custo.CustoTree<typeof defaults> = ui;
        contexts.createValue({ Label: "Checkout" });
      `
      );
      execFileSync(
        process.execPath,
        [
          resolve("node_modules/typescript/bin/tsc"),
          "--module",
          "NodeNext",
          "--noEmit",
          "--strict",
          esm,
          commonjs,
        ],
        { cwd: directory }
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
