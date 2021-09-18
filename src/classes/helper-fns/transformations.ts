import React from "react";
import { CustoComponent, CustoType } from "../..";
import { CustoClass, NormProps } from "../../interfaces";
import { isCustoClass } from "../../utils";
import { deepMapObject } from "../../utils/prop";
import { CustoHook } from "../hook";
import { CustoText } from "../texts";

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
		if (val === null || typeof val !== "object") {
			return {
				stop: true,
				newVal: val,
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
		if (val === null || typeof val !== "object") {
			return {
				stop: true,
				newVal: val,
			};
		}
		return { stop: false };
	});
};

export type transformToCustoTexts<T> = T extends CustoClass
	? T
	: T extends string | number | null
	? CustoText
	: T extends (...args: any[]) => void
	? T
	: T extends Record<any, any>
	? {
			[key in keyof T]: transformToCustoTexts<T[key]>;
	  }
	: T;

///

export const createComponentsTransformation = (
	transformer: (component: CustoComponent<any, any>) => CustoComponent<any, any> = (x) => x
) => {
	return <T>(obj: T): transformToCustoComponents<T> => {
		return deepMapObject(obj, val => {
			if (val instanceof CustoComponent) {
				return {
					stop: true,
					newVal: transformer(val),
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
					return transformer(transformedData);
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
					newVal: transformer((CustoComponent.create as any)(val)),
				};
			}
			if (val === null || typeof val !== "object") {
				return {
					stop: true,
					newVal: val,
				};
			}
			return { stop: false };
		});
	};
};

export type transformToCustoComponents<T> = T extends CustoClass
	? T
	: T extends React.ComponentType<infer Props> // TODO: infer ref too
	? CustoComponent<NormProps<Props>>
	: T extends (...args: any[]) => void
	? T
	: T extends Record<any, any>
	? {
			[key in keyof T]: transformToCustoComponents<T[key]>;
	  }
	: T;

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
) => transformToCustoComponents<T> = createComponentsTransformation();

type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};
