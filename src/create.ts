import { CustoComponent } from "./classes/components";
import { CustoData } from "./classes/data";
import {
  toCustComponents,
  toCustoFns,
  toCustoHooks,
  toCustoTexts,
} from "./classes/helper-fns/transformations";
import { buildCustoTree } from "./classes/helper-fns/tree";
import { CustoHook } from "./classes/hook";
import { CustoText } from "./classes/texts";

export const CreateCusto = {
  Component: CustoComponent.create,
  Text: CustoText.create,
  Data: CustoData.create,
  Hook: CustoHook.createHook,
  Function: CustoHook.createFn,
  hookOf: {
    Component: CustoHook.createComponentHook,
    Text: CustoHook.createTextHook,
    Data: CustoHook.createDataHook,
    Hook: CustoHook.createHookOfHook,
    Function: CustoHook.createHookOfFn,
  },
  functionOf: {
    Component: CustoHook.createComponentFn,
    Text: CustoHook.createTextFn,
    Data: CustoHook.createDataFn,
    Hook: CustoHook.createFnOfHook,
    Function: CustoHook.createFnOfFn,
  },
  Tree: buildCustoTree as typeof buildCustoTree,
};

export const transformToCusto = {
  Hooks: toCustoHooks,
  Functions: toCustoFns,
  Texts: toCustoTexts,
  Components: toCustComponents,
};
