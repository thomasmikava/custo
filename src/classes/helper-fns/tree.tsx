/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";
import { CustoComponent } from "../components";
import { CustoText, CustoTextProps } from "../texts";
import { CustoHook } from "../hook";
import { ContextSelectorMiniHook } from "react-flexible-contexts";
import { CustType } from "../../interfaces";
import { CustoData } from "../data";
import { untypedGetProp } from "../../utils/prop";
import { buildCustoComponent } from "./components";
import { buildCustoText } from "./texts";
import { buildCustoData } from "./data";
import { buildCustoHook } from "./hook";

export type ToCustoTreeObj<T> = T extends (...args: any[]) => void
	? CustType
	: T extends { $$end$$: true }
	? CustType
	: T extends Record<any, any>
	? {
			[key in keyof T]-?: ToCustoTreeObj<T[key]>;
	  }
	: never;

type richtext = string | number | null | JSX.Element;

export interface TreeOptions {
	getTextTransformationHook?: () => CustoHook<
		(oldText: richtext) => richtext
	>;
	prefixes?: (string | number | symbol)[];
}

export const buildCustoTree = <Obj extends Record<any, any>>(
	obj: Obj,
	useSelector: ContextSelectorMiniHook<readonly unknown[]>,
	options: TreeOptions = {}
): CustoTree<Obj> => {
	const prefixes = options.prefixes || ["value"];
	const helper = (
		prefixes: (string | number | symbol)[],
		obj: any,
		final: any = {}
	) => {
		for (const key in obj) {
			const val = obj[key];
			const getVal = () =>
				useSelector(
					x => untypedGetProp(x as any, ...prefixes, key),
					[]
				);
			if (
				val === CustType.component ||
				val instanceof CustoComponent ||
				(val instanceof CustoHook && val.type === CustType.component)
			) {
				// Component
				final[key] = buildCustoComponent(getVal);
			} else if (
				val === CustType.text ||
				val instanceof CustoText ||
				(val instanceof CustoHook && val.type === CustType.text)
			) {
				// Text
				final[key] = buildCustoText(
					getVal,
					options.getTextTransformationHook
				);
			} else if (
				val === CustType.data ||
				val instanceof CustoData ||
				(val instanceof CustoHook && val.type === CustType.data)
			) {
				// Data
				final[key] = buildCustoData(getVal);
			} else if (
				val === CustType.hook ||
				(val instanceof CustoHook && val.type === CustType.hook)
			) {
				// Hook
				final[key] = buildCustoHook(getVal);
			} else if (typeof val === "object" && val && (val as any).$$end$$) {
				//
			} else {
				final[key] = {};
				helper([...prefixes, key], obj[key], final[key]);
			}
		}
		return final;
	};
	const result = helper(prefixes || [], obj);
	return result as any;
};

type CustoTree<T> = T extends { $$end$$: true }
	? T extends CustoComponent<infer Props>
		? React.FC<Props>
		: T extends CustoHook<(prop: any) => CustoComponent<infer Props>>
		? React.FC<Props>
		: T extends CustoText
		? React.FC<CustoTextProps>
		: T extends CustoHook<(props: infer Props) => CustoText>
		? React.FC<Props>
		: T extends CustoHook<(...args: any[]) => CustoData<any>>
		? T
		: T extends CustoData<infer Data, infer Args>
		? CustoHook<(...args: Args) => Data>
		: T
	: T extends Record<any, any>
	? { [key in keyof T]-?: CustoTree<T[key]> }
	: never;
