import { useRef } from "react";
import { CustoData } from "../data";
import { CustoHook } from "../hook";
import { HookChangeError, CustoTypeError } from "../../utils/errors";

export function buildCustoData<Data, HiddenArgs extends readonly any[]>(
	hook: () => CustoData<Data, HiddenArgs>,
	path: string
): CustoHook<(...args: HiddenArgs) => Data>;
export function buildCustoData<Data, Args extends readonly any[]>(
	hook: () => CustoHook<(...args: Args) => CustoData<Data, Args>>,
	path: string
): CustoHook<(...args: Args) => Data>;
export function buildCustoData<Fn extends (...args: any[]) => any>(
	hook: () => CustoHook<Fn>,
	path: string
): CustoHook<Fn>;
export function buildCustoData<Data, Args extends readonly any[]>(
	hook: () =>
		| CustoData<Data>
		| CustoHook<(...args: Args) => CustoData<Data, Args>>
		| CustoHook<(...args: Args) => Data>,
	path: string
): any {
	return CustoHook.createDataHook(
		(...args: Args): Data => {
			const val = hook();
			const dependency = val instanceof CustoHook ? val.use : null;
			const dependencyRef = useRef(dependency);
			if (dependencyRef.current !== dependency) {
				// hook has been changed
				if (!(val instanceof CustoHook) || !val.isSafe) {
					throw new HookChangeError(
						`hook changed in CustomizableDataHook. Make sure to wrap your component with WrapInError helper function. Note: CRA still displays error in development mode; just press ESC do hide it.${
							path ? " Path: " + path : ""
						}`
					);
				}
			}
			dependencyRef.current = dependency;
			if (!(val instanceof CustoHook) && !(val instanceof CustoData)) {
				throw new CustoTypeError(
					`Expected CustomizableDataHook or CustomizableData but got ${val} ${
						path ? " at " + path : ""
					}`
				);
			}
			let data = val instanceof CustoHook ? val.use(...args) : val.data;
			if (val instanceof CustoHook && data instanceof CustoData) {
				data = data.data;
			}
			return data as any;
		}
	);
}
