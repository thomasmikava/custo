import React, { HTMLProps } from "react";
import { CustoClass } from "../interfaces";
import { deepMergeHTMLProps } from "../utils/html";
import {
	CustoMergeFlagEnum,
	CustomizableLabels,
	custoMergeFlags,
	CustoMergeFlag,
} from "../flags";
import { removeKeys } from "../utils/objects";
import { unionWith, subtractSet } from "../utils/set";
import { pickHTMLProps } from "react-sanitize-dom-props";

export class CustoComponent<Props extends Record<any, any>, Ref = unknown>
	implements CustoClass {
	public readonly component: React.ComponentType<any> | string | null;
	public fakePropsTransformer: (args: Props) => void;
	private readonly defaultProps: ValueOrFn<Partial<Props>, [Props]>;
	readonly $$end$$: true = true;
	private readonly mergeStartegy?: (
		currentComponent: CustoComponent<any, Ref>,
		secondaryComponent: CustoComponent<any, unknown>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => CustoComponent<any, any>;
	private readonly propsMergeStrategy?: (
		currentComponentProps: Record<any, any>,
		secondaryComponentProps: Record<any, any>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => Record<any, any>;
	private readonly propsToDefaultPropsMergeStrategy?: (
		props: Record<any, any>,
		defProps: Record<any, any>
	) => Record<any, any>;

	private readonly avoidMergingDifferentComponents: boolean;
	private readonly avoidAnyMerging: boolean;
	private readonly avoidLinkageMerging: boolean;
	private readonly labels: Set<CustomizableLabels | string>;
	private readonly name?: string;
	private readonly avoidStrippingInvalidDOMProps: boolean;
	private readonly stripPropKeys?: readonly (number | string | symbol)[];
	private readonly additionalMergeFlags?: ReadonlySet<CustoMergeFlag>;
	private readonly subtractiveMergeFlags?: ReadonlySet<CustoMergeFlag>;

	/* eslint-disable */
	private readonly outerBeforeComponents: ReadonlyArray<CustoComponent<{}, unknown>> = [];
	private readonly outerAfterComponents: ReadonlyArray<CustoComponent<{}, unknown>> = [];
	private readonly outerWrapperComponents: ReadonlyArray<CustoComponent<{}, unknown>> = [];
	private readonly outermostWrapperComponents: ReadonlyArray<CustoComponent<{}, unknown>> = [];
	private readonly innerStartComponents: ReadonlyArray<CustoComponent<{}, unknown>> = [];
	private readonly innerEndComponents: ReadonlyArray<CustoComponent<{}, unknown>> = [];
	private readonly innerWrapperComponents: ReadonlyArray<CustoComponent<{}, unknown>> = [];
	private readonly transformProps: (inProps: Props) => Record<any, any> = (props) => props;
	/* eslint-enable */

	private constructor(
		comp: React.ComponentType<any> | string | null,
		defaultProps?: ValueOrFn<Partial<Props>, [any]> | null,
		additionalOptions?: CustoComponentOptions<Props>
	) {
		this.component = comp;
		this.defaultProps = defaultProps || {};
		additionalOptions = additionalOptions || {};
		if (additionalOptions.outerBeforeComponents) {
			this.outerBeforeComponents = toArray(
				additionalOptions.outerBeforeComponents
			);
		}
		if (additionalOptions.outerAfterComponents) {
			this.outerAfterComponents = toArray(
				additionalOptions.outerAfterComponents
			);
		}
		if (additionalOptions.outerWrapperComponents) {
			this.outerWrapperComponents = toArray(
				additionalOptions.outerWrapperComponents
			);
		}
		if (additionalOptions.outermostWrapperComponents) {
			this.outermostWrapperComponents = toArray(
				additionalOptions.outermostWrapperComponents
			);
		}
		if (additionalOptions.innerStartComponents) {
			this.innerStartComponents = toArray(
				additionalOptions.innerStartComponents
			);
		}
		if (additionalOptions.innerEndComponents) {
			this.innerEndComponents = toArray(
				additionalOptions.innerEndComponents
			);
		}
		if (additionalOptions.innerWrapperComponents) {
			this.innerWrapperComponents = toArray(
				additionalOptions.innerWrapperComponents
			);
		}
		if (additionalOptions.transformProps) {
			this.transformProps = additionalOptions.transformProps;
		}
		this.name = additionalOptions.name;
		this.mergeStartegy = additionalOptions.mergeStartegy;
		this.propsMergeStrategy = additionalOptions.propsMergeStrategy;
		this.propsToDefaultPropsMergeStrategy = additionalOptions.propsToDefaultPropsMergeStrategy as any;
		this.avoidAnyMerging = !!additionalOptions.avoidAnyMerging;
		this.avoidLinkageMerging = !!additionalOptions.avoidLinkageMerging;
		this.avoidMergingDifferentComponents = !!additionalOptions.avoidMergingDifferentComponents;
		this.labels = additionalOptions.labels
			? new Set(additionalOptions.labels)
			: new Set();
		this.stripPropKeys = additionalOptions.stripPropKeys;
		this.additionalMergeFlags = additionalOptions.additionalMergeFlags;
		this.subtractiveMergeFlags = additionalOptions.subtractiveMergeFlags;
		this.avoidStrippingInvalidDOMProps = !!additionalOptions.avoidStrippingInvalidDOMProps;
	}

	render(props: Props) {
		const {
			children: initialChildren,
			...mergedProps
		} = this.getMergedProps(props);
		const ref = props.ref;
		let finalProps = this.transformProps(
			removeKeys(
				mergedProps,
				...((this.stripPropKeys || []) as never[])
			) as Props
		);
		if (
			typeof this.component === "string" &&
			!this.avoidStrippingInvalidDOMProps
		) {
			finalProps = pickHTMLProps(finalProps, false);
		}

		let children = Array.isArray(initialChildren)
			? initialChildren
			: initialChildren === undefined
			? []
			: [initialChildren];
		if (
			this.innerStartComponents.length ||
			this.innerEndComponents.length
		) {
			children = this.innerStartComponents
				.map(renderMap)
				.concat(children)
				.concat(this.innerEndComponents.map(renderMap));
		}
		let inner = children;
		if (this.innerWrapperComponents.length > 0) {
			let innerComp = React.createElement(React.Fragment, {}, ...inner);
			innerComp = wrapInComps(innerComp, ...this.innerWrapperComponents);
			inner = [innerComp];
		}

		let mainElement = React.createElement(
			this.component as any,
			{ ...finalProps, ref }, // TODO: get ref from finalProps before pickHTMLProps
			...children
		);
		if (this.outerWrapperComponents.length > 0) {
			mainElement = wrapInComps(
				mainElement,
				...this.outerWrapperComponents
			) as any;
		}
		if (
			this.outerBeforeComponents.length === 0 &&
			this.outerAfterComponents.length === 0 &&
			this.outermostWrapperComponents.length === 0
		) {
			return mainElement;
		}
		const children2 = React.createElement(
			React.Fragment,
			{},
			this.outerBeforeComponents.map(renderMap),
			mainElement,
			this.outerAfterComponents.map(renderMap)
		);
		if (this.outermostWrapperComponents.length === 0) {
			return children2;
		} else {
			return wrapInComps(children2, ...this.outermostWrapperComponents);
		}
	}

	mergeClass(
		cl: CustoClass,
		mergeFlags?: custoMergeFlags
	): CustoComponent<Props, Ref> {
		try {
			if (cl === this) return this;
			const mergeFlagsSet: Set<CustoMergeFlag> = mergeFlags
				? new Set(mergeFlags)
				: new Set();
			if (this.additionalMergeFlags) {
				unionWith.call(mergeFlagsSet, this.additionalMergeFlags);
			}
			if (this.subtractiveMergeFlags) {
				subtractSet.call(mergeFlagsSet, this.subtractiveMergeFlags);
			}
			if (!(cl instanceof CustoComponent)) return this;
			else if (this.mergeStartegy) {
				return this.mergeStartegy(this, cl, mergeFlagsSet);
			}
			const component =
				this.component === null || this.component === undefined
					? cl.component
					: this.component;
			if (this.avoidAnyMerging || cl.avoidAnyMerging) {
				return this;
			}
			if (
				mergeFlagsSet.has(
					CustoMergeFlagEnum.avoidWithPackageDefaultValue
				) &&
				(this.labels.has(CustomizableLabels.packageDefaultValue) ||
					cl.labels.has(CustomizableLabels.packageDefaultValue))
			) {
				return this;
			}
			if (
				mergeFlagsSet.has(
					CustoMergeFlagEnum.avoidWithNonPackageValue
				) &&
				(!this.labels.has(CustomizableLabels.packageDefaultValue) ||
					!cl.labels.has(CustomizableLabels.packageDefaultValue))
			) {
				return this;
			}
			if (
				mergeFlagsSet.has(CustoMergeFlagEnum.linking) &&
				mergeFlagsSet.has(CustoMergeFlagEnum.avoidLinking)
			) {
				return this;
			}
			if (
				(this.avoidMergingDifferentComponents ||
					cl.avoidMergingDifferentComponents) &&
				component !== cl.component
			) {
				return this;
			}
			if (
				(this.avoidLinkageMerging || cl.avoidLinkageMerging) &&
				mergeFlagsSet.has(CustoMergeFlagEnum.linking)
			) {
				return this;
			}
			if (this.propsMergeStrategy) {
				const propsMergeStrategy = this.propsMergeStrategy;
				const normalizedPropsMergeStrategy = (
					currentComponentProps: Record<any, any>,
					secondaryComponentProps: Record<any, any>
				) =>
					propsMergeStrategy(
						currentComponentProps,
						secondaryComponentProps,
						mergeFlagsSet
					);
				const mergedProps = mergeValueOrFn(
					this.defaultProps,
					cl.defaultProps,
					normalizedPropsMergeStrategy
				) as ValueOrFn<Partial<Props>, [Props]>;
				return new CustoComponent(
					component,
					mergedProps,
					this.getCopiedAdditionalOptions()
				);
			}
			if (
				typeof component === "string" &&
				typeof cl.component === "string"
			) {
				const mergedProps = mergeValueOrFn(
					this.defaultProps,
					cl.defaultProps,
					deepMergeHTMLProps
				) as ValueOrFn<Partial<Props>, [Props]>;
				return new CustoComponent(
					component,
					mergedProps,
					this.getCopiedAdditionalOptions()
				);
			}
			if (component !== this.component) {
				return new CustoComponent(
					component,
					this.defaultProps,
					this.getCopiedAdditionalOptions()
				);
			}
			return this;
		} catch (e) {
			return this;
		}
	}

	getMergedProps(props: Props) {
		const defaultProps =
			typeof this.defaultProps === "function"
				? this.defaultProps(props as Props)
				: this.defaultProps;
		if (this.propsToDefaultPropsMergeStrategy) {
			return this.propsToDefaultPropsMergeStrategy(props, defaultProps);
		}
		return { ...defaultProps, ...props } as Props;
	}

	/** Returns new Customized Component and adds new component to it */
	addComponent(
		place:
			| "outerBefore"
			| "outerAfter"
			| "outerWrapper"
			| "outermostWrapper"
			| "innerStart"
			| "innerEnd"
			| "innerWrapper",
		/** single or array of customized components */
		component: ComponentsOrArray,
		/** circular index */
		index?: number
	): CustoComponent<Props, Ref> {
		const cloned = this.clone();
		const array = cloned.getComponentsArr(place);
		index = typeof index === "number" ? index : -1;
		index = getCirculatedIndex(index, array.length + 1);
		(array as any).splice(index, 0, ...toArray(component));
		return cloned;
	}

	private getComponentsArr(
		place:
			| "outerBefore"
			| "outerAfter"
			| "outerWrapper"
			| "outermostWrapper"
			| "innerStart"
			| "innerEnd"
			| "innerWrapper"
	) {
		if (place === "innerEnd") {
			return this.innerEndComponents;
		}
		if (place === "innerStart") {
			return this.innerStartComponents;
		}
		if (place === "innerWrapper") {
			return this.innerWrapperComponents;
		}
		if (place === "outerAfter") {
			return this.outerAfterComponents;
		}
		if (place === "outerBefore") {
			return this.outerBeforeComponents;
		}
		if (place === "outerWrapper") {
			return this.outerWrapperComponents;
		}
		if (place === "outermostWrapper") {
			return this.outermostWrapperComponents;
		}
		throw new Error("incorrect place " + place);
	}

	clone(): CustoComponent<Props, Ref> {
		return new CustoComponent(
			this.component,
			this.defaultProps,
			this.getCopiedAdditionalOptions()
		);
	}

	private getCopiedAdditionalOptions(): CustoComponentOptions<any> {
		return {
			outerAfterComponents: [...this.outerAfterComponents],
			outerBeforeComponents: [...this.outerBeforeComponents],
			outerWrapperComponents: [...this.outerWrapperComponents],
			outermostWrapperComponents: [...this.outermostWrapperComponents],
			innerEndComponents: [...this.innerEndComponents],
			innerStartComponents: [...this.innerStartComponents],
			innerWrapperComponents: [...this.innerWrapperComponents],
			avoidMergingDifferentComponents: this
				.avoidMergingDifferentComponents,
			mergeStartegy: this.mergeStartegy,
			labels: new Set(this.labels),
			avoidAnyMerging: this.avoidAnyMerging,
			avoidLinkageMerging: this.avoidLinkageMerging,
			propsMergeStrategy: this.propsMergeStrategy,
			name: this.name,
			transformProps: this.transformProps,
			stripPropKeys: this.stripPropKeys,
			additionalMergeFlags: this.additionalMergeFlags,
			subtractiveMergeFlags: this.subtractiveMergeFlags,
			avoidStrippingInvalidDOMProps: this.avoidStrippingInvalidDOMProps,
		};
	}

	static create(
		comp: string,
		defaultProps?: ValueOrFn<HTMLProps<any>, [HTMLProps<any>]> | null
	): CustoComponent<HTMLProps<any>, unknown>;
	static create<
		OutProps extends HTMLProps<any>,
		InProps extends Record<any, any> = OutProps
	>(
		comp: string,
		defaultProps?: ValueOrFn<Partial<InProps>, [InProps]> | null,
		additionalOptions?: CustoComponentOptions<Partial<InProps>, OutProps>
	): CustoComponent<Partial<InProps>, unknown>;
	static create<Component extends React.ComponentType<any>>(
		comp: Component,
		defaultProps?: ValueOrFn<
			Partial<
				NormProps<
					Component extends React.ComponentType<infer R> ? R : never
				>
			>,
			[
				NormProps<
					Component extends React.ComponentType<infer R> ? R : never
				>
			]
		> | null
	): CustoComponent<
		NormProps<Component extends React.ComponentType<infer R> ? R : never>,
		unknown
	>;
	static create<
		Component extends React.ComponentType<any>,
		InProps extends Record<any, any>
	>(
		comp: Component,
		defaultProps?: ValueOrFn<Partial<InProps>, [InProps]> | null,
		additionalOptions?: CustoComponentOptions<
			InProps,
			Component extends React.ComponentType<infer R> ? R : never
		>
	): CustoComponent<InProps, unknown>;
	static create<
		OutProps extends Record<any, any>,
		InProps extends Record<any, any> = OutProps
	>(
		comp: null,
		defaultProps?: ValueOrFn<Partial<InProps>, [InProps]> | null,
		additionalOptions?: CustoComponentOptions<InProps, OutProps>
	): CustoComponent<InProps, unknown>;
	static create<
		OutProps extends Record<any, any>,
		InProps extends Record<any, any> = OutProps
	>(
		comp: React.ComponentType<OutProps> | string | null,
		defaultProps?: ValueOrFn<Partial<InProps>, [InProps]> | null,
		additionalOptions?: CustoComponentOptions<InProps, OutProps>
	): CustoComponent<InProps, unknown> {
		return new CustoComponent<InProps, unknown>(
			comp,
			defaultProps,
			additionalOptions
		);
	}
}

type NormProps<T> = unknown extends T ? {} : T;

export type OptionalKeys<T, K extends string | number | symbol> = Omit<T, K> &
	Partial<{ [key in K & keyof T]: T[key] }>;

export type ValueOrFn<V, Args extends readonly any[] = []> =
	| V
	| ((...args: Args) => V);

export interface CustoComponentOptions<
	InProps extends Record<any, any>,
	OutProps extends Record<any, any> = InProps
> {
	name?: string;
	outerBeforeComponents?: ComponentsOrArray;
	outerAfterComponents?: ComponentsOrArray;
	outerWrapperComponents?: ComponentsOrArray;
	outermostWrapperComponents?: ComponentsOrArray;
	innerStartComponents?: ComponentsOrArray;
	innerEndComponents?: ComponentsOrArray;
	innerWrapperComponents?: ComponentsOrArray;
	mergeStartegy?: (
		currentComponent: CustoComponent<any, unknown>,
		secondaryComponent: CustoComponent<any, unknown>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => CustoComponent<any, unknown>;
	propsMergeStrategy?: (
		currentComponentProps: Record<any, any>,
		secondaryComponentProps: Record<any, any>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => Record<any, any>;
	propsToDefaultPropsMergeStrategy?: (
		props: InProps,
		defProps: Partial<InProps>
	) => InProps;
	avoidAnyMerging?: boolean;
	avoidLinkageMerging?: boolean;
	avoidMergingDifferentComponents?: boolean;
	labels?: Iterable<CustomizableLabels | string>;
	additionalMergeFlags?: ReadonlySet<CustoMergeFlag>;
	subtractiveMergeFlags?: ReadonlySet<CustoMergeFlag>;
	transformProps?: (inProps: InProps) => OutProps;
	stripPropKeys?: readonly (number | string | symbol)[];
	avoidStrippingInvalidDOMProps?: boolean;
}

export type ComponentsOrArray =
	| ReadonlyArray<CustoComponent<{}, unknown>>
	| CustoComponent<{}, unknown>;

const toArray = <T extends any>(el: T): T extends readonly any[] ? T : [T] => {
	if (Array.isArray(el)) return el as any;
	return [el] as any;
};

export const mergeValueOrFn = <
	K extends Record<any, any>,
	T extends K | ((...args: any[]) => K)
>(
	v1: T,
	v2: T,
	mergeFn: (first: K, second: K) => K
): T => {
	if (typeof v1 !== "function" && typeof v2 !== "function") {
		return mergeFn(v1 as K, v2 as K);
	}
	return ((...args: any[]) => {
		const val1 =
			typeof v1 === "function"
				? (v1 as (...args: any[]) => K)(...args)
				: (v1 as K);
		const val2 =
			typeof v2 === "function"
				? (v2 as (...args: any[]) => K)(...args)
				: (v2 as K);
		return mergeFn(val1 as K, val2 as K);
	}) as T;
};

const getCirculatedIndex = (index: number, length: number) => {
	if (index >= 0 && index < length) return index;
	if (length <= 0) return 0;

	if (index > 0) {
		return index % length;
	}
	index = ((index % length) + length) % length;

	return index;
};

const renderMap = (e: CustoComponent<any, unknown>, i: number) => {
	return e.render({ key: i });
};
const wrapInComps = (
	comp: JSX.Element,
	...wrappers: CustoComponent<any, unknown>[]
) => {
	let result = comp;
	for (let i = wrappers.length - 1; i >= 0; i--) {
		const wrapper = wrappers[i];
		result = wrapper.render({ children: result });
	}
	return result;
};
