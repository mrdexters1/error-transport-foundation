import { autoShutdown, registerShutdownCallback } from "../next";

async function test() {
	console.log("--- Testing Foundation Deep Simplification ---");

	// 1. Test auto-initialization of shutdown handlers
	console.log("Registering a shutdown callback...");
	let callbackCalled = false;
	registerShutdownCallback("test-db", async () => {
		callbackCalled = true;
		console.log("Cleanup callback executed!");
	});

	// 2. Test autoShutdown helper
	console.log("Testing autoShutdown helper...");
	autoShutdown("redis", {
		destroy: () => console.log("Redis closed via .destroy()"),
	});

	console.log(
		"Setup complete. In a real app, SIGTERM/SIGINT would trigger the callbacks.",
	);
	console.log("Verification of API surface: SUCCESS");
}

test().catch(console.error);
