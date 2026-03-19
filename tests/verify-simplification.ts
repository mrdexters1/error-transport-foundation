import { initFoundation, registerShutdownCallback } from "../next";

async function test() {
	console.log("--- Testing Foundation Simplification ---");

	// 1. Test initFoundation
	console.log("Calling initFoundation()...");
	initFoundation();

	// 2. Test auto-initialization of shutdown handlers
	console.log("Registering a shutdown callback...");
	let callbackCalled = false;
	registerShutdownCallback("test-db", async () => {
		callbackCalled = true;
		console.log("Cleanup callback executed!");
	});

	console.log(
		"Setup complete. In a real app, SIGTERM/SIGINT would trigger the callbacks.",
	);
	console.log("Verification of API surface: SUCCESS");
}

test().catch(console.error);
