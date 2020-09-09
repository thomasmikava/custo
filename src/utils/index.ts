import { CustoClass } from "../interfaces";
import { CustoComponent } from "..";
import { CustoText } from "../classes/texts";
import { CustoHook } from "../classes/hook";
import { CustoData } from "../classes/data";

export const isCustoClass = (el: any): el is CustoClass => {
	return (
		el instanceof CustoComponent ||
		el instanceof CustoText ||
		el instanceof CustoData ||
		el instanceof CustoHook
	);
};
