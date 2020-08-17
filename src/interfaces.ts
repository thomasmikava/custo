import { custoMergeFlags } from "./flags";

export interface CustoClass {
	readonly $$end$$: true;
	clone(): CustoClass;
	mergeClass?: (
		merge: CustoClass,
		mergeFlags?: custoMergeFlags
	) => CustoClass;
}

export enum CustType {
	component = "c",
	data = "d",
	hook = "h",
	text = "t",
}
