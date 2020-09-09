import { CustoClass, CustoType } from "../interfaces";
import { CustoComponent } from "./components";
import { CustoTextProps, CustoText, custoTextInType } from "./texts";
import { CustoData } from "./data";
import { ComponentProps, CustoComponentProps } from "../utils/generics";

export class CustoHook<Fn extends (...args: any[]) => any>
	implements CustoClass {
	readonly $$end$$: true = true;

	readonly use: Fn;
	readonly transformationFn?: (data: ReturnType<Fn>) => ReturnType<Fn>;
	readonly type: CustoType = CustoType.component;
	isSafe: boolean;

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
			const returnValue = fn(...args);
			if (that.transformationFn) {
				return that.transformationFn(returnValue);
			}
			return returnValue;
		} as Fn;
		this.type = type;
		this.isSafe = isSafe;
	}

	static createHook<Fn extends (...args: any[]) => any>(
		fn: Fn
	): CustoHook<Fn> {
		return new CustoHook(fn, CustoType.hook, false);
	}

	static createFn<Fn extends (...args: any[]) => any>(fn: Fn): CustoHook<Fn> {
		return new CustoHook(fn, CustoType.hook, true);
	}

	static createComponentHook<Props>(
		fn: (
			props: Props
		) => CustoComponent<Props, unknown> | React.ComponentType<Props>
	): CustoHook<(props: Props) => CustoComponent<Props, unknown>>;
	static createComponentHook<Data extends React.ComponentType<any>>(
		fn: (props: ComponentProps<Data>) => Data
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
		) => CustoComponent<Props, unknown> | React.ComponentType<Props>
	): CustoHook<(props: Props) => CustoComponent<Props, unknown>>;
	static createComponentFn<Data extends React.ComponentType<any>>(
		fn: (props: ComponentProps<Data>) => Data
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
		fn: (props: CustoTextProps) => Data
	): CustoHook<(props: CustoTextProps) => Data>;
	static createTextHook<Data extends custoTextInType>(
		fn: (props: CustoTextProps) => Data
	): CustoHook<(props: CustoTextProps) => CustoText>;
	static createTextHook<Data extends custoTextInType | CustoText>(
		fn: (props: CustoTextProps) => Data
	): CustoHook<(props: CustoTextProps) => Data | CustoText> {
		return new CustoHook(fn, CustoType.text, false, ensureCustoText as any);
	}

	static createTextFn<Data extends CustoText>(
		fn: (props: CustoTextProps) => Data
	): CustoHook<(props: CustoTextProps) => Data>;
	static createTextFn<Data extends custoTextInType>(
		fn: (props: CustoTextProps) => Data
	): CustoHook<(props: CustoTextProps) => CustoText>;
	static createTextFn<Data extends custoTextInType | CustoText>(
		fn: (props: CustoTextProps) => Data
	): CustoHook<(props: CustoTextProps) => Data | CustoText> {
		return new CustoHook(fn, CustoType.text, true, ensureCustoText as any);
	}

	static createDataHook<Data, Args extends readonly any[] = []>(
		fn: (...args: Args) => CustoData<Data, any>
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
		fn: (...args: Args) => CustoData<Data, any>
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

type inferProps<Data> = Data extends React.ComponentType<infer Props>
	? Props
	: never;
