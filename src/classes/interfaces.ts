import { CustoType, CustoComponent } from "..";
import { CustoText } from "./texts";
import { CustoData } from "./data";
import { CustoHook } from "./hook";
import {
	VeryGeneralCustoComp,
	VeryGeneralCustoText,
	VeryGeneralCustoData,
	VeryGeneralCustoHook,
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

export type CustoTypeToVeryGeneralClass<
	T extends CustoType
> = T extends CustoType.component
	? VeryGeneralCustoComp<any, any>
	: T extends CustoType.text
	? VeryGeneralCustoText<any>
	: T extends CustoType.data
	? VeryGeneralCustoData<any, any>
	: T extends CustoType.hook
	? VeryGeneralCustoHook<any>
	: never;
