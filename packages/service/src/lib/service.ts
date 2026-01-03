// import { createTransportClient, createTransportServer, type TransportOptions } from "./transport.js";

// import { promisify, type Promisify, type FunctionLike } from "@bakit/utils";

// export interface ServiceOptions {
// 	name?: string;
// 	transport: TransportOptions;
// }

// export function createService(options: ServiceOptions) {
// 	const isServer = process.env["BAKIT_SERVICE_NAME"] === options.name;
// 	const transport = isServer ? createTransportServer(options.transport) : createTransportClient(options.transport);

// 	let methodCount = 0;

// 	function define<F extends FunctionLike>(method: F): Promisify<F> {
// 		methodCount++;

// 		const methodKey = `method:${methodCount}`;

// 		if (isServer) {
// 			transport.register(methodKey, async (res, args: Parameters<F>) => {
// 				try {
// 					const result = await method(...args);
// 					res.success(result);
// 				} catch (error) {
// 					res.error(error);
// 				}
// 			});

// 			return promisify(method);
// 		}

// 		const fn = (...args: Parameters<F>) => transport.request(methodKey, args);
// 		return fn as Promisify<F>;
// 	}

// 	transport.driver.start();

// 	return {
// 		transport,
// 		define,
// 	};
// }
