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
			let val = hook();
			if (val === undefined && defaultValue !== undefined) {
				val = defaultValue;
			}
			if (!(val instanceof CustoHook)) {
				throw new CustoTypeError(
					`Expected CustoHook but got ${val} ${
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
						"hook changed in CustoHook. Make sure to wrap your component with WrapInError helper function. Note: CRA still displays error in development mode; just press ESC do hide it"
					);
				}
			}
			dependencyRef.current = dependency;
			return val.use(...args);
		}
	) as CustoHook<Fn>;
}
