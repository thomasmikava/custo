import type { ReactElement, ReactNode } from "react";

interface ProviderMetadata {
  __order?: number;
  __disabled?: boolean;
  children?: ReactNode;
}

type ValueFactory<Value> = { createValue: <T extends Value>(value: T) => T };

type ContextProvider<Value> = (
  props: { value: Value } & ProviderMetadata
) => ReactElement | null;

export type CustoProvider<Value> = ContextProvider<Value> & ValueFactory<Value>;

type DestructuredProvider<Value> = ((
  props: Value & ProviderMetadata
) => ReactElement | null) &
  ValueFactory<Value>;

type Equality<Value> = (previous: Value, next: Value) => boolean;

export interface CustoSelector<Args extends readonly unknown[]> {
  (): Args;
  <Result>(
    select: (...args: Args) => Result,
    dependencies?: readonly unknown[] | null,
    label?: string
  ): Result;
  <Result>(
    select: (...args: Args) => Result,
    equal: Equality<Result>,
    dependencies?: readonly unknown[] | null,
    label?: string
  ): Result;
}

interface ExtensibleSelector<Args extends readonly unknown[]>
  extends CustoSelector<Args> {
  extendHook<Selected extends readonly unknown[]>(
    select: (...args: Args) => Selected
  ): ExtensibleSelector<Selected>;
  setEqualityFn(equal: Equality<any>): void;
  getEqualityFnInfo(): { isDefaultFn: boolean; fn: Equality<any> };
}

interface CustoContext<RawValue, Value> extends ValueFactory<RawValue> {
  Provider: ContextProvider<RawValue>;
  useValue(): Value;
  useRawValue(): RawValue;
  useSelector: ExtensibleSelector<[Value, () => RawValue]>;
  useProperty<Key extends Value extends Record<any, any> ? keyof Value : never>(
    key: Key
  ): Value extends Record<any, any> ? Value[Key] : never;
  useProperties<
    Key extends Value extends Record<any, any> ? keyof Value : never,
  >(...keys: Key[]): Value extends Record<any, any> ? Pick<Value, Key> : never;
  setContextName(name: string | undefined): void;
  setDefaultValue(value: RawValue): void;
  setDefaultValueGetter(getValue: () => RawValue): void;
}

export interface CustoContainer<RawValue, Value>
  extends ValueFactory<RawValue> {
  readonly context: CustoContext<RawValue, Value>;
  readonly Provider: ContextProvider<RawValue>;
  useValue(): Value;
  addProvider<Layer>(
    merge: (incoming: Layer, inherited: RawValue) => RawValue
  ): CustoProvider<Layer>;
  addDestructuredProvider<Layer extends Record<any, any>>(
    merge: (incoming: Layer, inherited: RawValue) => RawValue
  ): DestructuredProvider<Layer>;
}
