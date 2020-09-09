import { isCustoClass } from ".";

export function deepCopyCustomizations<T>(x: T): T {
	const val = x as any;
	if (typeof val !== "object" || val === null) {
		return val;
	}

	if (isCustoClass(val)) return val as any;

	if (val instanceof Date) {
		return new Date(val) as any;
	}

	const newVal: any = Array.isArray(val) ? [] : {};
	const keys = Object.keys(val);
	for (const key of keys) {
		newVal[key] = deepCopyCustomizations(val[key]);
	}
	return newVal;
}

export const getDeeplyOptimizedValue = <V>(
	oldValue: V,
	newValue: V,
	skipFn?: (
		oldV: Record<any, unknown>,
		newV: Record<any, unknown>
	) => { skip: false; leaveOld: boolean } | { skip: true }
): V => {
	if (oldValue === newValue) return newValue;
	if (typeof oldValue !== typeof newValue) return newValue;
	if (typeof oldValue !== "object" || oldValue === null) return newValue;
	if (skipFn) {
		const decision = skipFn(oldValue as any, newValue as any);
		if (!decision.skip) {
			if (decision.leaveOld) return oldValue;
			return newValue;
		}
	}
	const oldKeys = Object.keys(oldValue).sort();
	const newKeys = Object.keys(newValue).sort();
	const copiedNewVal = Array.isArray(newValue)
		? (([...newValue] as any) as V)
		: { ...newValue };
	let canOldValueBeUsed = true;
	for (let i = 0; i < oldKeys.length; i++) {
		const key = oldKeys[i];
		if (key !== newKeys[i]) canOldValueBeUsed = false;
		const oldPropValue = oldValue[key];
		const newPropValue = newValue[key];
		const newVal = getDeeplyOptimizedValue(
			oldPropValue,
			newPropValue,
			skipFn
		);
		if (oldPropValue !== newVal) canOldValueBeUsed = false;
		copiedNewVal[key] = newVal;
	}
	if (oldKeys.length !== newKeys.length) canOldValueBeUsed = false;
	if (canOldValueBeUsed) return oldValue;
	return copiedNewVal;
};
