import React, { forwardRef } from "react";
import { HookChangeError } from "../utils/errors";

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
