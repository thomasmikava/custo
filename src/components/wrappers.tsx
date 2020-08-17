import React from "react";
import { HookChangeError } from "../utils/errors";

export const InjectHook = <P extends {}, K extends keyof P>(
	Component: React.ComponentType<P>,
	hook: (props: P) => Pick<P, K>
) => {
	type Props = Omit<P, K>;
	const useConnectedComponent = React.forwardRef<
		React.ComponentType<Props>,
		Props
	>(function RemountableWrapper(props: Props, ref) {
		const extraProps = hook(props as P);
		const AllProps = { ...props, ...extraProps };

		return <Component {...(AllProps as any)} ref={ref} />;
	});
	return useConnectedComponent;
};

export const WrapInCustHookChangeError = <P extends Record<any, any>>(
	Component: React.ComponentType<P>
): React.ComponentType<P> => {
	class HookChangeBoundary extends React.Component<P, { key: number }> {
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

		// TODO: do something about refs
		render() {
			return <Component {...this.props} key={this.state.key} />;
		}
	}
	return HookChangeBoundary;
};
