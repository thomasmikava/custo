import { CustoClass, CustoType } from "../interfaces";
import { MultiDimentionalWeakMap } from "./weak-map";
import { useMemo } from "react";
import {
	custoMergeFlags,
	CustoMergeFlagEnum,
	getMemoizedFlags,
} from "../flags";
import { CustoHook } from "../classes/hook";
import { isCustoClass } from ".";

const defaultLintMapContainer = new MultiDimentionalWeakMap(3);

const linkingMergeFlags: custoMergeFlags = [CustoMergeFlagEnum.linking];

export type customizationLinkFn = <
	Obj1 extends Obj2[K],
	Obj2 extends {},
	K extends keyof Obj2
>(
	obj1: Obj1,
	obj2: Obj2,
	key: K
) => void;

export const createLinkFn = ({
	flags,
	avoidMergingClassesIfExplicitelySet,
	lintMapContainer = defaultLintMapContainer,
}: {
	flags?: custoMergeFlags;
	avoidMergingClassesIfExplicitelySet?: boolean;
	lintMapContainer?: MultiDimentionalWeakMap<3>;
}) => {
	const mergedFlags = getMemoizedFlags(
		flags ? [...flags, ...linkingMergeFlags] : linkingMergeFlags
	);
	const link: customizationLinkFn = (
		obj1: any,
		obj2: any,
		key: string | number | symbol
	) => {
		if (obj2[key] === undefined || obj2[key] === null) {
			obj2[key] = obj1;
			return;
		}
		const propsAreValidKeys =
			isValidWeakMapKey(obj1) && isValidWeakMapKey(obj2[key]);
		const memoKeys = [mergedFlags, obj2[key], obj1];
		if (propsAreValidKeys) {
			const memoizedValue = lintMapContainer.get(memoKeys);
			if (memoizedValue) {
				obj2[key] = memoizedValue;
				return;
			}
		}
		if (isComponentHook(obj1) || isComponentHook(obj2[key])) {
			if (avoidMergingClassesIfExplicitelySet) return;
			obj2[key] = mergeCustoClasses(
				obj2[key] as any,
				obj1 as any,
				"overrideLeftToRight",
				mergedFlags
			) as any;
			if (propsAreValidKeys) {
				lintMapContainer.set(memoKeys, obj2[key]);
			}
			return;
		}
		if (typeof obj1 !== "object" || obj1 === null) return;
		if (isCustoClass(obj1) && isCustoClass(obj2[key])) {
			if (avoidMergingClassesIfExplicitelySet) return;
			obj2[key] = mergeCustoClasses(
				obj2[key] as any,
				obj1 as any,
				"overrideLeftToRight",
				mergedFlags
			) as any;
			if (propsAreValidKeys) {
				lintMapContainer.set(memoKeys, obj2[key]);
			}
			return;
		}
		for (const k in obj1) {
			link(obj1[k], obj2[key], k as any);
		}
	};
	return link;
};

const mergeCustoClasses = (
	left: CustoClass | CustoHook<(...args: any[]) => CustoClass>,
	right: CustoClass | CustoHook<(...args: any[]) => CustoClass>,
	mergeStrategy: "overrideLeftToRight" | "overrideRightToLeft",
	mergeFlags?: custoMergeFlags
): CustoClass | CustoHook<(...args: any[]) => CustoClass> => {
	if (isComponentHook(left) || isComponentHook(right)) {
		const dHook = CustoHook.createComponentHook((...args: any[]): any => {
			const first = left instanceof CustoHook ? left.use(...args) : left;
			const second =
				right instanceof CustoHook ? right.use(...args) : right;
			const value = useMemo(() => {
				if (isCustoClass(first) && isCustoClass(second)) {
					return mergeCustoClasses(
						first as CustoClass,
						second as CustoClass,
						mergeStrategy,
						mergeFlags
					);
				}
				if (mergeStrategy === "overrideLeftToRight") {
					return first ?? second;
				} else if (mergeStrategy === "overrideRightToLeft") {
					return second ?? first;
				}
			}, [first, second]);
			return value;
		});
		const isLeftSafe = left instanceof CustoHook ? left.isSafe : true;
		const isRightSafe = right instanceof CustoHook ? right.isSafe : true;
		if (isLeftSafe && isRightSafe) {
			return dHook.getFuncVersion();
		}
		return dHook;
	}
	if (mergeStrategy === "overrideLeftToRight") {
		if (left.mergeClass) return left.mergeClass(right, mergeFlags);
		return left;
	}
	if (mergeStrategy === "overrideRightToLeft") {
		if (right.mergeClass) return right.mergeClass(left, mergeFlags);
		return right;
	}
	throw new Error(`incorrect mergeStrategy passed`);
};

const isComponentHook = (
	val: unknown
): val is CustoHook<(...args: unknown[]) => CustoClass> => {
	return val instanceof CustoHook && val.type === CustoType.component;
};

export function mergeCustomizations<
	T1 extends Record<any, any>,
	T2 extends Record<any, any>
