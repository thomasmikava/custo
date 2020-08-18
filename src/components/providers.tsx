/* eslint-disable react-hooks/rules-of-hooks */
import { StackedContext } from "react-flexible-contexts";
import { mergeCustomizations, MergeDecisionFn } from "../utils/objects";
import { DeeplyOptional } from "../utils/generics";
import { useMemo } from "react";
import { MultiDimentionalWeakMap } from "../utils/weak-map";
import { custoMergeFlags, CustoMergeFlagEnum, CustoMergeFlag } from "../flags";

export const createProviders = <
	RawValue extends Record<any, any>,
	Value = WithMeta<RawValue>,
	LayerData = DeeplyOptional<RawValue>
>({
	defaultValue,
	defaultMeta,
	layerTransformationHook = (x => x) as any,
	contextDisplayName,
	rawToFinalValueHook,
	mergeDecisionFn,
}: {
	layerTransformationHook?: (arg: LayerData) => RawValue;
	rawToFinalValueHook?: (data: WithMeta<RawValue>) => Value;
	contextDisplayName?: string;
	mergeDecisionFn?: MergeDecisionFn;
	defaultValue: RawValue | undefined;
	defaultMeta?: Meta | null;
}) => {
	const memoContainer = new MultiDimentionalWeakMap(4);

	const contextDrfaultValue: WithMeta<RawValue> | undefined =
		defaultValue === undefined
			? undefined
			: {
					meta: defaultMeta ?? [],
					value: defaultValue,
			  };

	const NormalizedQuestionContentCustomizationCont = StackedContext.create(
		contextDrfaultValue!,
		{ rawToFinalValueHook }
	);
	if (contextDisplayName) {
		NormalizedQuestionContentCustomizationCont.context.setContextName(
			contextDisplayName
		);
	}

	const FullValueProvider =
		NormalizedQuestionContentCustomizationCont.context.Provider;

	const FullUnmergingProvider = NormalizedQuestionContentCustomizationCont.addProvider<
		LayerData
	>(wrapInMeta(layerTransformationHook, () => null));

	// merges everything
	const PartialMergingProvider = NormalizedQuestionContentCustomizationCont.addProvider(
		createProviderMergingLogic<LayerData, RawValue>({
			transformationHook: layerTransformationHook,
			memoContainer,
			mergeDecisionFn,
		})
	);

	// merges everything except default value
	const PartialNonPackageMergingProvider = NormalizedQuestionContentCustomizationCont.addProvider(
		createProviderMergingLogic<LayerData, RawValue>({
			transformationHook: layerTransformationHook,
			memoContainer,
			avoidDefaultCustomizationsMerging: true,
			mergeDecisionFn,
		})
	);
	(window as any).mergingMemoContainer = memoContainer;

	// does not merge anything
	const PartialUnmergingProvider = NormalizedQuestionContentCustomizationCont.addProvider(
		createProviderMergingLogic<LayerData, RawValue>({
			transformationHook: layerTransformationHook,
			memoContainer,
			avoidNormalCustomizationsMerging: true,
			avoidDefaultCustomizationsMerging: true,
			mergeDecisionFn,
		})
	);

	return {
		Container: NormalizedQuestionContentCustomizationCont,
		FullValueProvider,
		FullUnmergingProvider,
		PartialMergingProvider,
		PartialNonPackageMergingProvider,
		PartialUnmergingProvider,
		memoContainer,
	};
};

export const createProviderMergingLogic = <
	LayerValue extends Record<any, any>,
	FinalValue = LayerValue
>({
	transformationHook = x => x as FinalValue,
	memoContainer = new MultiDimentionalWeakMap(4),
	avoidNormalCustomizationsMerging,
	avoidDefaultCustomizationsMerging,
	mergeFlags: defaultMergingFlags,
	mergeDecisionFn,
}: {
	transformationHook?: (arg: LayerValue) => FinalValue;
	memoContainer?: MultiDimentionalWeakMap<4>;
	avoidNormalCustomizationsMerging?: boolean;
	avoidDefaultCustomizationsMerging?: boolean;
	mergeFlags?: custoMergeFlags;
	mergeDecisionFn?: MergeDecisionFn;
}) => {
	let avoidCustomizationsMerging = false;
	if (avoidNormalCustomizationsMerging && avoidDefaultCustomizationsMerging) {
		avoidCustomizationsMerging = true;
	}
	const mergeFlags: CustoMergeFlag[] = [...(defaultMergingFlags || [])];
	if (avoidNormalCustomizationsMerging) {
		mergeFlags.push(CustoMergeFlagEnum.avoidWithNonPackageValue);
	}
	if (avoidDefaultCustomizationsMerging) {
		mergeFlags.push(CustoMergeFlagEnum.avoidWithPackageDefaultValue);
	}
	const getCurrentMetaHook = (customizations: LayerValue, prevMeta: any) => {
		return mergeFlags;
	};

	const fn = (
		customizations: LayerValue,
		prevVal: FinalValue
	): FinalValue => {
		const transformed = transformationHook(customizations);
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

type Meta = (CustoMergeFlag | null | undefined)[];

export interface WithMeta<V> {
	value: V;
	meta: Meta;
}

const wrapInMeta = <Data, TransformedData>(
	getValueHook: (
		customizations: Data,
		prevVal: TransformedData
	) => TransformedData,
	getCurrentMetaHook: (customizations: Data, prevMeta: any) => any
): ((
	customizations: Data,
	prevVal: WithMeta<TransformedData>
) => WithMeta<TransformedData>) => {
	return (
		customizations: Data,
		prevValWithMeta: WithMeta<TransformedData>
	) => {
		const currentMeta = getCurrentMetaHook(
			customizations,
			prevValWithMeta.meta
		);
		const meta = useMemo(() => {
			return [currentMeta, ...(prevValWithMeta.meta || [])];
		}, [currentMeta, prevValWithMeta.meta]);
		const value = getValueHook(customizations, prevValWithMeta.value);
		return useMemo(
			(): WithMeta<TransformedData> => ({
				meta,
				value,
			}),
			[meta, value]
		);
	};
};
