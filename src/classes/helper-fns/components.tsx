import React, { useRef } from "react";
import { CustoComponent } from "../components";
import { useVersion } from "../../utils/hooks";
import { CustoHook } from "../hook";
import { CustoTypeError } from "../../utils/errors";

export function buildCustoComponent<Props>(
	hook: () => CustoComponent<Props>,
	path: string
): React.ComponentType<Props>;
export function buildCustoComponent<Props>(
	hook: () => CustoHook<(props: Props) => CustoComponent<Props>>,
	path: string
): React.ComponentType<Props>;
export function buildCustoComponent<Props>(
	hook: () =>
		| CustoComponent<Props>
		| CustoHook<(props: Props) => CustoComponent<Props>>,
	path: string
): React.ComponentType<Props> {
	return React.forwardRef(function CustComponentWrapper(
		props: any,
		ref: any
	) {
		const val = hook();
		const valRef = useRef(val);
		valRef.current = val;
		const dependency = val instanceof CustoHook ? val.use : null;
		const key = useVersion(
			dependency,
			val instanceof CustoHook && val.isSafe
		);

		const componentRef = useRef<React.ComponentType<any>>();
		if (!componentRef.current) {
			componentRef.current = React.forwardRef(function WrapperComponent(
				props: any,
				ref: any
			) {
				const val = valRef.current;
				const custComponent =
					val instanceof CustoHook ? val.use(props) : val;
				if (!(custComponent instanceof CustoComponent)) {
					throw new CustoTypeError(
						`expected CustoComponent, got ${custComponent} ${
							path ? " at " + path : ""
						}`
					);
				}

				return custComponent.render({ ...props, ref });
			});
		}

		const Component = componentRef.current;
		return <Component {...props} ref={ref} key={key} />;
	});
}
