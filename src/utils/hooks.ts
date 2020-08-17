/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo, useRef } from "react";
import { untypedGetProp } from "./prop";
import { getDeeplyOptimizedValue } from "./deep-copy";
import { isValidWeakMapKey } from "./objects";

export const useUntypedProperty = (obj: any, ...keys: string[]) => {
	return useMemo(() => {
		return untypedGetProp(obj, ...keys);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [obj, JSON.stringify(keys)]);
};

export const useGetValueRef = <T>(val: T) => {
	const valRef = useRef(val);
	valRef.current = val;
	const getValRef = useRef(() => valRef.current);
	return getValRef;
};

export const createMemoizedFnCall = <Data extends Record<any, any>, FinalData>(
	finalTransformationFn: (
		value: Data,
		previousFinalValue: FinalData | null
	) => FinalData,
	memoizationStategy: "inside-component" | "global",
	getDependency?: (value: Data) => any
) => {
	const finalTransormationMemoized = new WeakMap<Data, FinalData>();
	return (rawValue: Data): FinalData => {
		const dep: any = getDependency ? getDependency(rawValue) : rawValue;
		const prevFinalDataRef = useRef<FinalData | null>(null);
		if (memoizationStategy === "inside-component") {
			const finalValue = useMemo(
				() => finalTransformationFn(rawValue, prevFinalDataRef.current),
				[dep]
			);
			prevFinalDataRef.current = finalValue;
			return finalValue!;
		}
		if (isValidWeakMapKey(dep) && finalTransormationMemoized.has(dep)) {
			const finalValue = finalTransormationMemoized.get(dep)!;
			prevFinalDataRef.current = finalValue;
			return finalValue!;
		}
		const finalValue = finalTransformationFn(
			rawValue,
			prevFinalDataRef.current
		);
		finalTransormationMemoized.set(dep, finalValue);
		prevFinalDataRef.current = finalValue;
		return finalValue;
	};
};

export const createDeeplyOptimizedCustomizedPropsHook = <
	Data extends Record<any, any>,
	FinalData
>(
	finalTransformationFn: (value: Data) => FinalData,
	memoizationStategy: "inside-component" | "global",
	getDependency?: (value: Data) => any
) => {
	return createMemoizedFnCall<Data, FinalData>(
		(rawData, previousFinalData): FinalData => {
			const computed = finalTransformationFn(rawData);
			if (!previousFinalData) return computed;
			return getDeeplyOptimizedValue(
				previousFinalData,
				computed,
				(oldValue, newValue) => {
					const areCusto =
						(oldValue && (oldValue as any).$$end$$) ||
						(newValue && (newValue as any).$$end$$);
					if (!areCusto) return { skip: true };
					return { skip: false, leaveOld: false };
				}
			);
		},
		memoizationStategy,
		getDependency
	);
};

export const useVersion = (
	value: any,
	avoidVersionIncrement?: boolean
): number => {
	const keyRef = useRef(1);
	const valueRef = useRef(value);
	if (valueRef.current !== value && !avoidVersionIncrement) {
		keyRef.current++;
	}
	valueRef.current = value;
	return keyRef.current;
};

export const useDepsVersion = (deps: readonly any[]): number => {
	const keyRef = useRef(1);
	const depsRef = useRef(deps);
	if (
		depsRef.current !== deps &&
		depsAreShalowlyEqual(depsRef.current, deps)
	) {
		keyRef.current++;
	}
	depsRef.current = deps;
	return keyRef.current;
};

const depsAreShalowlyEqual = (prev: readonly any[], next: readonly any[]) => {
	if (prev.length !== next.length) return false;
	for (let i = 0; i < prev.length; i++) {
		if (prev[i] !== next[i]) {
			return false;
		}
	}
	return true;
};
