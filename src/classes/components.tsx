import React, { HTMLProps } from "react";
import { CustoClass, NormProps } from "../interfaces";
import { deepMergeHTMLProps } from "../utils/html";
import {
	CustoComponentFlags,
	custoMergeFlags,
	CustoMergeFlag,
} from "../flags";
import { removeKeys, removeUndefinedValues } from "../utils/objects";
import { unionWith, subtractSet } from "../utils/set";
import { pickHTMLProps } from "react-sanitize-dom-props";
import { WrapInCustHookChangeError } from "../components/wrappers";

export class CustoComponent<Props extends Record<any, any>, Ref = unknown>
	implements CustoClass {
	public component: React.ComponentType<any> | string | null;
	private defaultProps: (props: Props) => Partial<Props>;
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
	private wrapInErrorCatcher?: boolean;
	private wrapInMemo?: boolean;
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
	private positioningComponents: { readonly [key in ComponentPositions]?: ReadonlyArray<ComponentOrCustComponent<{}>> };
	private transformPropsFn: (inProps: Props) => Record<any, any> = (props) => props;
	/* eslint-enable */

	private constructor(
		comp: React.ComponentType<any> | string | null,
		defaultProps?: ValueOrFn<Partial<Props>, [any]> | null,
		config?: CustoComponentOptions<Props>
	) {
		this.positioningComponents = {};
		this.component = comp;
		this.defaultProps = typeof defaultProps === "function" ? defaultProps : () => (defaultProps || {});
		this.applyConfig(config || {}, true);
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

	private renderHelper(props: Props) {
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

		let children = toArray(initialChildren || []);
		
		if (this.positioningComponents.innermostWrapper) {
			let innerComp = React.createElement(React.Fragment, {}, ...children);
			innerComp = wrapInComps(innerComp, ...this.getComponentsArr("innermostWrapper"));
			children = [innerComp];
		}
		if (
			this.positioningComponents.innerStart ||
			this.positioningComponents.innerEnd
		) {
			children = this.getComponentsArr("innerStart")
				.map(renderMap)
				.concat(children)
				.concat(this.getComponentsArr("innerEnd").map(renderMap));
		}
		if (this.positioningComponents.innerWrapper) {
			let innerComp = React.createElement(React.Fragment, {}, ...children);
			innerComp = wrapInComps(innerComp, ...this.getComponentsArr("innerWrapper"));
			children = [innerComp];
		}

		let mainElement = React.createElement(
			this.component as any,
			{ ...finalProps, ref },
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

	private memoizedRenderer?: (props: Props) => JSX.Element;

	get render(): (props: Props) => JSX.Element {
		if (this.memoizedRenderer) return this.memoizedRenderer;
		if (!this.wrapInMemo && !this.wrapInErrorCatcher) {
			return this.memoizedRenderer = this.renderHelper;
		}

		let CustoComp: React.ComponentType<Props> = React.forwardRef((props: Props, ref) => {
			return this.renderHelper({ ...props, ref });
		}) as any;
		if (this.wrapInErrorCatcher) {
			CustoComp = WrapInCustHookChangeError(CustoComp);
		}
		if (this.wrapInMemo) {
			CustoComp = React.memo(CustoComp);
		}

		return this.memoizedRenderer = (props) => React.createElement(CustoComp, props);
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


			let mergedProps: ValueOrFn<Partial<Props>, [Props]> | undefined = undefined;
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
				mergedProps = mergeValueOrFn(
					this.defaultProps,
					cl.defaultProps,
					normalizedPropsMergeStrategy
				);
			} else if (
				typeof component === "string" &&
				typeof cl.component === "string"
			) {
				mergedProps = mergeValueOrFn(
					this.defaultProps,
					cl.defaultProps,
					deepMergeHTMLProps
				);
			} else if (component !== this.component) {
				mergedProps = this.defaultProps;
			}
			if (mergedProps) {				
				const config = mergeConfigs(this.cloneConfig(), cl.cloneConfig());
				return new CustoComponent(
					component,
					mergedProps,
					config
				);
			}
			return this;
		} catch (e) {
			return this;
		}
	}

	private getMergedProps(props: Props) {
		const defaultProps = this.defaultProps(props as Props);
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
		cloned.positioningComponents = {...cloned.positioningComponents, [place]: arr};
		return cloned;
	}

	private getComponentsArr(
		place: ComponentPositions
	): ReadonlyArray<ComponentOrCustComponent<{}>> {
		return this.positioningComponents[place] || [];
	}

	clone(): CustoComponent<Props, Ref> {
		return new CustoComponent(
			this.component,
			this.defaultProps,
			this.cloneConfig()
		);
	}

	private cloneConfig(): CustoComponentOptions<any> {
		return {
			name: this.name,
			components: this.positioningComponents,
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
		let component = new CustoComponent(
			comp,
			defaultProps,
			additionalOptions
		);
		if (comp === null) {
			component = component.mergeable();
		}
		return component;
	}

	props<PassedProps extends Partial<Props>>(props: PassedProps | ((props: Props) => PassedProps)): CustoComponent<MarkKeysOptional<Props, keyof PassedProps>, Ref> {
		const cloned = this.clone();
		let mergeStrategy = (primary: Partial<Props>, secondary: Partial<Props>) => Object.assign({}, secondary, primary);
		if (typeof this.component === "string") {
			mergeStrategy = deepMergeHTMLProps as any;
		}
		const primaryProps = typeof props === "function" ? props : () => props;
		const secondaryProps = cloned.defaultProps;
		cloned.defaultProps = mergeValueOrFn(primaryProps, secondaryProps, mergeStrategy);
		return cloned as any;
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
	components?: PositionalComponents;
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

export type PositionalComponents<Props = {}> = { [key in ComponentPositions]?: ReadonlyArray<ComponentOrCustComponent<Props>> };

type ComponentOrCustComponent<Props> = CustoComponent<Props, unknown> | React.ComponentType<Props>;

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
	mergeFn: (first: K, second: K) => K = (first, second) => ({ ...first, ...second })
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

const renderMap = (e: ComponentOrCustComponent<{}>, i: number) => {
	return render(e, { key: i });
};
const wrapInComps = (
	comp: JSX.Element,
	...wrappers: ComponentOrCustComponent<{}>[]
) => {
	let result = comp;
	for (let i = wrappers.length - 1; i >= 0; i--) {
		const wrapper = wrappers[i];
		result = render(wrapper, ({ children: result }));
	}
	return result;
};
const render = <Props extends any>(comp: ComponentOrCustComponent<Props>, props: Props) => {
	if (comp instanceof CustoComponent) {
		return comp.render(props);
	}
	return React.createElement(comp as any, props as any);
}

type MarkKeysOptional<T, K extends keyof T> = Omit<T, K> &
	Partial<{ [key in K]: T[K] }>;


	
const mergeConfigs = (primaryConfig: CustoComponentOptions<any, any>, secondaryConfig: CustoComponentOptions<any, any>): CustoComponentOptions<any, any> => {
	return {
		...removeUndefinedValues(secondaryConfig),
		...removeUndefinedValues(primaryConfig),
		components: mergeComponents(primaryConfig.components, secondaryConfig.components),
		flags: mergeTwoSets(primaryConfig.flags, secondaryConfig.flags),
		subtractiveFlags: mergeTwoSets(primaryConfig.subtractiveFlags, secondaryConfig.subtractiveFlags),
		stripPropKeys: mergeTwoArrays(primaryConfig.stripPropKeys, secondaryConfig.stripPropKeys),
	};
}
const mergeTwoSets = <T extends any>(primary: ReadonlySet<T> | undefined, secondary: ReadonlySet<T> | undefined): Set<T> | undefined => {
	if (!primary || !secondary) return (primary || secondary) as Set<T> | undefined;
	return unionWith.call(new Set(primary), secondary) as Set<T>;
}
const mergeTwoArrays = <T extends any>(primary: ReadonlyArray<T> | undefined, secondary: ReadonlyArray<T> | undefined): Array<T> | undefined => {
	if (!primary || !secondary) return (primary || secondary) as T[] | undefined;
	return [...primary, ...secondary];
}
const mergeComponents = (primary: PositionalComponents | undefined, secondary: PositionalComponents | undefined): PositionalComponents | undefined => {
	if (!primary || !secondary) return (primary || secondary);
	const allKeys = unionWith.call(new Set(Object.keys(primary)), Object.keys(secondary)) as Set<ComponentPositions>;
	const newComponents: PositionalComponents = {};
	for (const key of allKeys) {
		const value1 = primary[key];
		const value2 = secondary[key];
		if (!value1 || !value2) {
			newComponents[key] = value1 || value2;
		} else {
			const primaryShouldGoFirst = key === "outerBefore" || key === "innerStart" || key === "outermostWrapper" || key === "outerWrapper" || key === "innerWrapper" || key === "innermostWrapper";
			newComponents[key] = primaryShouldGoFirst ? mergeTwoArrays(value1, value2) : mergeTwoArrays(value2, value1);
		}
	}
	return newComponents;
}
