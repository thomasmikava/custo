import { CustoClass, CustoType } from "../interfaces";
import { CustoComponent } from "./components";
import { CustoTextProps, CustoText } from "./texts";

export class CustoHook<Fn extends (...args: any[]) => any>
	implements CustoClass {
	readonly $$end$$: true = true;

	readonly use: Fn;
	readonly type: CustoType = CustoType.component;
	isSafe: boolean;

	private constructor(fn: Fn, type: CustoType, isSafe: boolean) {
		this.use = fn;
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

	static createComponentHook<Props, Data extends CustoComponent<Props>>(
		fn: (props: Props) => Data
	): CustoHook<(props: Props) => Data> {
		return new CustoHook(fn, CustoType.component, false);
	}

	static createComponentFn<Props, Data extends CustoComponent<Props>>(
		fn: (props: Props) => Data
	): CustoHook<(props: Props) => Data> {
		return new CustoHook(fn, CustoType.component, true);
	}

	static createTextHook<Data extends CustoText>(
		fn: (props: CustoTextProps) => Data
	): CustoHook<(props: CustoTextProps) => Data> {
		return new CustoHook(fn, CustoType.text, false);
	}

	static createTextFn<Data extends CustoText>(
		fn: (props: CustoTextProps) => Data
	): CustoHook<(props: CustoTextProps) => Data> {
		return new CustoHook(fn, CustoType.text, true);
	}

	static createDataHook<Data, Args extends readonly any[] = []>(
		fn: (...args: Args) => Data
	): CustoHook<(...args: Args) => Data> {
		return new CustoHook(fn, CustoType.data, false);
	}

	static createDataFn<Data, Args extends readonly any[] = []>(
		fn: (...args: Args) => Data
	): CustoHook<(...args: Args) => Data> {
		return new CustoHook(fn, CustoType.data, true);
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
		return new CustoHook(this.use, this.type, this.isSafe);
	}
}
