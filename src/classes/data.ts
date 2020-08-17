import { CustoClass } from "../interfaces";

export class CustoData<Data, HiddenArgs extends readonly any[] = []>
	implements CustoClass {
	readonly $$end$$: true = true;

	readonly data: Data;

	private constructor(data: Data) {
		this.data = data;
	}

	static create<Data, HiddenArgs extends readonly any[] = []>(
		data: Data
	): CustoData<Data, HiddenArgs> {
		return new CustoData(data);
	}

	clone(): CustoData<Data, HiddenArgs> {
		return new CustoData(this.data);
	}
}
