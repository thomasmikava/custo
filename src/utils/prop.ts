export const untypedGetProp = (
	obj: object,
	...args: (string | number | symbol)[]
): any => {
	let lastObj: any = obj;
	for (const key of args) {
		if (typeof lastObj !== "object" || lastObj === null) {
			return undefined;
		}
		lastObj = lastObj[key];
	}
	return lastObj;
};

export function getAbsoluteProperty(obj: object, deepKey: string) {
	const keys = deepKey.split(".");
	let last: any = obj;
	for (const key of keys) {
		last = last?.[key];
		if (last === null || typeof last !== "object") break;
	}
	return last;
}

export const deepMapObject = (
	obj: any,
	decisionFn: (
		val: any,
		keys: (string | number | symbol)[]
	) => { stop: true; newVal: any } | { stop: false }
) => {
	const decision = decisionFn(obj, []);
	if (decision.stop) {
		return decision.newVal;
	}
	const helper = (
		prefixes: (string | number | symbol)[],
		obj: any,
		final: any = {}
	) => {
		for (const key in obj) {
			const val = obj[key];
			const path = [...prefixes, key];
			const decision = decisionFn(val, path);
			if (decision.stop) {
				final[key] = decision.newVal;
			} else if (typeof val === "object") {
				final[key] = {};
				helper(path, obj[key], final[key]);
			}
		}
		return final;
	};
	const result = helper([], obj);
	return result as any;
};
