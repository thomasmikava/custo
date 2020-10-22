import { CustoComponent } from "./classes/components";
import { CustoText } from "./classes/texts";
import { CustoData } from "./classes/data";
import { CustoHook } from "./classes/hook";
import { buildCustoTree } from "./classes/helper-fns/tree";
import {
	toCustoHooks,
	toCustoFns,
	toCustoTexts,
	toCustComponents,
} from "./classes/helper-fns/transformations";

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
