import { CustoComponent } from "./classes/components";
import { CustoText } from "./classes/texts";
import { CustoData } from "./classes/data";
import { CustoHook } from "./classes/hook";
import { buildCustoTree } from "./classes/helper-fns/tree";

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
	},
	functionOf: {
		Component: CustoHook.createComponentFn,
		Text: CustoHook.createTextFn,
		Data: CustoHook.createDataFn,
	},
	Tree: buildCustoTree,
};
