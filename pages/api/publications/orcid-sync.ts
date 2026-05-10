import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

function getValue(obj: any, path: string[]) {
  return path.reduce((acc, key) => acc?.[key], obj);
}

function extractExternalId(detail: any, type: string) {
  const ids = detail["external-ids"]?.["external-id"] ?? [];
  const found = ids.find((id: any) => id["external-id-type"] === type);
  return found?.["external-id-value"] ?? null;
}

function extractLink(detail: any) {
  const url =
    detail.url?.value ||
    detail["external-ids"]?.["external-id"]?.[0]?.["external-id-url"]?.value;

  return url ?? null;
}

function mapOrcidTypeToCategory(workType: string) {
  if (workType === "preprint") return "Preprint";
  if (
    workType === "conference-output" ||
    workType === "conference-paper" ||
    workType === "conference-poster"
  ) {
    return "Presentation";
  }

  return "PeerReviewed";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { orcid } = req.body;

    if (!orcid || typeof orcid !== "string") {
      return res.status(400).json({ message: "ORCID iD is required" });
    }

    const headers = { Accept: "application/json" };

    const worksRes = await fetch(`https://pub.orcid.org/v3.0/${orcid}/works`, {
      headers,
    });

    if (!worksRes.ok) {
      return res.status(worksRes.status).json({
        message: "Failed to fetch ORCID works",
      });
    }

    const worksData = await worksRes.json();
    const groups = worksData.group ?? [];

    const saved = [];

    for (const group of groups) {
      const summary = group["work-summary"]?.[0];
      if (!summary) continue;

      const putCode = String(summary["put-code"]);

      const detailRes = await fetch(
        `https://pub.orcid.org/v3.0/${orcid}/work/${putCode}`,
        { headers }
      );

      if (!detailRes.ok) continue;

      const detail = await detailRes.json();

      const title = getValue(detail, ["title", "title", "value"]);
      const workType = detail.type;
      const journal = detail["journal-title"]?.value ?? null;
      const yearRaw = detail["publication-date"]?.year?.value;
      const year = yearRaw ? Number(yearRaw) : null;

      if (!title || !year || !workType) continue;

      const doi = extractExternalId(detail, "doi");
      const pubmedId = extractExternalId(detail, "pmid");
      const link = extractLink(detail);

      const category = mapOrcidTypeToCategory(workType);

      const publication = await prisma.publication.upsert({
        where: {
          orcidPutCode: putCode,
        },
        update: {
          title,
          year,
          category,
          doi,
          pubmedId,
          journal,
          preprintserver: workType === "preprint" ? journal : null,
          link,
          orcidWorkType: workType,
        },
        create: {
          title,
          authors: "Imported from ORCID",
          year,
          category,
          doi,
          pubmedId,
          journal,
          preprintserver: workType === "preprint" ? journal : null,
          link,
          orcidPutCode: putCode,
          orcidWorkType: workType,
        },
      });

      saved.push(publication);
    }

    return res.status(200).json({
      message: "ORCID publications synced successfully",
      count: saved.length,
      publications: saved,
    });
  } catch (error) {
    console.error("Error syncing ORCID publications:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}