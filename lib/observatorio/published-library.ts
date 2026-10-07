import snapshot from "@/data/observatorio/library.json";
import { validatePublicLibrary, libraryStories } from "./library";

// Only the reviewed, generated projection is bundled. Never resolve a vault or
// service-role connection from a public request or a browser-supplied path.
export const publishedLibrary = validatePublicLibrary(snapshot);
export function publishedStories() { return libraryStories(publishedLibrary); }
