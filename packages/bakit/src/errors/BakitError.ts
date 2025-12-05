export class BakitError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = this.constructor.name;

		Object.setPrototypeOf(this, new.target.prototype);
	}
}
