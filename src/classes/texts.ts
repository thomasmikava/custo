import { CustoClass } from "../interfaces";
import { CustoTypeError } from "../utils/errors";

type richtext = string | number | null | JSX.Element;

export class CustoText<Props extends CustoTextProps = CustoTextProps>
	implements CustoClass {
	private readonly text: richtext;
	readonly $$end$$: true = true;

	private constructor(text: richtext) {
		this.text = text;
	}

	static create(text: richtext) {
		return new CustoText(text);
	}

	getRawText() {
		return this.text;
	}

	render(
		props: Props,
		textTransformer?: (oldText: richtext) => richtext
	): Exclude<richtext, number> {
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
