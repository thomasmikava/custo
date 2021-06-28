import { useRef } from "react";
import { CustoHook } from "../hook";
import { HookChangeError, CustoTypeError } from "../../utils/errors";

export function buildCustoHook<Fn extends (...args: any[]) => any>(
	hook: () => CustoHook<Fn>,
	path: string,
	defaultValue?: CustoHook<Fn>
): CustoHook<Fn> {
	return CustoHook.createRawDataHook(
		(...args: Parameters<Fn>): ReturnType<Fn> => {
			const val = useVl(hook(), defaultValue, path);
			const value = val.use(...args);
			const isValueCustoHook = value instanceof CustoHook;
			const isValueCustoHookRef = useRef(isValueCustoHook);
			if (isValueCustoHookRef.current !== isValueCustoHook) {
				isValueCustoHookRef.current = isValueCustoHook;
				throw new HookChangeError(
					"CustoHook must consistently return CustoHook or any value other than CustoHook. (path: " +
						path +
						"). Make sure to wrap your component with WrapInError helper function. Note: CRA still displays error in development mode; just press ESC do hide it"
				);
			}
			return value;
		}
	) as CustoHook<Fn>;
}

const useVl = <Fn extends (...args: any[]) => any>(
	val: CustoHook<Fn> | undefined,
	defaultValue: CustoHook<Fn> | undefined,
	path: string
): CustoHook<Fn> => {
	if (val === undefined && defaultValue !== undefined) {
		val = defaultValue;
	}
	if (!(val instanceof CustoHook)) {
		const oldVal = val;
		const newVal = CustoHook.createFn((() => oldVal) as any);
		val = newVal;
	}
	const dependency =
		val instanceof CustoHook ? val.unsafelyGetOriginalFn() : null;
	const dependencyRef = useRef(dependency);
	if (dependencyRef.current !== dependency) {
		// hook has been changed
		if (!(val instanceof CustoHook) || !val.isSafe) {
			throw new HookChangeError(
				"hook changed in CustoHook. (path: " +
					path +
					"). Make sure to wrap your component with WrapInError helper function. Note: CRA still displays error in development mode; just press ESC do hide it"
			);
		}
	}
	dependencyRef.current = dependency;
	return val;
};
