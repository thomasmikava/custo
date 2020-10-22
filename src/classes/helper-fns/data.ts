import { useRef } from "react";
import { CustoData } from "../data";
import { CustoHook } from "../hook";
import { HookChangeError, CustoTypeError } from "../../utils/errors";

export type Df<Data, Args extends readonly any[]> =
	| CustoData<Data, Args>
	| CustoHook<(...args: Args) => CustoData<Data, Args>>
	| CustoHook<(...args: Args) => Data>;

export function buildCustoData<Data, HiddenArgs extends readonly any[]>(
	hook: () => CustoData<Data, HiddenArgs>,
	path: string,
	defaultValue?: Df<Data, HiddenArgs>
): CustoHook<(...args: HiddenArgs) => Data>;
export function buildCustoData<Data, Args extends readonly any[]>(
	hook: () => CustoHook<(...args: Args) => CustoData<Data, Args>>,
	path: string,
	defaultValue?: Df<Data, Args>
): CustoHook<(...args: Args) => Data>;
export function buildCustoData<Fn extends (...args: any[]) => any>(
	hook: () => CustoHook<Fn>,
	path: string,
	defaultValue?: Df<ReturnType<Fn>, Parameters<Fn>>
): CustoHook<Fn>;
export function buildCustoData<Data, Args extends readonly any[]>(
	hook: () =>
		| CustoData<Data>
		| CustoHook<(...args: Args) => CustoData<Data, Args>>
		| CustoHook<(...args: Args) => Data>,
	path: string,
	defaultValue?: Df<Data, Args>
): any {
	return CustoHook.createDataHook(
		(...args: Args): Data => {
			let val = hook();
			if (val === undefined && defaultValue !== undefined) {
				val = defaultValue;
			}
			const dependency = val instanceof CustoHook ? val.use : null;
			const dependencyRef = useRef(dependency);
			if (dependencyRef.current !== dependency) {
				// hook has been changed
				if (!(val instanceof CustoHook) || !val.isSafe) {
					throw new HookChangeError(
						`hook changed in CustoDataHook. Make sure to wrap your component with WrapInError helper function. Note: CRA still displays error in development mode; just press ESC do hide it.${
							path ? " Path: " + path : ""
						}`
					);
				}
			}
			dependencyRef.current = dependency;
			if (!(val instanceof CustoHook) && !(val instanceof CustoData)) {
				const newVal = CustoData.create(val);
				val = newVal;
			}
			const data = val instanceof CustoHook ? val.use(...args) : val;
			if (data instanceof CustoData) {
				return data.data;
			}
			return data;
		}
	);
}
