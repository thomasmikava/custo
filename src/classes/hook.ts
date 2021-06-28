import { CustoClass, CustoType } from "../interfaces";
import { CustoComponent } from "./components";
import { CustoTextProps, CustoText, custoTextInType } from "./texts";
import { CustoData } from "./data";
import { ComponentProps } from "../utils/generics";
import React from "react";

export class CustoHook<Fn extends (...args: any[]) => any>
	implements CustoClass {
	readonly $$end$$: true = true;

	readonly use: Fn;
	readonly transformationFn?: (data: ReturnType<Fn>) => ReturnType<Fn>;
	readonly type: CustoType = CustoType.component;
	isSafe: boolean;
	readonly unsafelyGetOriginalFn: () => Fn;

	private constructor(
		fn: Fn,
		type: CustoType,
		isSafe: boolean,
		transformationFn?: (data: ReturnType<Fn>) => ReturnType<Fn>
	) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const that = this;
		this.transformationFn = transformationFn;
		this.use = function(...args) {
			let returnValue = fn(...args);
			if (that.transformationFn && !(returnValue instanceof CustoHook)) {
				returnValue = that.transformationFn(returnValue);
			}
			while (returnValue instanceof CustoHook) {
				if (!returnValue.isSafe) {
					that.isSafe = false;
				}
				const pass = returnValue.use(...args);
				returnValue = that.transformationFn
					? that.transformationFn(pass)
					: pass;
			}
			return returnValue;
		} as Fn;
		this.type = type;
		this.unsafelyGetOriginalFn = () => fn;
		this.isSafe = isSafe;
	}

	static createHook<Fn extends (...args: any[]) => any>(
		fn: ((...args: Parameters<Fn>) => CustoHook<Fn>) | Fn
	): CustoHook<Fn> {
		return new CustoHook(fn as Fn, CustoType.hook, false);
	}

	static createFn<Fn extends (...args: any[]) => any>(
		fn: ((...args: Parameters<Fn>) => CustoHook<Fn>) | Fn
	): CustoHook<Fn> {
		return new CustoHook(fn as Fn, CustoType.hook, true);
	}

	static createHookOfHook<
		Params extends readonly any[],
		Fn extends (...args: Params) => CustoHook<(...args: Params) => any>
	>(fn: Fn): ReturnType<Fn>;
	static createHookOfHook<
		Params extends readonly any[],
		Fn extends (...args: Params) => (...args: Params) => any
	>(fn: Fn): CustoHook<Fn>;
	static createHookOfHook<
		Params extends readonly any[],
		Fn extends (
			...args: Params
		) => ((...args: Params) => any) | CustoHook<(...args: Params) => any>
	>(fn: Fn): EnsureCustoHook<ReturnType<Fn>> {
		return new CustoHook(fn, CustoType.hook, false) as any;
	}

	static createHookOfFn<
		Params extends readonly any[],
		Fn extends (...args: Params) => CustoHook<(...args: Params) => any>
	>(fn: Fn): ReturnType<Fn>;
	static createHookOfFn<
		Params extends readonly any[],
		Fn extends (...args: Params) => (...args: Params) => any
	>(fn: Fn): CustoHook<Fn>;
	static createHookOfFn<
		Params extends readonly any[],
		Fn extends (
			...args: Params
		) => ((...args: Params) => any) | CustoHook<(...args: Params) => any>
	>(fn: Fn): EnsureCustoHook<ReturnType<Fn>> {
		return new CustoHook(fn, CustoType.hook, false) as any;
	}

	static createFnOfHook<
		Params extends readonly any[],
		Fn extends (...args: Params) => CustoHook<(...args: Params) => any>
	>(fn: Fn): ReturnType<Fn>;
	static createFnOfHook<
		Params extends readonly any[],
		Fn extends (...args: Params) => (...args: Params) => any
	>(fn: Fn): CustoHook<Fn>;
	static createFnOfHook<
		Params extends readonly any[],
		Fn extends (
			...args: Params
		) => ((...args: Params) => any) | CustoHook<(...args: Params) => any>
	>(fn: Fn): EnsureCustoHook<ReturnType<Fn>> {
		return new CustoHook(fn, CustoType.hook, true) as any;
	}

	static createFnOfFn<
		Params extends readonly any[],
		Fn extends (...args: Params) => CustoHook<(...args: Params) => any>
	>(fn: Fn): ReturnType<Fn>;
	static createFnOfFn<
		Params extends readonly any[],
		Fn extends (...args: Params) => (...args: Params) => any
	>(fn: Fn): CustoHook<Fn>;
	static createFnOfFn<
		Params extends readonly any[],
		Fn extends (
			...args: Params
		) => ((...args: Params) => any) | CustoHook<(...args: Params) => any>
	>(fn: Fn): EnsureCustoHook<ReturnType<Fn>> {
		return new CustoHook(fn, CustoType.hook, true) as any;
	}

	static createComponentHook<Props>(
		fn: (
			props: Props
		) =>
			| CustoComponent<Props, unknown>
			| React.ComponentType<Props>
			| CustoHook<(props: Props) => CustoComponent<Props, unknown>>
	): CustoHook<(props: Props) => CustoComponent<Props, unknown>>;
	static createComponentHook<Data extends React.ComponentType<any>>(
		fn: (
			props: ComponentProps<Data>
		) =>
			| Data
			| CustoHook<
					(
						props: ComponentProps<Data>
					) => CustoComponent<ComponentProps<Data>, unknown>
			  >
	): CustoHook<
		(props: ComponentProps<Data>) => CustoComponent<ComponentProps<Data>>
	>;
	static createComponentHook<Props, Data extends any>(
		fn: (props: Props) => Data
	): CustoHook<(props: Props) => Data> {
		return new CustoHook(
			fn,
			CustoType.component,
			false,
			ensureComponent as any
		);
	}
	static createComponentFn<Props>(
		fn: (
			props: Props
		) =>
			| CustoComponent<Props, unknown>
			| React.ComponentType<Props>
			| CustoHook<(props: Props) => CustoComponent<Props, unknown>>
	): CustoHook<(props: Props) => CustoComponent<Props, unknown>>;
	static createComponentFn<Data extends React.ComponentType<any>>(
		fn: (
			props: ComponentProps<Data>
		) =>
			| Data
			| CustoHook<
					(
						props: ComponentProps<Data>
					) => CustoComponent<ComponentProps<Data>, unknown>
			  >
	): CustoHook<
		(props: ComponentProps<Data>) => CustoComponent<ComponentProps<Data>>
	>;
	static createComponentFn<Props, Data extends any>(
		fn: (props: Props) => Data
	): CustoHook<(props: Props) => Data> {
		return new CustoHook(
			fn,
			CustoType.component,
			true,
			ensureComponent as any
		);
	}

	static createTextHook<Data extends CustoText>(
		fn: (
			props: CustoTextProps
		) => Data | CustoHook<(props: CustoTextProps) => Data>
	): CustoHook<(props: CustoTextProps) => Data>;
	static createTextHook<Data extends custoTextInType>(
		fn: (
			props: CustoTextProps
		) => Data | CustoHook<(props: CustoTextProps) => Data>
	): CustoHook<(props: CustoTextProps) => CustoText>;
	static createTextHook<Data extends custoTextInType | CustoText>(
		fn: (
			props: CustoTextProps
		) => Data | CustoHook<(props: CustoTextProps) => Data>
	): CustoHook<(props: CustoTextProps) => Data | CustoText> {
		return new CustoHook(
			fn as (props: CustoTextProps) => Data,
			CustoType.text,
			false,
			ensureCustoText as any
		);
	}

	static createTextFn<Data extends CustoText>(
		fn: (
			props: CustoTextProps
		) => Data | CustoHook<(props: CustoTextProps) => Data>
	): CustoHook<(props: CustoTextProps) => Data>;
	static createTextFn<Data extends custoTextInType>(
		fn: (
			props: CustoTextProps
		) => Data | CustoHook<(props: CustoTextProps) => Data>
	): CustoHook<(props: CustoTextProps) => CustoText>;
	static createTextFn<Data extends custoTextInType | CustoText>(
		fn: (
			props: CustoTextProps
		) => Data | CustoHook<(props: CustoTextProps) => Data>
	): CustoHook<(props: CustoTextProps) => Data | CustoText> {
		return new CustoHook(
			fn as (props: CustoTextProps) => Data,
			CustoType.text,
			true,
			ensureCustoText as any
		);
	}

	static createDataHook<Data, Args extends readonly any[] = []>(
		fn: (
			...args: Args
		) => CustoData<Data, any> | CustoHook<(...args: Args) => Data>
	): CustoHook<(...args: Args) => Data>;
	static createDataHook<Data, Args extends readonly any[] = []>(
		fn: (...args: Args) => Data
	): CustoHook<(...args: Args) => Data>;
	static createDataHook(
		fn: (...args: any) => any
	): CustoHook<(...args: any) => any> {
		return new CustoHook(fn, CustoType.data, false, ensureCustoData);
	}

	static createDataFn<Data, Args extends readonly any[] = []>(
		fn: (
			...args: Args
		) => CustoData<Data, any> | CustoHook<(...args: Args) => Data>
	): CustoHook<(...args: Args) => Data>;
	static createDataFn<Data, Args extends readonly any[] = []>(
		fn: (...args: Args) => Data
	): CustoHook<(...args: Args) => Data>;
	static createDataFn(
		fn: (...args: any) => any
	): CustoHook<(...args: any) => any> {
		return new CustoHook(fn, CustoType.data, true, ensureCustoData);
	}

	static createRawDataHook<Data, Args extends readonly any[] = []>(
		fn: (...args: Args) => Data
	): CustoHook<(...args: Args) => Data> {
		return new CustoHook(fn, CustoType.data, false);
	}

	getFuncVersion(): CustoHook<Fn> {
		const comp = this.clone();
		comp.isSafe = true;
		return comp;
	}

	getHookVersion(): CustoHook<Fn> {
		const comp = this.clone();
		comp.isSafe = false;
		return comp;
	}

	clone(): CustoHook<Fn> {
		return new CustoHook(
			this.use,
			this.type,
			this.isSafe,
			this.transformationFn
		);
	}
}

function ensureCustoData<Data>(
	data: Data
): Data extends CustoData<infer D, any> ? D : Data {
	if (data instanceof CustoData) {
		return data.data as any;
	}
	return data as any;
}
function ensureCustoText<Data>(
	data: Data
): Data extends CustoText ? Data : CustoText {
	if (data instanceof CustoText) {
		return data as any;
	}
	return CustoText.create(data as any) as any;
}

function ensureComponent<Data>(
	data: Data
): Data extends CustoComponent<any> ? Data : CustoComponent<any> {
	if (data instanceof CustoComponent) {
		return data as any;
	}
	return CustoComponent.create(data as any) as any;
}

export type EnsureCustoHook<
	Data extends CustoHook<(...args: any[]) => any> | ((...args: any[]) => any)
> = Data extends CustoHook<(...args: any[]) => any>
	? Data
	: Data extends (...args: any[]) => any
	? CustoHook<Data>
	: never;
