import type { CustoComponent, CustoType } from "..";
import type {
  VeryGeneralCustoComp,
  VeryGeneralCustoData,
  VeryGeneralCustoHook,
  VeryGeneralCustoText,
} from "../utils/prop-generics";
import type { CustoData } from "./data";
import type { CustoHook } from "./hook";
import type { CustoText } from "./texts";

export type CustoTypeToClass<T extends CustoType> =
  T extends CustoType.component
    ? CustoComponent<any, any>
    : T extends CustoType.text
      ? CustoText<any>
      : T extends CustoType.data
        ? CustoData<any, any>
        : T extends CustoType.hook
          ? CustoHook<any>
          : never;

export type CustoTypeToVeryGeneralClass<T extends CustoType> =
  T extends CustoType.component
    ? VeryGeneralCustoComp<any, any>
    : T extends CustoType.text
      ? VeryGeneralCustoText<any>
      : T extends CustoType.data
        ? VeryGeneralCustoData<any, any>
        : T extends CustoType.hook
          ? VeryGeneralCustoHook<any>
          : never;
