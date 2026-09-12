import { diffScenariosById } from "../../../domain/diff.js";
import { handleRouteError } from "../../../lib/api/errors.js";
import { fail, ok } from "../../../lib/api/respond.js";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const a = url.searchParams.get("a");
    const b = url.searchParams.get("b");

    if (!a || !b) {
      return fail(
        400,
        "VALIDATION_ERROR",
        "Both 'a' and 'b' query parameters are required for diffing."
      );
    }

    try {
      const diff = await diffScenariosById(a, b);
      return ok(diff);
    } catch (diffErr) {
      if (diffErr instanceof Error && diffErr.message.includes("not found")) {
        return fail(404, "NOT_FOUND", diffErr.message);
      }
      throw diffErr;
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
