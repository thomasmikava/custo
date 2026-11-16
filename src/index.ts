import {
  CustoComponent,
  type CustoComponentOptions,
} from "./classes/components";
import { createComponentsTransformation } from "./classes/helper-fns/transformations";
import type { CustoTree } from "./classes/helper-fns/tree";
import {
  buildCusto,
  type CustoProviderRawValue,
  createProviderMergingLogic,
  type UnwrapContainerValue,
  type UnwrapContainerValueHack,
} from "./components/providers";
import { WrapInCustHookChangeError } from "./components/wrappers";
import { CreateCusto, transformToCusto } from "./create";
import { CustoComponentFlags } from "./flags";
import { CustoType } from "./interfaces";
import type { DeeplyOptional } from "./utils/generics";
import type { ToVeryGeneralCusto } from "./utils/prop-generics";

type DeeplyOptionalCustoProviderValue<T> = ToVeryGeneralCusto<
  DeeplyOptional<UnwrapContainerValueHack<T>>
>;
type CustoProviderValue<T> = UnwrapContainerValue<T>;

export {
  buildCusto,
  CreateCusto,
  CustoComponent,
  CustoComponentFlags,
  type CustoComponentOptions,
  type CustoProviderRawValue,
  type CustoProviderValue,
  type CustoTree,
  CustoType,
  createComponentsTransformation,
  createProviderMergingLogic,
  type DeeplyOptionalCustoProviderValue,
  transformToCusto,
  WrapInCustHookChangeError,
};
