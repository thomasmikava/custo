/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";
import { CustoComponent } from "../components";
import { CustoText, CustoTextProps } from "../texts";
import { CustoHook } from "../hook";
import { ContextSelectorMiniHook } from "react-flexible-contexts";
import { CustoType } from "../../interfaces";
import { CustoData } from "../data";
import { untypedGetProp } from "../../utils/prop";
import { buildCustoComponent } from "./components";
import { buildCustoText } from "./texts";
import { buildCustoData } from "./data";
import { buildCustoHook } from "./hook";

export type ToCustoTreeObj<T> = T extends (...args: any[]) => void
	? CustoType
	: T extends { $$end$$: true }
	? CustoType
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
			const path = [...prefixes, key].join(".");
			if (
				val === CustoType.component ||
				val instanceof CustoComponent ||
				(val instanceof CustoHook && val.type === CustoType.component)
			) {
				// Component
				final[key] = buildCustoComponent(getVal, path);
			} else if (
				val === CustoType.text ||
				val instanceof CustoText ||
				(val instanceof CustoHook && val.type === CustoType.text)
			) {
				// Text
				final[key] = buildCustoText(
					getVal,
					options.getTextTransformationHook,
					path
				);
			} else if (
				val === CustoType.data ||
				val instanceof CustoData ||
				(val instanceof CustoHook && val.type === CustoType.data)
			) {
				// Data
				final[key] = buildCustoData(getVal, path);
			} else if (
				val === CustoType.hook ||
				(val instanceof CustoHook && val.type === CustoType.hook)
			) {
				// Hook
				final[key] = buildCustoHook(getVal, path);
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

export type CustoTree<T> = T extends { $$end$$: true }
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
