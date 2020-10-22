/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";
import { CustoComponent } from "../components";
import { CustoText, CustoTextProps, custoTextInType } from "../texts";
import { CustoHook } from "../hook";
import { ContextSelectorMiniHook, DynamicContext, StackedContext } from "react-flexible-contexts";
import { CustoType } from "../../interfaces";
import { CustoData } from "../data";
import { untypedGetProp } from "../../utils/prop";
import { buildCustoComponent } from "./components";
import { buildCustoText, CustoTextComponent } from "./texts";
import { buildCustoData } from "./data";
import { buildCustoHook } from "./hook";
import { isCustoClass } from "../../utils";
import { DeeplyOptional } from "../../utils/generics";
import { CustoTypeToGeneralClass } from "../interfaces";
import { CustoProviderRawValue } from "../..";

export type ToCustoTreeObj<T> = T extends (...args: any[]) => void
	? CustoType
	: T extends { $$end$$: true }
	? CustoType
	: T extends Record<any, any>
	? {
			[key in keyof T]-?: ToCustoTreeObj<T[key]>;
	  }
	: never;

export interface TreeOptions<Obj extends Record<any, any>> {
	getTextTransformationHook?: () => CustoHook<
		(oldText: custoTextInType) => custoTextInType
	>;
	prefixes?: (string | number | symbol)[];
	defaultValue?: DeeplyOptional<Obj>;
	defaultValuesByTypes?: {
		[key in CustoType]?: CustoTypeToGeneralClass<key>;
	};
}

const getArgs = <Obj>(args: any[]): { obj: Obj, useSelector: ContextSelectorMiniHook<readonly unknown[]>, options: TreeOptions<Obj> } => {
	if (args[0] instanceof StackedContext) {
		return {obj: args[0].context.defaultValueGetter().value, useSelector: args[0].context.useSelector, options: args[1] || {}}
	}
	return {obj: args[0], useSelector: args[1], options: args[2] || {}}
}

export function buildCustoTree<Obj extends Record<any, any>>(
	obj: Obj,
	useSelector: ContextSelectorMiniHook<readonly unknown[]>,
	options?: TreeOptions<Obj>
): CustoTree<Obj>;
export function buildCustoTree<Obj extends Record<any, any>>(
	stackedContainer: StackedContext<any, CustoProviderRawValue<any, Obj>, DynamicContext<any, any>>,
	options?: TreeOptions<Obj>
): CustoTree<Obj>;
export function buildCustoTree<Obj extends Record<any, any>>(
	...args: any
): CustoTree<Obj> {
	const { obj, useSelector, options } = getArgs<Obj>(args);
	const defaultValuesByTypes = options.defaultValuesByTypes || {};
	const prefixes = options.prefixes || ["value"];
	const helper = (
		prefixes: (string | number | symbol)[],
		obj: any,
		defaultValue: any,
		final: any = {}
	) => {
		for (const key in obj) {
			const val = obj[key];
			const defVal = defaultValue ? defaultValue[key] : undefined;
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
				final[key] = buildCustoComponent(
					getVal,
					path,
					defVal || defaultValuesByTypes[CustoType.component]
				);
			} else if (
				val === CustoType.text ||
				val instanceof CustoText ||
				(val instanceof CustoHook && val.type === CustoType.text)
			) {
				// Text
				final[key] = buildCustoText(
					getVal,
					options.getTextTransformationHook,
					path,
					defVal || defaultValuesByTypes[CustoType.text]
				);
			} else if (
				val === CustoType.data ||
				val instanceof CustoData ||
				(val instanceof CustoHook && val.type === CustoType.data)
			) {
				// Data
				final[key] = buildCustoData(
					getVal,
					path,
					defVal || defaultValuesByTypes[CustoType.data]
				);
			} else if (
				val === CustoType.hook ||
				(val instanceof CustoHook && val.type === CustoType.hook)
			) {
				// Hook
				final[key] = buildCustoHook(
					getVal,
					path,
					defVal || defaultValuesByTypes[CustoType.hook]
				);
			} else if (isCustoClass(val)) {
				//
			} else {
				final[key] = {};
				helper(
					[...prefixes, key],
					obj[key],
					defaultValue ? defaultValue[key] : undefined,
					final[key]
				);
			}
		}
		return final;
	};
	const result = helper(prefixes || [], obj, options.defaultValue);
	return result as any;
};

export type CustoTree<T> = T extends { $$end$$: true }
	? T extends CustoComponent<infer Props, infer Ref>
		? React.ForwardRefRenderFunction<Ref, Props>
		: T extends CustoHook<
				(prop: any) => CustoComponent<infer Props, infer Ref>
		  >
		? React.ForwardRefRenderFunction<Ref, Props>
		: T extends CustoText
		? CustoTextComponent<CustoTextProps>
		: T extends CustoHook<(props: infer Props) => CustoText>
		? CustoTextComponent<Props>
		: T extends CustoHook<(...args: any[]) => any>
		? T
		: T extends CustoData<infer Data, infer Args>
		? CustoHook<(...args: Args) => Data>
		: T
	: T extends Record<any, any>
	? { [key in keyof T]-?: CustoTree<T[key]> }
	: never;
