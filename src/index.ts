import { CreateCusto, transformToCusto } from "./create";
import { CustoComponent } from "./classes/components";
import {
	createProviderMergingLogic,
	createProviders,
	CustoProviderRawValue,
	UnwrapContainerValue,
	UnwrapContainerValueHack,
} from "./components/providers";
import { CustoMergeFlagEnum } from "./flags";
import { CustoType } from "./interfaces";
import { WrapInCustHookChangeError, InjectHook } from "./components/wrappers";
import { createComponentsTransformation } from "./classes/helper-fns/transformations";
import { toGeneralCusto, ToVeryGeneralCusto } from "./utils/prop-generics";
import { DeeplyOptional } from "./utils/generics";

type DeeplyOptionalCustoProviderValue<T> = ToVeryGeneralCusto<DeeplyOptional<UnwrapContainerValueHack<T>>>;
type CustoProviderValue<T> = UnwrapContainerValue<T>;

export {
	CreateCusto,
	CustoComponent,
	createProviderMergingLogic,
	CustoMergeFlagEnum,
	createProviders,
	CustoType,
	WrapInCustHookChangeError,
	InjectHook,
	CustoProviderRawValue,
	transformToCusto,
	createComponentsTransformation,
	toGeneralCusto,
	UnwrapContainerValue,
	CustoProviderValue,
	DeeplyOptionalCustoProviderValue,
};
