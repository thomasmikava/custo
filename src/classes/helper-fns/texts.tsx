import React, { useRef } from "react";
import { useDepsVersion, useVersion } from "../../utils/hooks";
import { CustoHook } from "../hook";
import {
	CustoText,
	CustoTextProps,
	custoTextInType,
	custoTextOutType,
} from "../texts";
import { HookChangeError } from "../../utils/errors";

export function buildCustoText<Props extends CustoTextProps>(
	hook: () =>
		| CustoText<Props>
		| CustoHook<(props: Props) => CustoText<Props>>,
	getTextTransformationHook:
		| (() => CustoHook<(oldText: custoTextInType) => custoTextInType>)
		| undefined,
	path: string,
	defaultValue?:
		| CustoText<Props>
		| CustoHook<(props: Props) => CustoText<Props>>
): CustoTextComponent<Props> {
	const useVal = () => {
		let val = hook();
		if (val === undefined && defaultValue !== undefined) {
			val = defaultValue;
		}
		return val;
	};
	const comp = (React.forwardRef(function CustComponentWrapper(
		props: any,
		ref: any
	) {
		const val = useVal();
		const valRef = useRef(val);
		const transformationHook =
			getTextTransformationHook && getTextTransformationHook();
		const transformationHookRef = useRef(transformationHook);
		valRef.current = val;
		const dep1 =
			val instanceof CustoHook ? val.unsafelyGetOriginalFn() : null;
		const dep2 =
			transformationHook instanceof CustoHook
				? transformationHook.unsafelyGetOriginalFn()
				: null;
		const key = useDepsVersion([
			useVersion(dep1, val instanceof CustoHook && val.isSafe),
			useVersion(
				dep2,
				transformationHook instanceof CustoHook &&
					transformationHook.isSafe
			),
		]);

		const componentRef = useRef<React.ComponentType<any>>();
		if (!componentRef.current) {
			function WrapperComponent(props: any, ref: any) {
				const val = valRef.current;
				let custComponent =
					val instanceof CustoHook ? val.use(props) : val;

				if (!(custComponent instanceof CustoText)) {
					const newVal = CustoText.create(val as any);
					custComponent = newVal;
				}

				return custComponent.render(
					{ ...props, ref },
					transformationHookRef.current?.use
				) as any;
			}
			(WrapperComponent as any).displayName = "CustoText-" + path;
			componentRef.current = React.forwardRef(WrapperComponent);
		}

		const Component = componentRef.current;
		return <Component {...props} ref={ref} key={key} />;
	}) as any) as CustoTextComponent<Props>;
	comp.useRawValue = () => {
		const val = useVal();
		const dependency = val instanceof CustoHook ? val.use : null;
		const dependencyRef = useRef(dependency);
		if (dependencyRef.current !== dependency) {
			// hook has been changed
			if (!(val instanceof CustoHook) || !val.isSafe) {
				throw new HookChangeError(
					"hook changed in CustoHook (path: " +
						path +
						"). Make sure to wrap your component with WrapInError helper function. Note: CRA still displays error in development mode; just press ESC do hide it"
				);
			}
		}
		dependencyRef.current = dependency;
		const custComponent =
			val instanceof CustoHook
				? val.use(({
						disableTextTransformer: true,
				  } as CustoTextProps) as any)
				: val instanceof CustoText
				? val
				: CustoText.create(val);
		return custComponent.getRaw();
	};
	comp.useValue = () => {
		const val = useVal();
		const transformationHook =
			getTextTransformationHook && getTextTransformationHook();
		const dep1 = val instanceof CustoHook ? val.use : null;
		const dep2 =
			transformationHook instanceof CustoHook
				? transformationHook.use
				: null;
		const key = useDepsVersion([
			useVersion(dep1, val instanceof CustoHook && val.isSafe),
			useVersion(
				dep2,
				transformationHook instanceof CustoHook &&
					transformationHook.isSafe
			),
		]);
		const dependencyRef = useRef(key);
		if (dependencyRef.current !== key) {
			throw new HookChangeError(
				"hook changed in CustoHook (path: " +
					path +
					"). Make sure to wrap your component with WrapInError helper function. Note: CRA still displays error in development mode; just press ESC do hide it"
			);
		}
		dependencyRef.current = key;
		const custComponent =
			val instanceof CustoHook
				? val.use(({
						disableTextTransformer: true,
				  } as CustoTextProps) as any)
				: val instanceof CustoText
				? val
				: CustoText.create(val);
		return custComponent.useTransformed({}, transformationHook?.use);
	};
	return comp;
}

export type CustoTextComponent<
	Props extends CustoTextProps
> = React.ForwardRefRenderFunction<unknown, Props> & {
	useRawValue: () => custoTextInType;
	useValue: () => custoTextOutType;
};
