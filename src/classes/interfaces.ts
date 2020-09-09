import { CustoType, CustoComponent } from "..";
import { CustoText } from "./texts";
import { CustoData } from "./data";
import { CustoHook } from "./hook";
import {
	GeneralCustoComp,
	GeneralCustoText,
	GeneralCustData,
	GeneralCustoHook,
} from "../utils/prop-generics";

export type CustoTypeToClass<
	T extends CustoType
> = T extends CustoType.component
	? CustoComponent<any, any>
	: T extends CustoType.text
	? CustoText<any>
	: T extends CustoType.data
	? CustoData<any, any>
	: T extends CustoType.hook
	? CustoHook<any>
	: never;

export type CustoTypeToGeneralClass<
	T extends CustoType
> = T extends CustoType.component
	? GeneralCustoComp<any, any>
	: T extends CustoType.text
	? GeneralCustoText<any>
	: T extends CustoType.data
	? GeneralCustData<any, any>
	: T extends CustoType.hook
	? GeneralCustoHook<any>
	: never;
