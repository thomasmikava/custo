import type { CustoComponent } from "../classes/components";
import type { CustoData } from "../classes/data";
import type { CustoHook } from "../classes/hook";
import type {
  CustoText,
  CustoTextProps,
  custoTextInType,
} from "../classes/texts";
import type { CustoClass } from "../interfaces";

export type ValueOrHook<T, Args extends readonly any[]> =
  | T
  | CustoHook<(...args: Args) => T>;

export type GeneralCustoText<Props extends CustoTextProps = CustoTextProps> =
  ValueOrHook<CustoText<Props>, [Props]>;

export type GeneralCustoComp<
  Props extends Record<any, any>,
  Ref = unknown,
> = ValueOrHook<CustoComponent<Props, Ref>, [Props]>;

export type GeneralCustoData<Data, HiddenArgs extends readonly any[] = []> =
  | CustoData<Data, HiddenArgs>
  | CustoHook<(...args: HiddenArgs) => Data>;

export type GeneralCustoHook<Fn extends (...args: any[]) => any> =
  CustoHook<Fn>;

//

export type VeryGeneralCustoText<
  Props extends CustoTextProps = CustoTextProps,
> = ValueOrHook<CustoText<Props>, [Props]> | custoTextInType;

export type VeryGeneralCustoComp<
  Props extends Record<any, any>,
  Ref = unknown,
> =
  | ValueOrHook<React.ComponentType<Props>, [Props]>
  | ValueOrHook<CustoComponent<Props, Ref>, [Props]>;

export type VeryGeneralCustoData<Data, HiddenArgs extends readonly any[] = []> =
  | ValueOrHook<Data, HiddenArgs>
  | ValueOrHook<CustoData<Data, HiddenArgs>, HiddenArgs>;

export type VeryGeneralCustoHook<Fn extends (...args: any[]) => any> =
  | CustoHook<Fn>
  | ReturnType<Fn>;

//

type NeverOrCustoClass<T> = T extends CustoClass ? T : never;

export type CustoClassToGeneral<T extends CustoClass> =
  T extends CustoComponent<infer P, infer R>
    ? GeneralCustoComp<P, R>
    : T extends CustoText<infer Props>
      ? GeneralCustoText<Props>
      : T extends CustoData<infer Data, infer HiidenArgs>
        ? GeneralCustoData<Data, HiidenArgs>
        : T extends CustoHook<infer Fn>
          ? T | NeverOrCustoClass<ReturnType<Fn>>
          : T;

export type CustoClassToVeryGeneral<T extends CustoClass> =
  T extends CustoComponent<infer P, infer R>
    ? VeryGeneralCustoComp<P, R>
    : T extends CustoText<infer Props>
      ? VeryGeneralCustoText<Props>
      : T extends CustoData<infer Data, infer HiidenArgs>
        ? VeryGeneralCustoData<Data, HiidenArgs>
        : T extends CustoHook<infer Fn>
          ? T | ReturnType<Fn>
          : T;

export type ToVeryGeneralCusto<
  T,
  Strict extends boolean = false,
> = T extends CustoClass
  ? CustoClassToVeryGeneral<T>
  : T extends Record<any, any>
    ? Strict extends true
      ? {
          [key in keyof T]-?: ToVeryGeneralCusto<T[key], Strict>;
        }
      : {
          [key in keyof T]: ToVeryGeneralCusto<T[key], Strict>;
        }
    : T;
