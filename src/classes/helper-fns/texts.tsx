import React, { useRef } from "react";
import { useDepsVersion, useVersion } from "../../utils/hooks";
import { CustoHook } from "../hook";
import { CustoText, CustoTextProps } from "../texts";

type richtext = string | number | null | JSX.Element;

export function buildCustoText<Props extends CustoTextProps>(
	hook: () =>
		| CustoText<Props>
		| CustoHook<(props: Props) => CustoText<Props>>,
	getTextTransformationHook?: () => CustoHook<(oldText: richtext) => richtext>
): React.ComponentType<Props> {
	return React.forwardRef(function CustComponentWrapper(
		props: any,
		ref: any
	) {
		const val = hook();
		const valRef = useRef(val);
		const transformationHook =
			getTextTransformationHook && getTextTransformationHook();
		const transformationHookRef = useRef(transformationHook);
		valRef.current = val;
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

		const componentRef = useRef<React.ComponentType<any>>();
		if (!componentRef.current) {
			componentRef.current = React.forwardRef(function WrapperComponent(
				props: any,
				ref: any
			) {
				const val = valRef.current;
				const custComponent =
					val instanceof CustoHook ? val.use(props) : val;

				return custComponent.render(
					{ ...props, ref },
					transformationHookRef.current?.use
				) as any;
			});
		}

		const Component = componentRef.current;
		return <Component {...props} ref={ref} key={key} />;
	}) as any;
}
