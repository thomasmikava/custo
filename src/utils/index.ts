import { CustoComponent } from "..";
import { CustoData } from "../classes/data";
import { CustoHook } from "../classes/hook";
import { CustoText } from "../classes/texts";
import type { CustoClass } from "../interfaces";

export const isCustoClass = (el: any): el is CustoClass => {
  return (
    el instanceof CustoComponent ||
    el instanceof CustoText ||
    el instanceof CustoData ||
    el instanceof CustoHook
  );
};
