import { prisma } from "@/lib/db";
import { subscribe } from "@/lib/events";
import { tally, type BallotPayload } from "@/lib/tally";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream for live election results. Each client
 * gets its own readable stream; on every new vote (broadcast via the
 * in-memory bus) we recompute the tally and push it down. Also sends
 * a keep-alive comment every 20 seconds to keep proxies from giving
 * up on an idle connection.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const election = await prisma.election.findUnique({
    where: { code },
    include: { options: { orderBy: { position: "asc" } } },
  });
  if (!election) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  const options = election.options;

  const stream = new ReadableStream({
    start(controller) {
      const push = async () => {
        const ballots = await prisma.ballot.findMany({
          where: { electionId: election.id },
          select: { payload: true },
        });
        const result = tally(
          election.method,
          options,
          ballots.map((b) => JSON.parse(b.payload) as BallotPayload),
        );
        controller.enqueue(
          encoder.encode(`event: tally\ndata: ${JSON.stringify(result)}\n\n`),
        );
      };

      // Initial frame so the client starts with the current count even
      // if no new vote has arrived yet.
      push().catch(() => {});

      const unsub = subscribe(code, () => {
        push().catch(() => {});
      });

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          /* stream closed */
        }
      }, 20_000);

      const close = () => {
        clearInterval(keepalive);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Attach abort listener so we tear down when the client disconnects.
      // Next.js invokes the ReadableStream's cancel() callback too, but
      // using the signal is more reliable across platforms.
      const ac = new AbortController();
      ac.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
