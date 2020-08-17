export class HookChangeError {
	_suppressLogging: boolean;
	hasBeenCaught: boolean;
	constructor(public readonly message: string) {
		this._suppressLogging = true;
		this.hasBeenCaught = false;
	}
}

export class CustoTypeError {
	constructor(public readonly message: string) {}
}
