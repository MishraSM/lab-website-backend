import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // =========================
  // GET ALL LAY SUMMARIES
  // =========================
  if (req.method === "GET") {
    try {
      const { title, content, tags, page = "1", limit = "10" } = req.query;

      const pageNumber = Number(page);
      const limitNumber = Number(limit);

      if (
        !Number.isInteger(pageNumber) ||
        !Number.isInteger(limitNumber) ||
        pageNumber < 1 ||
        limitNumber < 1
      ) {
        return res.status(400).json({
          message: "Invalid pagination parameters",
        });
      }

      const whereClause: any = {};

      if (title) {
        whereClause.title = {
          contains: title as string,
          mode: "insensitive",
        };
      }

      if (content) {
        whereClause.sections = {
          some: {
            OR: [
              { question: { contains: content as string, mode: "insensitive" } },
              { answer: { contains: content as string, mode: "insensitive" } },
            ],
          },
        };
      }

      if (tags) {
        const tagsArray = Array.isArray(tags) ? tags : [tags];

        whereClause.tags = {
          some: {
            tag: {
              in: tagsArray as string[],
            },
          },
        };
      }

      const laySummaries = await prisma.laySummary.findMany({
        where: whereClause,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: { createdAt: "desc" },
        include: {
          tags: true,
          sections: {
            orderBy: { order: "asc" },
          },
        },
      });

      const formatted = laySummaries.map((summary) => ({
        id: summary.id.toString(),
        title: summary.title,
        description: summary.description,
        date: summary.date.toISOString(),
        paperUrl: summary.paperUrl,
        contentImage: summary.contentImage,
        imageCaption: summary.imageCaption,
        tags: summary.tags,
        sections: summary.sections.map((s) => ({
          question: s.question,
          answer: s.answer,
        })),
        createdAt: summary.createdAt,
      }));

      return res.status(200).json(formatted);
    } catch (error) {
      console.error("Error in GET /api/summary:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // =========================
  // POST CREATE LAY SUMMARY
  // =========================
  if (req.method === "POST") {
    try {
      const {
        title,
        description,
        paperUrl,
        contentImage,
        imageCaption,
        date,
        sections,
        tags,
      } = req.body;

      if (
        !title ||
        !description ||
        !paperUrl ||
        !contentImage ||
        !imageCaption ||
        !date ||
        !Array.isArray(sections) ||
        sections.length === 0 ||
        !Array.isArray(tags) ||
        tags.length === 0
      ) {
        return res.status(400).json({
          message:
            "title, description, paperUrl, contentImage, imageCaption, date, sections and tags are required",
        });
      }

      if (
        sections.some(
          (s: any) =>
            !s.question ||
            !s.answer ||
            typeof s.question !== "string" ||
            typeof s.answer !== "string"
        )
      ) {
        return res.status(400).json({
          message: "Each section must contain question and answer",
        });
      }

      if (tags.some((tag: any) => typeof tag !== "string")) {
        return res.status(400).json({
          message: "Tags must be an array of strings",
        });
      }

      const existing = await prisma.laySummary.findUnique({
        where: { title },
      });

      if (existing) {
        return res.status(409).json({
          message: "A Lay Summary with this title already exists",
        });
      }

      const created = await prisma.laySummary.create({
        data: {
          title,
          description,
          paperUrl,
          contentImage,
          imageCaption,
          date: new Date(date),
          sections: {
            create: sections.map((s: any, index: number) => ({
              question: s.question,
              answer: s.answer,
              order: index,
            })),
          },
          tags: {
            connectOrCreate: tags.map((tag: string) => ({
              where: { tag },
              create: { tag },
            })),
          },
        },
        include: {
          tags: true,
          sections: {
            orderBy: { order: "asc" },
          },
        },
      });

      return res.status(201).json({
        id: created.id.toString(),
        title: created.title,
        description: created.description,
        date: created.date.toISOString(),
        paperUrl: created.paperUrl,
        contentImage: created.contentImage,
        imageCaption: created.imageCaption,
        tags: created.tags,
        sections: created.sections.map((s) => ({
          question: s.question,
          answer: s.answer,
        })),
        createdAt: created.createdAt,
      });
    } catch (error) {
      console.error("Error in POST /api/summary:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

// // GET: Fetch all lay summaries, with optional filtering and pagination
// // POST: Add a new lay summary
// // GET: passes all tests
// // POST: passes all tests
// import type { NextApiRequest, NextApiResponse } from "next";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse,
// ) {
//   if (req.method !== "POST" && req.method !== "GET") {
//     // If the request method is not POST or GET, return a 405 Method Not Allowed response
//     return res.status(405).json({ message: "Method Not Allowed" });
//   }
//   if (req.method === "GET") {
//     // If the request method is GET, handle fetching lay summaries
//     try {
//       const { title, content, tags, page = 1, limit = 10 } = req.query;

//       // Validate pagination parameters
//       const pageNumber = parseInt(page as string, 10);
//       const limitNumber = parseInt(limit as string, 10);

//       if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
//         return res.status(400).json({ message: "Invalid pagination parameters" });
//       }

//       // Build the query options based on provided filters
//       const queryOptions: any = {
//         skip: (pageNumber - 1) * limitNumber,
//         take: limitNumber,
//         orderBy: {
//           createdAt: "desc", // Order by creation date, descending
//         },
//         include: {
//           tags: true, // Include tags associated with each lay summary
//         },
//       };

//       // If title filter is provided, add it to the query options
//       if (title) {
//         queryOptions.where = {
//           title: {
//             contains: title as string, // Filter by title containing the provided string
//           },
//         };
//       }

//       // If content filter is provided, add it to the query options
//       if (content) {
//         queryOptions.where = {
//           ...queryOptions.where,
//           OR: [
//         { section1: { contains: content as string } },
//         { section2: { contains: content as string } },
//         { section3: { contains: content as string } },
//         { section4: { contains: content as string } },
//           ],
//         };
//       }

//       // If tags filter is provided, add it to the query options
//       if (tags) {
//         const tagsArray = Array.isArray(tags) ? tags : [tags]; // Ensure tags is an array
//         queryOptions.where = {
//           ...queryOptions.where,
//           tags: {
//             some: {
//               tag: {
//                 in: tagsArray as string[], // Filter by tags that match any of the provided tags
//               },
//             },
//           },
//         };
//       }

//       // Fetch all lay summaries from the database
//       const laySummaries = await prisma.laySummary.findMany(queryOptions);

//       // Respond with the fetched lay summaries
//       return res.status(200).json(laySummaries);
//     } catch (error) {
//       console.error("Error in GET /api/summary:", error);
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//   }
//   else{
//     // If the request method is POST, handle the creation of a new lay summary
//     try{
//       // Extract the required fields from the request body
//       const { title, description, paperlink, figurelink, figcaption, section1, section2, section3, section4, tags } = req.body;
      
//       // Validate that all required fields are provided
//       if(!title || !description || !paperlink || !figcaption || !figurelink || !section1 || !section2 || !section3 || !section4 || !tags){
//           return res.status(400).json({ message: "All fields are required" });
//       }

//       // check if tags are provided and are an array of strings
//       if(!Array.isArray(tags) || tags.length === 0 || tags.some(tag => typeof tag !== 'string')){
//         return res.status(400).json({ message: "Tags must be a non-empty array of strings" });
//       }

//       // Check if a lay summary with the same title already exists
//       const existing = await prisma.laySummary.findUnique({
//               where: {
//                   title: title,
//               },
//           });

//       if (existing) {
//           return res.status(409).json({ message: "A Lay Summary with this title already exists" });
//       }

//       // Create the lay summary in the database with tags
//       const LaySummary = await prisma.laySummary.create({
//         data: {
//           title: title,
//           description: description,
//           paperlink: paperlink,
//           figureLink: figurelink,
//           figCaption: figcaption,
//           section1: section1,
//           section2: section2,
//           section3: section3, 
//           section4: section4,
//           tags: {
//               connectOrCreate: tags.map(tag => ({
//                   where: { tag: tag },
//                   create: { tag: tag }
//               }))
//           }
//         },
//         include: {
//           tags: true
//       }
//       })

//       // Respond with the created lay summary
//       return res.status(201).json(LaySummary);
//     }
//     catch (error){
//       console.error("Error in POST /api/summary:", error);
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//   }
// }