>({
	object1,
	object2,
	memoContainer,
	mergeStrategy,
	avoidCustomizationsMerging = false,
	mergeFlags,
	path = "",
	decisionFn,
}: {
	object1: T1;
	object2: T2;
	memoContainer: MultiDimentionalWeakMap<4>;
	mergeStrategy: "overrideLeftToRight" | "overrideRightToLeft";
	avoidCustomizationsMerging?: boolean;
	mergeFlags?: custoMergeFlags;
	path?: string;
	decisionFn?: MergeDecisionFn;
}): T1 & T2 {
	const memoKey1 = getObjByMergeStrategy(mergeStrategy);
	const memoKey2 = getObjByMergingAvoidance(avoidCustomizationsMerging);
	const prefixKeys = [memoKey1, memoKey2];
	const memoKeys = [...prefixKeys, object1, object2];

	const originalObjectsAreValidKeys =
		isValidWeakMapKey(object1) && isValidWeakMapKey(object2);
	if (originalObjectsAreValidKeys) {
		const memoizedValue = memoContainer.get(memoKeys);
		if (memoizedValue) return memoizedValue;
	}
	const obj1 = { ...object1 } as any;
	for (const p in object2) {
		const propPath = (path ? path + "." : "") + p;
		if (!object2.hasOwnProperty(p)) continue;
		if (object2[p] === obj1[p]) continue;
		if (!obj1.hasOwnProperty(p)) {
			if (object2[p] !== undefined) {
				obj1[p] = object2[p];
			}
			continue;
		}
		if (decisionFn) {
			const { skip } = decisionFn(propPath, object1, object2);
			if (skip) continue;
		}

		const propsAreValidKeys =
			isValidWeakMapKey(obj1[p]) && isValidWeakMapKey(object2[p]);

		const propMemoKeys = [...prefixKeys, obj1[p], object2[p]];

		if (propsAreValidKeys) {
			const memoizedPropValue = memoContainer.get(propMemoKeys);
			if (memoizedPropValue) {
				obj1[p] = memoizedPropValue;
				continue;
			}
		}

		if (
			isCustoClass(object2[p]) &&
			isCustoClass(obj1[p]) &&
			!avoidCustomizationsMerging
		) {
			obj1[p] = mergeCustoClasses(
				obj1[p] as CustoClass,
				object2[p] as CustoClass,
				mergeStrategy,
				mergeFlags
			);
		} else if (
			object2[p].constructor === Object &&
			!isCustoClass(obj1[p]) &&
			!isCustoClass(object2[p])
		) {
			obj1[p] = mergeCustomizations({
				object1: obj1[p],
				object2: object2[p],
				memoContainer,
				mergeStrategy,
				avoidCustomizationsMerging,
				mergeFlags,
				path: propPath,
				decisionFn,
			}) as any;
		} else {
			if (mergeStrategy === "overrideLeftToRight") {
				if (!obj1.hasOwnProperty(p)) {
					obj1[p] = object2[p] as any;
				}
			} else if (mergeStrategy === "overrideRightToLeft") {
				obj1[p] = object2[p] as any;
			}
		}
		if (obj1[p] === undefined) delete obj1[p];

		if (propsAreValidKeys) {
			memoContainer.set(propMemoKeys, obj1[p]);
		}
	}
	if (originalObjectsAreValidKeys) {
		memoContainer.set(memoKeys, obj1);
	}
	return obj1;
}

export const isValidWeakMapKey = (val: any): boolean => {
	if (!val) return false;
	return typeof val === "object" || typeof val === "function";
};

const mergeStrategyLeftToRight = {
	mergeStrategy: "overrideLeftToRight",
};
const mergeStrategyRightToLeft = {
	mergeStrategy: "overrideRightToLeft",
};

const getObjByMergeStrategy = (
	mergeStrategy: "overrideLeftToRight" | "overrideRightToLeft"
) => {
	if (mergeStrategy === "overrideLeftToRight") {
		return mergeStrategyLeftToRight;
	}
	if (mergeStrategy === "overrideRightToLeft") {
		return mergeStrategyRightToLeft;
	}
	throw new Error(`incorrect mergeStrategy passed`);
};

const mergingAvoidanceAvoid = {
	avoidCustomizationsMerging: true,
};

const mergingAvoidanceDoNotAvoid = {
	avoidCustomizationsMerging: false,
};

const getObjByMergingAvoidance = (avoidCustomizationsMerging: boolean) => {
	if (avoidCustomizationsMerging) {
		return mergingAvoidanceAvoid;
	}
	return mergingAvoidanceDoNotAvoid;
};

export type MergeDecisionFn = (
	path: string,
	leftVal: any,
	rightVal: any
) => Decision;
interface Decision {
	skip: boolean;
}

export function removeKeys<T, K extends keyof T>(
	obj: T,
	...keys: K[]
): Omit<T, K> {
	const obj2 = { ...obj };
	for (let i = 0; i < keys.length; ++i) {
		delete obj2[keys[i]];
	}
	return obj2;
}
