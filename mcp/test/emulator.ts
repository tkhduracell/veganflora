import { deleteApp, initializeApp } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

// Pointing at the emulator must happen before getFirestore() is called.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

let app: App | undefined;

export function emulatorDb(): Firestore {
	app ??= initializeApp(
		{ projectId: "veganflora-test" },
		`test-${Date.now()}-${Math.random()}`,
	);
	return getFirestore(app);
}

export async function clearRecipes(db: Firestore): Promise<void> {
	const snapshot = await db
		.collection("veganflora")
		.doc("root")
		.collection("recipies")
		.get();
	await Promise.all(snapshot.docs.map((d) => d.ref.delete()));
}

export async function closeDb(): Promise<void> {
	if (app) await deleteApp(app);
	app = undefined;
}
