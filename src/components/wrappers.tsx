import React, { ComponentProps, forwardRef } from "react";
import { HookChangeError } from "../utils/errors";
import { ComponentRef } from "../utils/generics";

export const CreateHookInjection = <
	MinProps extends {},
	ReturnedProps extends {}
>(
	hook: (props: MinProps) => ReturnedProps,
	...Wrappers: ((
		props: Omit<MinProps & ReturnedProps, "children"> & {
			children: JSX.Element;
		}
	) => JSX.Element | null)[]
): (<Comp extends React.ComponentType<MinProps & ReturnedProps>>(
	Component: Comp
) => React.ForwardRefExoticComponent<
	Omit<ComponentProps<Comp>, keyof ReturnedProps> &
		React.RefAttributes<ComponentRef<Comp>>
>) => {
	return <Comp extends React.ComponentType<MinProps & ReturnedProps>>(
		Component: Comp
	) => {
		type P = ComponentProps<Comp>;
		type Props = Omit<P, keyof ReturnedProps>;
		function HookWrapper(props: Props, ref) {
			const extraProps = hook(props as P);
			const AllProps = { ...props, ...extraProps, ref } as any;

			let rendered = <Component {...AllProps} />;
			for (let i = Wrappers.length - 1; i >= 0; --i) {
				const Wrapper = Wrappers[i];
				rendered = <Wrapper {...AllProps} children={rendered} />;
			}

			return rendered;
		}

		const useConnectedComponent = React.forwardRef<
			ComponentProps<Comp>,
			Props
		>(HookWrapper);
		return useConnectedComponent as any;
	};
};

export const InjectHook = <
	Props extends Record<any, any>,
	Comp extends React.ComponentType<Props>,
	K extends keyof Props
>(
	Component: Comp,
	hook: (props: Props) => Pick<Props, K>,
	...Wrappers: ((
		props: Omit<Props, "children"> & {
			children: JSX.Element;
		}
	) => JSX.Element | null)[]
) => {
	return CreateHookInjection(hook, ...Wrappers)(Component);
};

export const WrapInCustHookChangeError = <P extends Record<any, any>>(
	Component: React.ComponentType<P>
): React.FC<P> => {
	class HookChangeBoundary extends React.Component<
		P & { __$__ref: any },
		{ key: number }
	> {
		state = { key: 0 };

		componentDidCatch = (error, info) => {
			if (!(error instanceof HookChangeError)) {
				throw error;
			}
			error.hasBeenCaught = true;
			this.setState(({ key }) => ({
				key: key + 1,
			}));
		};

		render() {
			const { __$__ref, ...restProps } = this.props;
			return (
				<Component
					{...this.props}
					key={this.state.key}
					ref={__$__ref}
				/>
			);
		}
	}
	return forwardRef((props: P, ref) => (
		<HookChangeBoundary {...props} __$__ref={ref} />
	)) as any;
};
