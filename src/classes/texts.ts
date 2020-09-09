import { CustoClass } from "../interfaces";
import { CustoTypeError } from "../utils/errors";

export type custoTextInType = string | number | null | JSX.Element;
export type custoTextOutType = string | number | null | JSX.Element;

export class CustoText<Props extends CustoTextProps = CustoTextProps>
	implements CustoClass {
	private readonly text: custoTextInType;
	readonly $$end$$: true = true;

	private constructor(text: custoTextInType) {
		this.text = text;
	}

	static create(text: custoTextInType) {
		return new CustoText(text);
	}

	getRaw() {
		return this.text;
	}

	useTransformed(
		props: CustoTextProps = {},
		textTransformer?: (oldText: custoTextInType) => custoTextOutType
	): custoTextOutType {
		let transformed;
		try {
			transformed = textTransformer
				? textTransformer(this.text)
				: this.text;
		} catch (e) {
			if (!(e instanceof CustoTypeError)) throw e;
			transformed = this.text;
		}
		if (props.disableTextTransformer) transformed = this.text;
		return transformed;
	}

	render(
		props: Props,
		textTransformer?: (oldText: custoTextInType) => custoTextInType
	): Exclude<custoTextInType, number> {
		const transformed = this.useTransformed(props, textTransformer);
		if (typeof transformed === "number") return transformed.toString();
		return transformed;
	}

	clone(): CustoText {
		return new CustoText(this.text);
	}
}

export interface CustoTextProps {
	disableTextTransformer?: boolean;
}
