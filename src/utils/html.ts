import { HTMLProps } from "react";

export const deepMergeHTMLProps = (
	mainProps: React.HTMLProps<any>,
	secondaryProps: React.HTMLProps<any>
): React.HTMLProps<any> => {
	const newProps = { ...mainProps };
	for (const key in secondaryProps) {
		const secondaryVal = secondaryProps[key];
		if (!newProps[key]) {
			newProps[key] = secondaryVal;
			continue;
		}
		if (key === "className") {
			newProps[key] += " " + secondaryVal;
			continue;
		}
		if (key === "style") {
			newProps[key] = {
				...secondaryVal,
				...newProps[key],
			};
		}
		if (
			typeof newProps[key] === "function" &&
			typeof secondaryVal === "function"
		) {
			// function
			const fn1 = newProps[key];
			const fn2 = secondaryVal;
			newProps[key] = (...args: any) => {
				fn1(...args);
				fn2(...args);
			};
		}
	}
	return newProps;
};
