import React, { useRef } from "react";
import { useVersion } from "../../utils/hooks";
import { CustoComponent } from "../components";
import { CustoHook } from "../hook";

export type CustoComponentRenderer<Props, Ref> =
  React.ForwardRefExoticComponent<
    React.PropsWithoutRef<Props> & React.RefAttributes<Ref>
  >;

export function buildCustoComponent<
  Props extends Record<any, any>,
  Ref = unknown,
>(
  hook: () =>
    | CustoComponent<Props, Ref>
    | CustoHook<(props: Props) => CustoComponent<Props, Ref>>,
  path: string,
  defaultValue?:
    | CustoComponent<Props, Ref>
    | CustoHook<(props: Props) => CustoComponent<Props, Ref>>
): CustoComponentRenderer<Props, Ref> {
  return React.forwardRef<Ref, Props>(function CustComponentWrapper(
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
    const key = useVersion(dependency, val instanceof CustoHook && val.isSafe);

    const componentRef = useRef<React.ComponentType<any> | undefined>(
      undefined
    );
    if (!componentRef.current) {
      function WrapperComponent(props: any, ref: any) {
        const val = valRef.current;
        let custComponent = val instanceof CustoHook ? val.use(props) : val;
        if (!(custComponent instanceof CustoComponent)) {
          const newVal = CustoComponent.create<Props>(val as any);
          custComponent = newVal;
        }

        return custComponent.render({ ...props, ref });
      }
      (WrapperComponent as any).displayName = `CustoComp-${path}`;
      componentRef.current = React.forwardRef(WrapperComponent);
    }

    const Component = componentRef.current;
    return <Component {...props} ref={ref} key={key} />;
  });
}
