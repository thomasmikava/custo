import { deepMapObject } from "../../utils/prop";
import { CustoHook } from "../hook";
import { CustoText } from "../texts";
import { CustoType, CustoComponent } from "../..";
import { CustoComponentOptions, mergeValueOrFn } from "../components";
import React from "react";
import { unionWith } from "../../utils/set";
import { isCustoClass } from "../../utils";
import { CustoClass } from "../../interfaces";

const toCustoFnOrHooks = <T>(
	type: CustoType,
	obj: T,
	flag: "hooks" | "functions"
): transformToCustoHooks<T> => {
	return deepMapObject(obj, val => {
		if (val instanceof CustoHook) {
			return {
				stop: true,
				newVal: val,
			};
		}
		if (typeof val === "function") {
			return {
				stop: true,
				newVal:
					flag === "functions"
						? type === CustoType.component
							? CustoHook.createComponentFn(val)
							: type === CustoType.data
							? CustoHook.createDataFn(val)
							: type === CustoType.text
							? CustoHook.createTextFn(val)
							: CustoHook.createFn(val)
						: type === CustoType.component
						? CustoHook.createComponentHook(val)
						: type === CustoType.data
						? CustoHook.createDataHook(val)
						: type === CustoType.text
						? CustoHook.createTextHook(val)
						: CustoHook.createHook(val),
			};
		}
		return { stop: false };
	});
};

export const toCustoHooks = <T>(
	type: CustoType,
	obj: T
): transformToCustoHooks<T> => {
	return toCustoFnOrHooks(type, obj, "hooks");
};

export const toCustoFns = <T>(
	type: CustoType,
	obj: T
): transformToCustoHooks<T> => {
	return toCustoFnOrHooks(type, obj, "functions");
};

export type transformToCustoHooks<T> = T extends CustoHook<any>
	? T
	: T extends (...args: any[]) => any
	? CustoHook<T>
	: T extends Record<any, any>
	? {
			[key in keyof T]: transformToCustoHooks<T[key]>;
	  }
	: T;

///

export const toCustoTexts = <T>(obj: T): transformToCustoTexts<T> => {
	return deepMapObject(obj, val => {
		if (isCustoClass(val)) {
			return {
				stop: true,
				newVal: val,
			};
		}
		if (
			typeof val === "string" ||
			typeof val === "number" ||
			val === null
		) {
			return {
				stop: true,
				newVal: CustoText.create(val),
			};
		}
		return { stop: false };
	});
};

export type transformToCustoTexts<T> = T extends CustoClass
	? T
	: T extends string | number | null
	? CustoText
	: T extends Record<any, any>
	? {
			[key in keyof T]: transformToCustoTexts<T[key]>;
	  }
	: T;

///

export const createComponentsTransformation = (
	defaultProps: Record<any, any> | (() => Record<any, any>),
	options: CustoComponentOptions<any, any> = {}
) => {
	return <T>(obj: T): transformToCustoComponents<T> => {
		return deepMapObject(obj, val => {
			if (val instanceof CustoComponent) {
				return {
					stop: true,
					newVal: transformCustoComp(val, defaultProps, options),
				};
			} else if (
				val instanceof CustoHook &&
				val.type == CustoType.component
			) {
				const cloned = val.clone();
				const transformationFn = cloned.transformationFn;
				(cloned as Mutable<CustoHook<any>>).transformationFn = data => {
					const transformedData = (transformationFn
						? transformationFn(data)
						: data) as CustoComponent<any>;
					return transformCustoComp(
						transformedData,
						defaultProps,
						options
					);
				};
				//
				return {
					stop: true,
					newVal: cloned,
				};
			} else if (isCustoClass(val)) {
				return {
					stop: true,
					newVal: val,
				};
			}
			if (isReactComponent(val)) {
				return {
					stop: true,
					newVal: CustoComponent.create(val, defaultProps, options),
				};
			}
			return { stop: false };
		});
	};
};

export const transformCustoComp = <C extends CustoComponent<any, any>>(
	comp: C,
	defaultProps: Record<any, any> | (() => Record<any, any>),
	options: CustoComponentOptions<any, any>
): transformToCustoComponents<C> => {
	const newComp = (comp.clone() as C) as Mutable<C>;
	(newComp as any).defaultProps = mergeValueOrFn(
		defaultProps,
		((newComp as any).defaultProps || {}),
		(v1, v2) => ({
			...v1,
			...v2,
		})
	);
	const keys = Object.keys(options);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const oldVal = (newComp as any)[key];
		if (oldVal === undefined) {
			(newComp as any)[key] = options[key];
		}
	}
	const iterableValueKeys: (keyof CustoComponentOptions<any, any>)[] = [
		"labels",
		"stripPropKeys",
		"additionalMergeFlags",
		"subtractiveMergeFlags",
	];
	for (let i = 0; i < iterableValueKeys.length; i++) {
		const key = iterableValueKeys[i];
		if (!options.hasOwnProperty(key)) continue;
		const oldVal = (newComp as any)[key];
		if (options[key] === oldVal || !oldVal) continue;
		(newComp as any)[key] = mergeIterables(options[key], oldVal);
	}
	return newComp as any;
};

const mergeIterables = (a, b) => {
	if (a instanceof Set || b instanceof Set) {
		return unionWith.call(new Set(a), b);
	}
	return [...a, ...b];
};

export type transformToCustoComponents<T> = T extends CustoClass
	? T
	: T extends React.ComponentType<infer Props>
	? CustoComponent<Props>
	: T extends Record<any, any>
	? {
			[key in keyof T]: transformToCustoComponents<T[key]>;
	  }
	: never;

const isReactComponent = (e): e is React.ComponentType<any> => {
	return (
		typeof e === "function" ||
		e instanceof React.Component ||
		e instanceof React.PureComponent ||
		(typeof e === "object" && e && e["$$typeof"])
	);
};

export const toCustComponents: <T>(
	obj: T
) => transformToCustoComponents<T> = createComponentsTransformation({});

type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};
