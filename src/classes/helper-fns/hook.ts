import { useRef } from "react";
import { CustoHook } from "../hook";
import { HookChangeError, CustoTypeError } from "../../utils/errors";

export function buildCustoHook<Fn extends (...args: any[]) => any>(
	hook: () => CustoHook<Fn>,
	path: string
): CustoHook<Fn> {
	return CustoHook.createDataHook(
		(...args: Parameters<Fn>): ReturnType<Fn> => {
			const val = hook();
			if (!(val instanceof CustoHook)) {
				throw new CustoTypeError(
					`Expected CustomizableDataHook or CustomizableData but got ${val} ${
						path ? " at " + path : ""
					}`
				);
			}
			const dependency = val.use;
			const dependencyRef = useRef(dependency);
			if (dependencyRef.current !== dependency) {
				// hook has been changed
				if (!val.isSafe) {
					throw new HookChangeError(
						"hook changed in CustomizableDataHook. Make sure to wrap your component with WrapInError helper function. Note: CRA still displays error in development mode; just press ESC do hide it"
					);
				}
			}
			dependencyRef.current = dependency;
			return val.use(...args);
		}
	) as CustoHook<Fn>;
}
