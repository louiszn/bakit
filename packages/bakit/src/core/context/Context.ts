export class Context {
	public canceled = false;

	public cancel() {
		this.canceled = true;
	}
}
