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
