import { CreateCusto, transformToCusto } from "./create";
import { CustoComponent } from "./classes/components";
import {
	createProviderMergingLogic,
	buildCusto,
	CustoProviderRawValue,
	UnwrapContainerValue,
	UnwrapContainerValueHack,
	UnwrapDeepOptionalValue,
} from "./components/providers";
import { CustoComponentFlags } from "./flags";
import { CustoType } from "./interfaces";
import { WrapInCustHookChangeError } from "./components/wrappers";
import { createComponentsTransformation } from "./classes/helper-fns/transformations";
import { ToVeryGeneralCusto } from "./utils/prop-generics";
import { DeeplyOptional } from "./utils/generics";

type DeeplyOptionalCustoProviderValue<T> = ToVeryGeneralCusto<
	DeeplyOptional<UnwrapContainerValueHack<T>>
>;
type CustoProviderValue<T> = UnwrapContainerValue<T>;

export {
	CreateCusto,
	CustoComponent,
	createProviderMergingLogic,
	CustoComponentFlags,
	buildCusto,
	CustoType,
	WrapInCustHookChangeError,
	CustoProviderRawValue,
	transformToCusto,
	createComponentsTransformation,
	UnwrapContainerValue,
	CustoProviderValue,
	DeeplyOptionalCustoProviderValue,
	UnwrapDeepOptionalValue,
	ToVeryGeneralCusto,
};
