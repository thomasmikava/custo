import type { CustoProviderRawValue } from "../..";
import type {
  CustoContainer,
  CustoSelector,
} from "../../components/context-types";
import { CustoType } from "../../interfaces";
import { isCustoClass } from "../../utils";
import type { DeeplyOptional } from "../../utils/generics";
import { setOwnProperty, untypedGetProp } from "../../utils/prop";
import { CustoComponent } from "../components";
import { CustoData } from "../data";
import { CustoHook } from "../hook";
import type { CustoTypeToVeryGeneralClass } from "../interfaces";
import { CustoText, type CustoTextProps, type custoTextInType } from "../texts";
import { buildCustoComponent, type CustoComponentRenderer } from "./components";
import { buildCustoData } from "./data";
import { buildCustoHook } from "./hook";
import { buildCustoText, type CustoTextComponent } from "./texts";

export type ToCustoTreeObj<T> = T extends (...args: any[]) => void
  ? CustoType
  : T extends { $$end$$: true }
    ? CustoType
    : T extends Record<any, any>
      ? {
          [key in keyof T]-?: ToCustoTreeObj<T[key]>;
        }
      : never;

export interface TreeOptions<Obj extends Record<any, any>> {
  getTextTransformationHook?: () => CustoHook<
    (oldText: custoTextInType) => custoTextInType
  >;
  prefixes?: (string | number | symbol)[];
  defaultValue?: DeeplyOptional<Obj>;
  defaultValuesByTypes?: {
    [key in CustoType]?: CustoTypeToVeryGeneralClass<key>;
  };
}

const getArgs = <Obj extends Record<any, any>>(
  args: any[]
): {
  obj: Obj;
  useSelector: CustoSelector<readonly unknown[]>;
  options: TreeOptions<Obj>;
} => {
  // The plain-tree overload takes a selector. Containers can come from another bundle.
  if (typeof args[1] !== "function") {
    return {
      obj: args[0].context.modifiedDefaultValueGetter().value,
      useSelector: args[0].context.useSelector,
      options: args[1] || {},
    };
  }
  return { obj: args[0], useSelector: args[1], options: args[2] || {} };
};

export function buildCustoTree<Obj extends Record<any, any>>(
  obj: Obj,
  useSelector: CustoSelector<readonly unknown[]>,
  options?: TreeOptions<Obj>
): CustoTree<Obj>;
export function buildCustoTree<Obj extends Record<any, any>>(
  stackedContainer: CustoContainer<any, CustoProviderRawValue<any, Obj>>,
  options?: TreeOptions<Obj>
): CustoTree<Obj>;
export function buildCustoTree<Obj extends Record<any, any>>(
  ...args: any
): CustoTree<Obj> {
  const { obj, useSelector, options } = getArgs<Obj>(args);
  const defaultValuesByTypes = options.defaultValuesByTypes || {};
  const prefixes = options.prefixes || ["value"];
  const helper = (
    prefixes: (string | number | symbol)[],
    obj: any,
    defaultValue: any
  ) => {
    const final: Record<string, unknown> = {};
    for (const key of Object.keys(obj ?? {})) {
      const val = obj[key];
      const defVal =
        defaultValue && Object.getOwnPropertyDescriptor(defaultValue, key)
          ? defaultValue[key]
          : undefined;
      const getVal = () =>
        useSelector((x) => untypedGetProp(x as any, ...prefixes, key), []);
      const path = [...prefixes, key].join(".");
      let slot: unknown;
      if (
        val === CustoType.component ||
        val instanceof CustoComponent ||
        (val instanceof CustoHook && val.type === CustoType.component)
      ) {
        slot = buildCustoComponent(
          getVal,
          path,
          defVal || defaultValuesByTypes[CustoType.component]
        );
      } else if (
        val === CustoType.text ||
        val instanceof CustoText ||
        (val instanceof CustoHook && val.type === CustoType.text)
      ) {
        slot = buildCustoText(
          getVal,
          options.getTextTransformationHook,
          path,
          defVal || defaultValuesByTypes[CustoType.text]
        );
      } else if (
        val === CustoType.data ||
        val instanceof CustoData ||
        (val instanceof CustoHook && val.type === CustoType.data)
      ) {
        slot = buildCustoData(
          getVal,
          path,
          defVal || defaultValuesByTypes[CustoType.data]
        );
      } else if (
        val === CustoType.hook ||
        (val instanceof CustoHook && val.type === CustoType.hook)
      ) {
        slot = buildCustoHook(
          getVal,
          path,
          defVal || defaultValuesByTypes[CustoType.hook]
        );
      } else if (isCustoClass(val)) {
        continue;
      } else {
        slot = helper([...prefixes, key], val, defVal);
      }
      setOwnProperty(final, key, slot);
    }
    return final;
  };
  const result = helper(prefixes || [], obj, options.defaultValue);
  return result as any;
}

export type CustoTree<T> = T extends { $$end$$: true }
  ? T extends CustoComponent<infer Props, infer Ref>
    ? CustoComponentRenderer<Props, Ref>
    : T extends CustoHook<(prop: any) => CustoComponent<infer Props, infer Ref>>
      ? CustoComponentRenderer<Props, Ref>
      : T extends CustoText
        ? CustoTextComponent<CustoTextProps>
        : T extends CustoHook<
              (props: infer Props extends CustoTextProps) => CustoText
            >
          ? CustoTextComponent<Props>
          : T extends CustoHook<(...args: any[]) => any>
            ? T
            : T extends CustoData<infer Data, infer Args>
              ? CustoHook<(...args: Args) => Data>
              : T
  : T extends Record<any, any>
    ? { [key in keyof T]-?: CustoTree<T[key]> }
    : never;
