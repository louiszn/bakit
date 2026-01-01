import service, { toUpper } from "./server.js";

service.transport.driver.on("ready", async () => {
	const start = Date.now();
	console.log(await toUpper("hello world"));
	console.log(Date.now() - start);
});

console.log(service.transport.driver);
