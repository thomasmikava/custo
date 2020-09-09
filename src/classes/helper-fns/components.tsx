import React, { useRef } from "react";
import { CustoComponent } from "../components";
import { useVersion } from "../../utils/hooks";
import { CustoHook } from "../hook";
import { CustoTypeError } from "../../utils/errors";

export function buildCustoComponent<Props, Ref = unknown>(
	hook: () => CustoComponent<Props, Ref>,
	path: string,
	defaultValue?: CustoComponent<Props, Ref>
): React.ComponentType<Props>;
export function buildCustoComponent<Props, Ref = unknown>(
	hook: () => CustoHook<(props: Props) => CustoComponent<Props, Ref>>,
	path: string,
	defaultValue?: CustoHook<(props: Props) => CustoComponent<Props, Ref>>
): React.ComponentType<Props>;
export function buildCustoComponent<Props, Ref = unknown>(
	hook: () =>
		| CustoComponent<Props, Ref>
		| CustoHook<(props: Props) => CustoComponent<Props, Ref>>,
	path: string,
	defaultValue?:
		| CustoComponent<Props, Ref>
		| CustoHook<(props: Props) => CustoComponent<Props, Ref>>
): React.ComponentType<Props> {
	return React.forwardRef(function CustComponentWrapper(
		props: any,
		ref: any
	) {
		let val = hook();
		if (val === undefined && defaultValue !== undefined) {
			val = defaultValue;
		}
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
