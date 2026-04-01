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
  // GET ALL
  // =========================
  if (req.method === "GET") {
    try {
      const { category, page = "1", limit = "10" } = req.query;

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

      if (category) {
        whereClause.category = category;
      }

      const newsItems = await prisma.newsItem.findMany({
        where: whereClause,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: { date: "desc" },
      });

      return res.status(200).json(
        newsItems.map((item) => ({
          ...item,
          id: item.id.toString(),
        }))
      );
    } catch (error) {
      console.error("Error in GET /api/news:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // =========================
  // POST CREATE
  // =========================
  if (req.method === "POST") {
    try {
      const {
        title,
        subtitle,
        description,
        content,
        image,
        imageCaption,
        date,
        category,
      } = req.body;

      if (
        !title ||
        !subtitle ||
        !description ||
        !content ||
        !image ||
        !imageCaption ||
        !date ||
        !category
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existing = await prisma.newsItem.findUnique({
        where: { title },
      });

      if (existing) {
        return res.status(409).json({
          message: "A News item with this title already exists",
        });
      }

      const created = await prisma.newsItem.create({
        data: {
          title,
          subtitle,
          description,
          content,
          image,
          imageCaption,
          date: new Date(date),
          category,
        },
      });

      return res.status(201).json({
        ...created,
        id: created.id.toString(),
      });
    } catch (error) {
      console.error("Error in POST /api/news:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

// // GET: Fetch all newsreel, with optional filtering on category and pagination
// // POST: Add a new news reel
// // GET: Passes all tests
// // POST: Passes all tests
// import type { NextApiRequest, NextApiResponse } from "next";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse,
// ) {
//   if (req.method !== "POST" && req.method !== "GET") {
//     return res.status(405).json({ message: "Method Not Allowed" });
//   }
//   if (req.method === "GET") {
//     // Handle GET request to fetch news items
//     // with optional filtering by category and pagination
//     try{
//       const { category, page = 1, limit = 10 } = req.query;

//       // Validate that category is a string if provided
//       if (category && (typeof category !== "string" || !["Award", "ResearchTeam", "Media", "Grant"].includes(category))) {
//         return res.status(400).json({ message: "Category must be a string and Category must be one of Award, ResearchTeam, Media, or Grant" });
//       }

//       // Convert page and limit to numbers
//       const pageNumber = parseInt(page as string, 10);
//       const limitNumber = parseInt(limit as string, 10);

//       // Validate pagination parameters
//       if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
//         return res.status(400).json({ message: "Invalid pagination parameters" });
//       }

//       // Build the query options
//       const queryOptions: any = {
//         skip: (pageNumber - 1) * limitNumber,
//         take: limitNumber,
//         orderBy: {
//           createdAt: "desc",
//         },
//       };

//       // If a category is provided, filter by it
//       if (category && typeof category === "string") {
//         queryOptions.where = {
//           category: category,
//         };
//       }

//       // Fetch the news items from the database
//       const newsItems = await prisma.newsItem.findMany(queryOptions);

//       // Respond with the fetched news items
//       return res.status(200).json(newsItems);
//     }
//     catch(error){
//       console.error("Error in GET /api/news:", error);
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//   } 
//   else {
//     // Handle POST request to create a new news item
//     try {
//       const { title, description, figurelink, figcaption, body, category } = req.body;

//       // Validate required fields
//       if (!title || !description || !figcaption || !figurelink || !body || !category) {
//         return res.status(400).json({ message: "All fields are required" });
//       }

//       // Validate that the category is one of the allowed enum values
//       if (!["Award", "ResearchTeam", "Media", "Grant"].includes(category)) {
//         return res.status(400).json({ message: "Category must be one of Award, ResearchTeam, Media, or Grant" });
//       }

//       // Check if a news item with the same title already exists
//       const existing = await prisma.newsItem.findUnique({
//         where: {
//           title: title,
//         },
//       });

//       if (existing) {
//         return res.status(409).json({ message: "An NewsReel with this title already exists" });
//       }

//       // Create the news item
//       const newsItem = await prisma.newsItem.create({
//         data: {
//           title: title,
//           description: description,
//           figureLink: figurelink,
//           figCaption: figcaption,
//           body: body,
//           category: category,
//         },
//       });

//       // Respond with the created news item
//       return res.status(201).json(newsItem);
//     } catch (error) {
//       // Log the error and return a 500 status code
//       console.error("Error in POST /api/news:", error);
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//   }
// }