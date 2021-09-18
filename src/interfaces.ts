import { custoMergeFlags } from "./flags";

export interface CustoClass {
	readonly $$end$$: true;
	clone(): CustoClass;
	mergeClass?: (
		merge: CustoClass,
		mergeFlags?: custoMergeFlags
	) => CustoClass;
}

export enum CustoType {
	component = "c",
	data = "d",
	hook = "h",
	text = "t",
}

export type NormProps<T> = unknown extends T ? any : T;
