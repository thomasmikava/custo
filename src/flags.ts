export enum CustomizableLabels {
	packageDefaultValue = 1,
}
export type customizableFlags =
	| CustomizableLabels
	| ReadonlySet<CustomizableLabels>;

export enum CustoMergeFlagEnum {
	linking = 1,
	avoidWithPackageDefaultValue = 2,
	avoidWithNonPackageValue = 3,
	avoidLinking = 4,
}
export type CustoMergeFlag = CustoMergeFlagEnum | string;
export type custoMergeFlags = CustoMergeFlag[] | ReadonlySet<CustoMergeFlag>;

export const flattenFlags = (
	deepFlags: custoMergeFlags[]
): Set<CustoMergeFlag> => {
	const flags = new Set<CustoMergeFlag>();
	if (!deepFlags) return flags;
	for (const each of deepFlags) {
		if (!Array.isArray(each) && !(each instanceof Set)) {
			if (typeof each !== "number" && typeof each !== "string") continue;
			flags.add(each as any);
			continue;
		}
		const setOfFlags = flattenFlags(each as any);
		for (const item of setOfFlags) {
			flags.add(item);
		}
	}
	return flags;
};

const memoizedFlags: Record<string, custoMergeFlags | undefined> = {};

export const getMemoizedFlags = (flags: custoMergeFlags): custoMergeFlags => {
	const flagsSet = new Set(flags);
	const keys = [...flagsSet].sort().join("_(R'7jY_");

	const memoizedSet = memoizedFlags[keys];
	if (memoizedSet) return memoizedSet;

	memoizedFlags[keys] = flagsSet;
	return flagsSet;
};
