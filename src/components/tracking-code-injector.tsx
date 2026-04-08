import { getDb } from "@/db";
import { trackingCodes } from "@/db/schema";
import { eq } from "drizzle-orm";

interface TrackingCode {
  id: string;
  code: string;
  position: string;
}

async function getEnabledCodes(): Promise<TrackingCode[]> {
  try {
    const db = await getDb();
    return await db
      .select({ id: trackingCodes.id, code: trackingCodes.code, position: trackingCodes.position })
      .from(trackingCodes)
      .where(eq(trackingCodes.enabled, true));
  } catch {
    return [];
  }
}

export async function TrackingCodeHead() {
  const codes = await getEnabledCodes();
  const headCodes = codes.filter((c) => c.position === "head");
  if (headCodes.length === 0) return null;

  return (
    <>
      {headCodes.map((c) => (
        <script
          key={c.id}
          dangerouslySetInnerHTML={{ __html: c.code }}
        />
      ))}
    </>
  );
}

export async function TrackingCodeBodyStart() {
  const codes = await getEnabledCodes();
  const bodyCodes = codes.filter((c) => c.position === "body-start");
  if (bodyCodes.length === 0) return null;

  return (
    <>
      {bodyCodes.map((c) => (
        <div key={c.id} dangerouslySetInnerHTML={{ __html: c.code }} />
      ))}
    </>
  );
}

export async function TrackingCodeBodyEnd() {
  const codes = await getEnabledCodes();
  const bodyCodes = codes.filter((c) => c.position === "body-end");
  if (bodyCodes.length === 0) return null;

  return (
    <>
      {bodyCodes.map((c) => (
        <div key={c.id} dangerouslySetInnerHTML={{ __html: c.code }} />
      ))}
    </>
  );
}
