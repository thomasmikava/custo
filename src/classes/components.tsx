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

export class CustoComponent<Props extends Record<any, any>>
	implements CustoClass {
	public readonly component: React.ComponentType<any> | string | null;
	public fakePropsTransformer: (args: Props) => void;
	private readonly defaultProps: Partial<Props>;
	readonly $$end$$: true = true;
	private readonly mergeStartegy?: (
		currentComponent: CustoComponent<any>,
		secondaryComponent: CustoComponent<any>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => CustoComponent<any>;
	private readonly propsMergeStrategy?: (
		currentComponentProps: Record<any, any>,
		secondaryComponentProps: Record<any, any>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => Record<any, any>;

	private readonly avoidMergingDifferentComponents: boolean;
	private readonly avoidAnyMerging: boolean;
	private readonly avoidLinkageMerging: boolean;
	private readonly labels: Set<CustomizableLabels | string>;
	private readonly name?: string;
	private readonly stripPropKeys?: readonly (number | string | symbol)[];

	/* eslint-disable */
	private readonly outerBeforeComponents: ReadonlyArray<CustoComponent<{}>> = [];
	private readonly outerAfterComponents: ReadonlyArray<CustoComponent<{}>> = [];
	private readonly innerStartComponents: ReadonlyArray<CustoComponent<{}>> = [];
	private readonly innerEndComponents: ReadonlyArray<CustoComponent<{}>> = [];
	private readonly transformProps: (inProps: Props) => Record<any, any> = (props) => props;
	/* eslint-enable */

	private constructor(
		comp: React.ComponentType<any> | string | null,
		defaultProps?: Partial<Props>,
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
		if (additionalOptions.transformProps) {
			this.transformProps = additionalOptions.transformProps;
		}
		this.name = additionalOptions.name;
		this.mergeStartegy = additionalOptions.mergeStartegy;
		this.propsMergeStrategy = additionalOptions.propsMergeStrategy;
		this.avoidAnyMerging = !!additionalOptions.avoidAnyMerging;
		this.avoidLinkageMerging = !!additionalOptions.avoidLinkageMerging;
		this.avoidMergingDifferentComponents = !!additionalOptions.avoidMergingDifferentComponents;
		this.labels = additionalOptions.labels
			? new Set(additionalOptions.labels)
			: new Set();
		this.stripPropKeys = additionalOptions.stripPropKeys;
	}

	render(props: Props) {
		const {
			children: initialChildren,
			...mergedProps
		} = this.getMergedProps(props);
		const finalProps = this.transformProps(
			removeKeys(
				mergedProps,
				...((this.stripPropKeys || []) as never[])
			) as Props
		);

		let children = Array.isArray(initialChildren)
			? initialChildren
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

		const mainElement = React.createElement(
			this.component as any,
			finalProps,
			...children
		);
		if (
			this.outerBeforeComponents.length === 0 &&
			this.outerAfterComponents.length === 0
		) {
			return mainElement;
		}
		return (
			<React.Fragment>
				{this.outerBeforeComponents.map(renderMap)}
				{mainElement}
				{this.outerAfterComponents.map(renderMap)}
			</React.Fragment>
		);
	}

	mergeClass(
		cl: CustoClass,
		mergeFlags?: custoMergeFlags
	): CustoComponent<Props> {
		try {
			if (cl === this) return this;
			const mergeFlagsSet: ReadonlySet<CustoMergeFlag> = mergeFlags
				? new Set(mergeFlags)
				: new Set();
			if (!(cl instanceof CustoComponent)) return this;
			else if (this.mergeStartegy) {
				return this.mergeStartegy(this, cl, mergeFlagsSet);
			}
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
				this.component !== cl.component
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
				const mergedProps = this.propsMergeStrategy(
					this.defaultProps,
					cl.defaultProps,
					mergeFlagsSet
				) as Partial<Props>;
				return new CustoComponent(
					this.component,
					mergedProps,
					this.getCopiedAdditionalOptions()
				);
			}
			if (
				typeof this.component === "string" &&
				typeof cl.component === "string"
			) {
				const mergedProps = deepMergeHTMLProps(
					this.defaultProps,
					cl.defaultProps
				) as Partial<Props>;
				return new CustoComponent(
					this.component,
					mergedProps,
					this.getCopiedAdditionalOptions()
				);
			}
			return this;
		} catch (e) {
			return this;
		}
	}

	getMergedProps<T>(props: T): T {
		const mergedProps = { ...this.defaultProps, ...props } as any;
		return mergedProps as Props;
	}

	/** Returns new Customized Component and adds new component to it */
	addComponent(
		place: "outerBefore" | "outerAfter" | "innerStart" | "innerEnd",
		/** single or array of customized components */
		component: ComponentsOrArray,
		/** circular index */
		index?: number
	): CustoComponent<Props> {
		const cloned = this.clone();
		const array = cloned.getComponentsArr(place);
		index = typeof index === "number" ? index : -1;
		index = getCirculatedIndex(index, array.length + 1);
		(array as any).splice(index, 0, ...toArray(component));
		return cloned;
	}

	private getComponentsArr(
		place: "outerBefore" | "outerAfter" | "innerStart" | "innerEnd"
	) {
		if (place === "innerEnd") {
			return this.innerEndComponents;
		}
		if (place === "innerStart") {
			return this.innerStartComponents;
		}
		if (place === "outerAfter") {
			return this.outerAfterComponents;
		}
		if (place === "outerBefore") {
			return this.outerBeforeComponents;
		}
		throw new Error("incorrect place " + place);
	}

	clone(): CustoComponent<Props> {
		return new CustoComponent(
			this.component,
			this.defaultProps,
			this.getCopiedAdditionalOptions()
		);
	}

	private getCopiedAdditionalOptions(): CustoComponentOptions<any> {
		return {
			innerEndComponents: [...this.innerEndComponents],
			innerStartComponents: [...this.innerStartComponents],
			outerAfterComponents: [...this.outerAfterComponents],
			outerBeforeComponents: [...this.outerBeforeComponents],
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
		};
	}

	static create<Component extends React.ComponentType<any>>(
		comp: Component,
		defaultProps?: Partial<
			NormProps<
				Component extends React.ComponentType<infer R> ? R : never
			>
		>
	): CustoComponent<
		NormProps<Component extends React.ComponentType<infer R> ? R : never>
	>;
	static create<
		Component extends React.ComponentType<any>,
		InProps extends Record<any, any>
	>(
		comp: Component,
		defaultProps?: Partial<InProps>,
		additionalOptions?: CustoComponentOptions<
			InProps,
			Component extends React.ComponentType<infer R> ? R : never
		>
	): CustoComponent<InProps>;
	static create<
		OutProps extends Record<any, any>,
		InProps extends Record<any, any> = OutProps
	>(
		comp: null,
		defaultProps?: Partial<InProps>,
		additionalOptions?: CustoComponentOptions<InProps, OutProps>
	): CustoComponent<InProps>;
	static create<
		OutProps extends HTMLProps<any>,
		InProps extends Record<any, any> = OutProps
	>(
		comp: string,
		defaultProps?: Partial<InProps>,
		additionalOptions?: CustoComponentOptions<InProps, OutProps>
	): CustoComponent<InProps>;
	static create<
		OutProps extends Record<any, any>,
		InProps extends Record<any, any> = OutProps
	>(
		comp: React.ComponentType<OutProps> | string | null,
		defaultProps?: Partial<InProps>,
		additionalOptions?: CustoComponentOptions<InProps, OutProps>
	): CustoComponent<InProps> {
		return new CustoComponent<InProps>(
			comp,
			defaultProps,
			additionalOptions
		);
	}
}

type NormProps<T> = unknown extends T ? {} : T;

export type OptionalKeys<T, K extends string | number | symbol> = Omit<T, K> &
	Partial<{ [key in K & keyof T]: T[key] }>;

export interface CustoComponentOptions<
	InProps extends Record<any, any>,
	OutProps extends Record<any, any> = InProps
> {
	name?: string;
	outerBeforeComponents?: ComponentsOrArray;
	outerAfterComponents?: ComponentsOrArray;
	innerStartComponents?: ComponentsOrArray;
	innerEndComponents?: ComponentsOrArray;
	mergeStartegy?: (
		currentComponent: CustoComponent<any>,
		secondaryComponent: CustoComponent<any>,
		mergeFlags: ReadonlySet<CustoMergeFlagEnum>
	) => CustoComponent<any>;
	propsMergeStrategy?: (
		currentComponentProps: Record<any, any>,
		secondaryComponentProps: Record<any, any>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => Record<any, any>;
	avoidAnyMerging?: boolean;
	avoidLinkageMerging?: boolean;
	avoidMergingDifferentComponents?: boolean;
	labels?: Iterable<CustomizableLabels | string>;
	transformProps?: (inProps: InProps) => OutProps;
	stripPropKeys?: readonly (number | string | symbol)[];
}

type ComponentsOrArray = ReadonlyArray<CustoComponent<{}>> | CustoComponent<{}>;

const toArray = <T extends any>(el: T): T extends readonly any[] ? T : [T] => {
	if (Array.isArray(el)) return el as any;
	return [el] as any;
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

const renderMap = (e: CustoComponent<any>, i: number) => {
	return e.render({ key: i });
};
