import { useMemo } from "react";
import { StackedContext } from "react-flexible-contexts";
import { buildCustoTree, type CustoTree } from "../classes/helper-fns/tree";
import {
  CustoComponentFlags,
  type CustoMergeFlag,
  type custoMergeFlags,
} from "../flags";
import type { DeeplyOptional } from "../utils/generics";
import { type MergeDecisionFn, mergeCustomizations } from "../utils/objects";
import type { ToVeryGeneralCusto } from "../utils/prop-generics";
import { MultiDimentionalWeakMap } from "../utils/weak-map";
import type { CustoContainer, CustoProvider } from "./context-types";

export interface CostoContexts<LayerData> {
  MergingProvider: CustoProvider<LayerData>;
  NonPackageMergingProvider: CustoProvider<LayerData>;
  Provider: CustoProvider<LayerData>;
  NonMergingProvider: CustoProvider<LayerData>;
  createValue: (value: LayerData) => LayerData;
}

export type CustoProvidersReturnValue<
  RawValue extends Record<any, any>,
  Value,
  LayerData,
> = readonly [CustoTree<RawValue>, CostoContexts<LayerData>] & {
  Container: CustoContainer<CustoProviderRawValue<RawValue>, Value>;
  Contexts: CostoContexts<LayerData>;
};

export function buildCusto<
  RawValue extends Record<any, any>,
  Value = CustoProviderRawValue<ToVeryGeneralCusto<RawValue>, RawValue>,
  LayerData = ToVeryGeneralCusto<DeeplyOptional<RawValue>>,
>({
  defaultValue,
  defaultMergeFlags,
  layerTransformationHook,
  contextDisplayName,
  rawToFinalValueHook,
  mergeDecisionFn,
}: {
  layerTransformationHook?: ((arg: LayerData) => RawValue) | undefined;
  rawToFinalValueHook?:
    | ((data: CustoProviderRawValue<RawValue, {}>) => Value)
    | undefined;
  contextDisplayName?: string | undefined;
  mergeDecisionFn?: MergeDecisionFn | undefined;
  defaultValue: RawValue | undefined;
  defaultMergeFlags?: custoMergeFlags | null | undefined;
}): CustoProvidersReturnValue<RawValue, Value, LayerData>;

export function buildCusto<
  RawValue extends Record<any, any>,
  Value = CustoProviderRawValue<ToVeryGeneralCusto<RawValue>, RawValue>,
  LayerData = ToVeryGeneralCusto<DeeplyOptional<RawValue>>,
>({
  defaultValue,
  defaultMergeFlags,
  layerTransformationHook = ((x) => x) as any,
  contextDisplayName,
  rawToFinalValueHook,
  mergeDecisionFn,
}: {
  layerTransformationHook?: (arg: LayerData) => RawValue;
  rawToFinalValueHook?: (data: CustoProviderRawValue<RawValue>) => Value;
  contextDisplayName?: string;
  mergeDecisionFn?: MergeDecisionFn;
  defaultValue: RawValue | undefined;
  defaultMergeFlags?: custoMergeFlags | null;
}): CustoProvidersReturnValue<RawValue, Value, LayerData> {
  const memoContainer = new MultiDimentionalWeakMap(5);

  const contextDefaultValue: CustoProviderRawValue<RawValue> | undefined =
    defaultValue === undefined
      ? undefined
      : {
          mergeFlags: defaultMergeFlags ?? [],
          value: defaultValue,
        };

  const Container = StackedContext.create<
    CustoProviderRawValue<RawValue>,
    Value
  >(contextDefaultValue, "value", { rawToFinalValueHook });
  if (contextDisplayName) {
    Container.context.setContextName(contextDisplayName);
  }

  // merges everything
  const MergingProvider = Container.addProvider(
    createMergingLogic<LayerData, RawValue>(
      { transformationHook: layerTransformationHook, mergeDecisionFn },
      memoContainer,
      defaultValue
    )
  );

  // merges everything except default value
  const NonPackageMergingProvider = Container.addProvider(
    createMergingLogic<LayerData, RawValue>(
      {
        transformationHook: layerTransformationHook,
        avoidPackageCustoMerging: true,
        mergeDecisionFn,
      },
      memoContainer,
      defaultValue
    )
  );

  // does not merge anything
  const NonMergingProvider = Container.addProvider(
    createMergingLogic<LayerData, RawValue>(
      {
        transformationHook: layerTransformationHook,
        avoidNonPackageCustoMerging: true,
        avoidPackageCustoMerging: true,
        mergeDecisionFn,
      },
      memoContainer,
      defaultValue
    )
  );

  const Contexts: CostoContexts<LayerData> = {
    MergingProvider,
    NonPackageMergingProvider,
    NonMergingProvider,
    Provider: NonMergingProvider,
    createValue: <T extends any>(v: T) => v,
  };

  const arr = [
    defaultValue ? buildCustoTree(Container as any) : {},
    Contexts,
  ] as any as CustoProvidersReturnValue<RawValue, Value, LayerData>;
  arr.Container = Container;
  arr.Contexts = Contexts;

  return arr;
}

