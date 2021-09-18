import React, { HTMLProps } from "react";
import { CustoClass, NormProps } from "../interfaces";
import { deepMergeHTMLProps } from "../utils/html";
import {
	CustoComponentFlags,
	custoMergeFlags,
	CustoMergeFlag,
} from "../flags";
import { removeKeys } from "../utils/objects";
import { unionWith, subtractSet } from "../utils/set";
import { pickHTMLProps } from "react-sanitize-dom-props";

export class CustoComponent<Props extends Record<any, any>, Ref = unknown>
	implements CustoClass {
	public component: React.ComponentType<any> | string | null;
	private defaultProps: ValueOrFn<Partial<Props>, [Props]>;
	readonly $$end$$: true = true;
	private mergeStrategy?: (
		currentComponent: CustoComponent<any, Ref>,
		secondaryComponent: CustoComponent<any, unknown>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => CustoComponent<any, any>;
	private propsMergeStrategy?: (
		currentComponentProps: Record<any, any>,
		secondaryComponentProps: Record<any, any>,
		mergeFlags: ReadonlySet<CustoMergeFlag>
	) => Record<any, any>;
	private propsToDefaultPropsMergeStrategy?: (
		props: Record<any, any>,
		defProps: Record<any, any>
	) => Record<any, any>;

	private name?: string;
	private wrapInErrorCatcher?: boolean; // TODO: use
	private wrapInMemo?: boolean; // TODO: use
	private stripPropKeys?: readonly (number | string | symbol)[];
	private addictiveFlags?: ReadonlySet<CustoMergeFlag>;
	private subtractiveFlags?: ReadonlySet<CustoMergeFlag>;

	private hasFlag = (flag: CustoMergeFlag): boolean => {
		if (!this.addictiveFlags) return false;
		if (!this.addictiveFlags.has(flag)) return false;
		if (this.subtractiveFlags && this.subtractiveFlags.has(flag)) return false;
		return true;
	}

	/* eslint-disable */
	private positioningComponents: { [key in ComponentPositions]?: ComponentsOrArray };
	private transformPropsFn: (inProps: Props) => Record<any, any> = (props) => props;
	/* eslint-enable */

	private constructor(
		comp: React.ComponentType<any> | string | null,
		defaultProps?: ValueOrFn<Partial<Props>, [any]> | null,
		additionalOptions?: CustoComponentOptions<Props>
	) {
		this.positioningComponents = {};
		this.component = comp;
		this.defaultProps = defaultProps || {};
		additionalOptions = additionalOptions || {};
		this.applyConfig(additionalOptions, true);
	}

	private applyConfig = (config: CustoComponentOptions<Props>, calledDuringConstructing?: boolean) => {
		if (config.components) {
			this.positioningComponents = {...(this.positioningComponents || {}), ...config.components};
		}
		if (config.transformProps) {
			this.transformPropsFn = config.transformProps;
		}
		if (config.name) {
			this.name = config.name;
		}
		if (config.mergeStrategy) {
			this.mergeStrategy = config.mergeStrategy;
		}
		if (config.propsMergeStrategy) {
			this.propsMergeStrategy = config.propsMergeStrategy;
		}
		if (config.propsToDefaultPropsMergeStrategy) {
			this.propsToDefaultPropsMergeStrategy = config.propsToDefaultPropsMergeStrategy as any;
		}
		if (config.stripPropKeys) {
			this.stripPropKeys = config.stripPropKeys;
		}
		if (config.flags) {
			this.addictiveFlags = config.flags;
		}
		if (config.subtractiveFlags) {
			this.subtractiveFlags = config.subtractiveFlags;
		}
	}

	render(props: Props) {
		const {
			children: initialChildren,
			...mergedProps
		} = this.getMergedProps(props);
		const ref = props.ref;
		let finalProps = this.transformPropsFn(
			removeKeys(
				mergedProps,
				...((this.stripPropKeys || []) as never[])
			) as Props
		);
		const isDOMElement = typeof this.component === "string";
		if (
			isDOMElement &&
			!this.hasFlag(CustoComponentFlags.avoidStrippingInvalidDOMProps)
		) {
			finalProps = pickHTMLProps(finalProps, false);
		}

		let children = Array.isArray(initialChildren)
			? initialChildren
			: initialChildren === undefined
			? []
			: [initialChildren];
		// TODO: consider innsermost
		if (
			this.positioningComponents.innerStart ||
			this.positioningComponents.innerEnd
		) {
			children = this.getComponentsArr("innerStart")
				.map(renderMap)
				.concat(children)
				.concat(this.getComponentsArr("innerEnd").map(renderMap));
		}
		let inner = children;
		if (this.positioningComponents.innerWrapper) {
			let innerComp = React.createElement(React.Fragment, {}, ...inner);
			innerComp = wrapInComps(innerComp, ...this.getComponentsArr("innerWrapper"));
			inner = [innerComp];
		}

		let mainElement = React.createElement(
			this.component as any,
			{ ...finalProps, ref }, // TODO: get ref from finalProps before pickHTMLProps
			...children
		);
		if (this.positioningComponents.outerWrapper) {
			mainElement = wrapInComps(
				mainElement,
				...this.getComponentsArr("outerWrapper")
			) as any;
		}
		if (
			!this.positioningComponents.outerBefore &&
			!this.positioningComponents.outerAfter &&
			!this.positioningComponents.outermostWrapper
		) {
			return mainElement;
		}
		const children2 = React.createElement(
			React.Fragment,
			{},
			this.getComponentsArr("outerBefore").map(renderMap),
			mainElement,
			this.getComponentsArr("outerAfter").map(renderMap)
		);
		if (!this.positioningComponents.outermostWrapper) {
			return children2;
		} else {
			return wrapInComps(children2, ...this.getComponentsArr("outermostWrapper"));
		}
	}

	mergeClass(
		cl: CustoClass,
		mergeFlags?: custoMergeFlags
	): CustoComponent<Props, Ref> {
		try {
			if (!(cl instanceof CustoComponent)) return this;
			if (cl === this) return this;
			const mergeFlagsSet: Set<CustoMergeFlag> = mergeFlags
				? new Set(mergeFlags)
				: new Set();
			if (this.addictiveFlags) {
				unionWith.call(mergeFlagsSet, this.addictiveFlags);
			}
			if (cl.addictiveFlags) {
				unionWith.call(mergeFlagsSet, cl.addictiveFlags);
			}
			if (this.subtractiveFlags) {
				subtractSet.call(mergeFlagsSet, this.subtractiveFlags);
			}
			if (cl.subtractiveFlags) {
				subtractSet.call(mergeFlagsSet, cl.subtractiveFlags);
			}
			else if (this.mergeStrategy) {
				return this.mergeStrategy(this, cl, mergeFlagsSet);
			}
			const component =
				this.component === null || this.component === undefined
					? cl.component
					: this.component;
			if (mergeFlagsSet.has(CustoComponentFlags.avoidAnyMerging)) {
				return this;
			}
			if (
				mergeFlagsSet.has(
					CustoComponentFlags.avoidWithPackageDefaultValue
				) &&
				mergeFlagsSet.has(CustoComponentFlags.isPackageDefaultValue)
			) {
				return this;
			}
			if (
				mergeFlagsSet.has(
					CustoComponentFlags.avoidWithNonPackageValue
				) &&
				!mergeFlagsSet.has(CustoComponentFlags.isPackageDefaultValue)
			) {
				return this;
			}
			if (
				mergeFlagsSet.has(CustoComponentFlags.isLinking) &&
				mergeFlagsSet.has(CustoComponentFlags.avoidLinking)
			) {
				return this;
			}
			if (
				mergeFlagsSet.has(CustoComponentFlags.avoidMergingDifferentComponents) &&
				component !== cl.component
			) {
				return this;
			}
			if (
				mergeFlagsSet.has(CustoComponentFlags.avoidLinkageMerging) &&
				mergeFlagsSet.has(CustoComponentFlags.isLinking)
			) {
				return this;
			}
			const getMergedConfigs = () => {
				// TODO: what about merging addictive and subtracting flags?
				// TODO: what about name?
				return this.getCopiedAdditionalOptions();
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
					getMergedConfigs()
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
					getMergedConfigs()
				);
			}
			if (component !== this.component) {
				return new CustoComponent(
					component,
					this.defaultProps,
					getMergedConfigs()
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
		place: ComponentPositions,
		/** single or array of customized components */
		component: ComponentsOrArray,
		/** circular index */
		index?: number
	): CustoComponent<Props, Ref> {
		const cloned = this.clone();
		const arr = [...cloned.getComponentsArr(place)];
		index = typeof index === "number" ? index : -1;
		index = getCirculatedIndex(index, arr.length + 1);
		arr.splice(index, 0, ...toArray(component));
		return cloned;
	}

	private getComponentsArr(
		place: ComponentPositions
	) {
		const el = this.positioningComponents[place];
		if (!el) return [];
		if (!Array.isArray(el)) return [el];
		return el;
	}

	clone(): CustoComponent<Props, Ref> {
		return new CustoComponent(
			this.component,
			this.defaultProps,
			this.getCopiedAdditionalOptions()
		);
	}

	private getCopiedPositioningComponents() {
		const positioningComponents = { ...this.positioningComponents };
		let hasOne= false;
		for (const key in positioningComponents) {
			hasOne = true;
			const value = positioningComponents[key];
			if (Array.isArray(value)) positioningComponents[key] = [...value] 
		}
		if (!hasOne) return undefined;
		return positioningComponents;
	}

	private getCopiedAdditionalOptions(): CustoComponentOptions<any> {
		return {
			name: this.name,
			components: this.getCopiedPositioningComponents(),
			mergeStrategy: this.mergeStrategy,
			propsMergeStrategy: this.propsMergeStrategy,
			transformProps: this.transformPropsFn,
			flags: this.addictiveFlags,
			subtractiveFlags: this.subtractiveFlags,
			stripPropKeys: this.stripPropKeys,
		};
	}

	static create(
		comp: string,
		defaultProps?: ValueOrFn<HTMLProps<any>, [HTMLProps<any>]> | null
	): CustoComponent<HTMLProps<any>, unknown>;
	static create<Component extends React.ComponentType<any>>(
		comp: Component
	): CustoComponent<
		NormProps<Component extends React.ComponentType<infer R> ? R : never>,
		unknown
	>;
	static create<
		Props extends Record<any, any>,
		PassedProps extends Partial<Props>
	>(
		comp: React.ComponentType<Props>,
		defaultProps?: ValueOrFn<PassedProps, [PassedProps]> | null,
	): CustoComponent<MarkKeysOptional<Props, keyof PassedProps>, unknown>;
	static create<Props = any>(comp: null): CustoComponent<Props, unknown>;
	static create<Props>(comp: null, defaultProps: Props): CustoComponent<Props, unknown>;
	static create(
		comp: React.ComponentType<any> | string | null,
		defaultProps?: any,
		additionalOptions?: any
	): CustoComponent<any, any> {
		// if comp is null, then set flag as merging 
		return new CustoComponent(
			comp,
			defaultProps,
			additionalOptions
		);
	}

	props<PassedProps extends Partial<Props>>(props: PassedProps | ((props: Props) => PassedProps)): CustoComponent<MarkKeysOptional<Props, keyof PassedProps>, Ref> {
		// TODO: implement
		return this as any;
	}
	config(options: CustoComponentOptions<Props>): CustoComponent<Props, Ref> {
		const cloned = this.clone();
		cloned.applyConfig(options);
		return cloned;
	}
	transformProps<OutProps extends Record<any, any>>(transformer:  (inProps: Props) => OutProps): CustoComponent<OutProps, Ref> {
		return this.config({ transformProps: transformer as any }) as CustoComponent<OutProps, Ref>;
	}
	memo() {
		const cloned = this.clone();
		cloned.wrapInMemo = true;
		return cloned;
	}
	catchErrors() {
		const cloned = this.clone();
		cloned.wrapInErrorCatcher = true;
		return cloned;
	}
	as: <AsProps, AsRef = Ref>() => CustoComponent<AsProps, AsRef>  = () => {
		return this as any;
	}
	mergeable(mergeable?: boolean) {
		if (mergeable === undefined || mergeable === true) {
			return this.subtractFlags(CustoComponentFlags.avoidAnyMerging);
		} else if (mergeable === false) {
			return this.addFlags(CustoComponentFlags.avoidAnyMerging);
		}
		return this;
	}
	
	addFlags(...flags: CustoMergeFlag[]) {
		const cloned = this.clone();
		const addictiveFlags = cloned.addictiveFlags ? new Set(cloned.addictiveFlags) : new Set<CustoMergeFlag>();
		unionWith.call(addictiveFlags, flags);
		cloned.addictiveFlags = addictiveFlags;
		return cloned;
	}
	subtractFlags(...flags: CustoMergeFlag[]) {
		const cloned = this.clone();
		const subtractiveFlags = cloned.subtractiveFlags ? new Set(cloned.subtractiveFlags) : new Set<CustoMergeFlag>();
		unionWith.call(subtractiveFlags, flags);
		cloned.subtractiveFlags = subtractiveFlags;
		return cloned;
	}
}

export type OptionalKeys<T, K extends string | number | symbol> = Omit<T, K> &
	Partial<{ [key in K & keyof T]: T[key] }>;

export type ValueOrFn<V, Args extends readonly any[] = []> =
	| V
	| ((...args: Args) => V);


type ComponentPositions = "outerBefore"
			| "outerAfter"
			| "outerWrapper"
			| "outermostWrapper"
			| "innerStart"
			| "innerEnd"
			| "innerWrapper"
			| "innermostWrapper"

export interface CustoComponentOptions<
	InProps extends Record<any, any>,
	OutProps extends Record<any, any> = InProps
> {
	name?: string;
	components?: { [key in ComponentPositions]?: ComponentsOrArray };
	mergeStrategy?: (
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
	flags?: ReadonlySet<CustoMergeFlag>;
	subtractiveFlags?: ReadonlySet<CustoMergeFlag>;
	transformProps?: (inProps: InProps) => OutProps;
	stripPropKeys?: readonly (number | string | symbol)[];
}

type ComponentOrCustComponent<Props> = CustoComponent<{}, unknown> | React.ComponentType<Props>;

export type ComponentsOrArray =
	| ReadonlyArray<ComponentOrCustComponent<{}>>
	| ComponentOrCustComponent<{}>;

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

type MarkKeysOptional<T, K extends keyof T> = Omit<T, K> &
	Partial<{ [key in K]: T[K] }>;
