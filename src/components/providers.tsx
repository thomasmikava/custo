/* eslint-disable react-hooks/rules-of-hooks */
import { StackedContext } from "react-flexible-contexts";
import { mergeCustomizations, MergeDecisionFn } from "../utils/objects";
import { DeeplyOptional } from "../utils/generics";
import { useMemo } from "react";
import { MultiDimentionalWeakMap } from "../utils/weak-map";
import { custoMergeFlags, CustoMergeFlagEnum, CustoMergeFlag } from "../flags";

export const createProviders = <
	RawValue extends Record<any, any>,
	Value = CustoProviderRawValue<RawValue>,
	LayerData = DeeplyOptional<RawValue>
>({
	defaultValue,
	defaultMergeFlags,
	layerTransformationHook = (x => x) as any,
	contextDisplayName,
	rawToFinalValueHook,
	mergeDecisionFn,
}: {
	layerTransformationHook?: (arg: LayerData) => RawValue;
	rawToFinalValueHook?: (data: CustoProviderRawValue<RawValue>) => Value;
	contextDisplayName?: string;
	mergeDecisionFn?: MergeDecisionFn;
	defaultValue: RawValue | undefined;
	defaultMergeFlags?: custoMergeFlags | null;
}) => {
	const memoContainer = new MultiDimentionalWeakMap(4);

	const contextDrfaultValue: CustoProviderRawValue<RawValue> | undefined =
		defaultValue === undefined
			? undefined
			: {
					mergeFlags: defaultMergeFlags ?? [],
					value: defaultValue,
			  };

	const Container = StackedContext.create(
		contextDrfaultValue!,
		{ rawToFinalValueHook }
	);
	if (contextDisplayName) {
		Container.context.setContextName(
			contextDisplayName
		);
	}

	const FullValueProvider =
		Container.context.Provider;

	const FullNonMergingProvider = Container.addProvider<
		LayerData
	>(wrapInMeta(layerTransformationHook, () => ({ mergeFlags: undefined })));

	// merges everything
	const PartialMergingProvider = Container.addProvider(
		createProviderMergingLogic<LayerData, RawValue>({
			transformationHook: layerTransformationHook,
			memoContainer,
			mergeDecisionFn,
		})
	);

	// merges everything except default value
	const PartialNonPackageMergingProvider = Container.addProvider(
		createProviderMergingLogic<LayerData, RawValue>({
			transformationHook: layerTransformationHook,
			memoContainer,
			avoidPackageCustoMerging: true,
			mergeDecisionFn,
		})
	);
	(window as any).mergingMemoContainer = memoContainer;

	// does not merge anything
	const PartialNonMergingProvider = Container.addProvider(
		createProviderMergingLogic<LayerData, RawValue>({
			transformationHook: layerTransformationHook,
			memoContainer,
			avoidNonPackageCustoMerging: true,
			avoidPackageCustoMerging: true,
			mergeDecisionFn,
		})
	);

	return {
		Container,
		FullValueProvider,
		FullNonMergingProvider,
		PartialMergingProvider,
		PartialNonPackageMergingProvider,
		PartialNonMergingProvider,
		memoContainer,
	};
};

export const createProviderMergingLogic = <
	LayerValue extends Record<any, any>,
	FinalValue = LayerValue
>({
	transformationHook = x => x as FinalValue,
	memoContainer = new MultiDimentionalWeakMap(4),
	avoidNonPackageCustoMerging,
	avoidPackageCustoMerging,
	mergeFlags: defaultMergingFlags,
	mergeDecisionFn,
}: {
	transformationHook?: (arg: LayerValue) => FinalValue;
	memoContainer?: MultiDimentionalWeakMap<4>;
	avoidNonPackageCustoMerging?: boolean;
	avoidPackageCustoMerging?: boolean;
	mergeFlags?: custoMergeFlags;
	mergeDecisionFn?: MergeDecisionFn;
}) => {
	let avoidCustomizationsMerging = false;
	if (avoidNonPackageCustoMerging && avoidPackageCustoMerging) {
		avoidCustomizationsMerging = true;
	}
	const mergeFlags: CustoMergeFlag[] = [...(defaultMergingFlags || [])];
	if (avoidNonPackageCustoMerging) {
		mergeFlags.push(CustoMergeFlagEnum.avoidWithNonPackageValue);
	}
	if (avoidPackageCustoMerging) {
		mergeFlags.push(CustoMergeFlagEnum.avoidWithPackageDefaultValue);
	}
	const getCurrentMetaHook = (
		customizations: LayerValue,
		prevMeta: any
	): Omit<CustoProviderRawValue<any>, "value"> => {
		return { mergeFlags };
	};

	const fn = (
		customizations: LayerValue,
		prevVal: FinalValue,
		mergedMeta: Omit<CustoProviderRawValue<any>, "value">
	): FinalValue => {
		const transformed = transformationHook(customizations);
		const mergeFlags = mergedMeta.mergeFlags;
		const b = useMemo(() => {
			return mergeCustomizations({
				object1: transformed,
				object2: prevVal,
				memoContainer,
				mergeStrategy: "overrideLeftToRight",
				avoidCustomizationsMerging,
				mergeFlags,
				decisionFn: mergeDecisionFn,
			});
		}, [transformed, prevVal]);
		return b;
	};
	return wrapInMeta(fn, getCurrentMetaHook);
};

export interface CustoProviderRawValue<V> {
	value: V;
	mergeFlags?: custoMergeFlags;
}

const wrapInMeta = <Data, TransformedData>(
	getValueHook: (
		currentVal: Data,
		prevVal: TransformedData,
		mergedMeta: Omit<CustoProviderRawValue<any>, "value">
	) => TransformedData,
	getCurrentMetaHook: (
		customizations: Data,
		prevMeta: any
	) => Omit<CustoProviderRawValue<any>, "value">
): ((
	currentVal: Data,
	prevVal: CustoProviderRawValue<TransformedData>
) => CustoProviderRawValue<TransformedData>) => {
	return (
		currentVal: Data,
		prevValWithMeta: CustoProviderRawValue<TransformedData>
	) => {
		const currentMeta = getCurrentMetaHook(
			currentVal,
			prevValWithMeta.mergeFlags
		);

		const mergeFlags = useMemo((): custoMergeFlags | undefined => {
			return new Set([
				...(currentMeta.mergeFlags || []),
				...(prevValWithMeta.mergeFlags || []),
			]);
		}, [currentMeta, prevValWithMeta.mergeFlags]);

		const mergedMeta = useMemo(
			(): Omit<CustoProviderRawValue<any>, "value"> => ({
				mergeFlags,
			}),
			[mergeFlags]
		);

		const value = getValueHook(
			currentVal,
			prevValWithMeta.value,
			mergedMeta
		);
		return useMemo(
			(): CustoProviderRawValue<TransformedData> => ({
				value,
				...mergedMeta,
			}),
			[mergedMeta, value]
		);
	};
};