interface ProviderMergingOptions<LayerValue, FinalValue> {
  transformationHook?: (arg: LayerValue) => FinalValue;
  avoidNonPackageCustoMerging?: boolean;
  avoidPackageCustoMerging?: boolean;
  mergeFlags?: custoMergeFlags;
  mergeDecisionFn?: MergeDecisionFn;
}

export const createProviderMergingLogic = <
  LayerValue,
  FinalValue extends Record<any, any> = Extract<LayerValue, Record<any, any>>,
>(
  options: ProviderMergingOptions<LayerValue, FinalValue>
) => createMergingLogic(options, new MultiDimentionalWeakMap(5));

function createMergingLogic<LayerValue, FinalValue extends Record<any, any>>(
  {
    transformationHook = (x) => x as unknown as FinalValue,
    avoidNonPackageCustoMerging,
    avoidPackageCustoMerging,
    mergeFlags: defaultMergingFlags,
    mergeDecisionFn,
  }: ProviderMergingOptions<LayerValue, FinalValue>,
  memoContainer: MultiDimentionalWeakMap<5>,
  schema?: FinalValue
) {
  const avoidCustomizationsMerging = Boolean(
    avoidNonPackageCustoMerging && avoidPackageCustoMerging
  );
  const localFlags: CustoMergeFlag[] = [...(defaultMergingFlags ?? [])];
  if (avoidNonPackageCustoMerging) {
    localFlags.push(CustoComponentFlags.avoidWithNonPackageValue);
  }
  if (avoidPackageCustoMerging) {
    localFlags.push(CustoComponentFlags.avoidWithPackageDefaultValue);
  }

  return (
    customizations: LayerValue,
    {
      value: inherited,
      mergeFlags: inheritedFlags,
    }: CustoProviderRawValue<FinalValue>
  ): CustoProviderRawValue<FinalValue> => {
    const mergeFlags = useMemo(
      () => new Set([...localFlags, ...(inheritedFlags ?? [])]),
      [inheritedFlags]
    );
    const transformed = transformationHook(customizations);
    const value = useMemo(
      () =>
        mergeCustomizations({
          object1: transformed,
          object2: inherited,
          memoContainer,
          mergeStrategy: "overrideLeftToRight",
          avoidCustomizationsMerging,
          mergeFlags,
          decisionFn: mergeDecisionFn,
          schema,
        }),
      [transformed, inherited, mergeFlags]
    );
    return useMemo(() => ({ value, mergeFlags }), [value, mergeFlags]);
  };
}

export interface CustoProviderRawValue<V, hackProp = {}> {
  value: V;
  mergeFlags?: custoMergeFlags;
  hackProp?: hackProp;
}
export type UnwrapContainerValue<T> = T extends {
  useValue(): CustoProviderRawValue<infer Obj, any>;
}
  ? Obj
  : never;
export type UnwrapContainerValueHack<T> = T extends {
  useValue(): CustoProviderRawValue<any, infer Obj>;
}
  ? Obj
  : never;
