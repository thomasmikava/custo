import React, { useRef } from "react";
import { CustoComponent } from "../components";
import { useVersion } from "../../utils/hooks";
import { CustoHook } from "../hook";

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
		const dependency =
			val instanceof CustoHook ? val.unsafelyGetOriginalFn() : null;
		const key = useVersion(
			dependency,
			val instanceof CustoHook && val.isSafe
		);

		const componentRef = useRef<React.ComponentType<any>>();
		if (!componentRef.current) {
			function WrapperComponent(props: any, ref: any) {
				const val = valRef.current;
				let custComponent =
					val instanceof CustoHook ? val.use(props) : val;
				if (!(custComponent instanceof CustoComponent)) {
					const newVal = CustoComponent.create<Props>(val as any);
					custComponent = newVal;
				}

				return custComponent.render({ ...props, ref });
			}
			(WrapperComponent as any).displayName = "CustoComp-" + path;
			componentRef.current = React.forwardRef(WrapperComponent);
		}

		const Component = componentRef.current;
		return <Component {...props} ref={ref} key={key} />;
	});
}
