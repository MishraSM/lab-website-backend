import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  const numericId = Number(id);

  // =========================
  // GET ONE
  // =========================
  if (req.method === "GET") {
    try {
      const newsItem = await prisma.newsItem.findUnique({
        where: { id: numericId },
      });

      if (!newsItem) {
        return res.status(404).json({ message: "News item not found" });
      }

      return res.status(200).json({
        ...newsItem,
        id: newsItem.id.toString(),
      });
    } catch (error) {
      console.error("Error in GET /api/news/[id]:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // =========================
  // PUT UPDATE
  // =========================
  if (req.method === "PUT") {
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

      if (
        ![
          "ResearchActivity",
          "Recognition",
          "Media",
          "Grant",
        ].includes(category)
      ) {
        return res.status(400).json({
          message:
            "Category must be ResearchActivity, Recognition, Media, or Grant",
        });
      }

      const existing = await prisma.newsItem.findUnique({
        where: { id: numericId },
      });

      if (!existing) {
        return res.status(404).json({ message: "News item not found" });
      }

      const duplicateTitle = await prisma.newsItem.findFirst({
        where: {
          title,
          id: { not: numericId },
        },
      });

      if (duplicateTitle) {
        return res.status(400).json({
          message: "News with this title already exists",
        });
      }

      const updated = await prisma.newsItem.update({
        where: { id: numericId },
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

      return res.status(200).json({
        ...updated,
        id: updated.id.toString(),
      });
    } catch (error) {
      console.error("Error in PUT /api/news/[id]:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // =========================
  // DELETE
  // =========================
  if (req.method === "DELETE") {
    try {
      const existing = await prisma.newsItem.findUnique({
        where: { id: numericId },
      });

      if (!existing) {
        return res.status(404).json({ message: "News item not found" });
      }

      await prisma.newsItem.delete({
        where: { id: numericId },
      });

      return res.status(200).json({
        message: "News item deleted successfully",
      });
    } catch (error) {
      console.error("Error in DELETE /api/news/[id]:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  return res.status(405).json({ message: "Method Not Allowed" });
}

// // This file includes the api for getting, editing and deleting a news item by its id.
// // GET - all tests pass
// // PUT - all tests pass
// // DELETE - all tests pass
// import type { NextApiRequest, NextApiResponse } from "next";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export default async function handler(
//     req: NextApiRequest,
//     res: NextApiResponse
// ){
//     // extracting id and checking if its a string
//     const { id } = req.query;
//     if (typeof id !== 'string') {
//         return res.status(400).json({ message: "Invalid ID format" });
//     }
//     // GET method
//     if (req.method === 'GET'){
//         try{
//             // get the item from data based on id then return
//             const newsItem = await prisma.newsItem.findUnique({
//                 where: {
//                     id: Number(id)
//                 }
//             })

//             // if not found, return error status
//             if(!newsItem){
//                 return res.status(404).json({ message: "News item not found" });
//             }

//             return res.status(200).json(newsItem);
//         }
//         // Log the error and return a 500 status code
//         catch(error){
//             console.error("Error in GET /api/news/[id]:", error);
//             return res.status(500).json({ message: "Internal Server Error" });
//         }
//     }
//     else if (req.method === 'PUT') {
//         try{
//             const { title, description, figurelink, figcaption, body, category } = req.body;

//             // Validate required fields
//             if(!title || !description || !figcaption || !figurelink || !body || !category){
//                 return res.status(400).json({ message: "All fields are required" });
//             }

//             // Validate that the category is one of the allowed enum values
//             if (!["Award", "ResearchTeam", "Media", "Grant"].includes(category)) {
//                 return res.status(400).json({ message: "Category must be one of Award, ResearchTeam, Media, or Grant" });
//             }

//             // check if the item with id is actually present
//             const existing = await prisma.newsItem.findUnique({
//                 where: {
//                     id: Number(id)
//                 }
//             })

//             if(!existing){
//                 return res.status(404).json({ message: "News item not found" });
//             }

//             // Check if a news item with the same title already exists (excluding the current item)
//             const titleExists = await prisma.newsItem.findFirst({
//                 where: {
//                     title: title,
//                     id: {
//                         not: Number(id) // Ensure we are not checking the current item
//                     }
//                 }
//             });

//             if (titleExists) {
//                 return res.status(400).json({ message: "News with this title already exists" });
//             }

//             // update the item with id given and return it
//             const updatedNewsItem = await prisma.newsItem.update({
//                 where: {
//                     id: Number(id)
//                 },
//                 data: {
//                     title: title,
//                     description: description,
//                     figureLink: figurelink,
//                     figCaption: figcaption,
//                     body: body,
//                     category: category
//                 }
//             })

//             return res.status(200).json(updatedNewsItem);
//         }
//         catch(error){
//             // Log the error and return a 500 status code
//             console.error("Error in PUT /api/news/[id]:", error);
//             return res.status(500).json({ message: "Internal Server Error" });
//         }
//     }
//     else if (req.method === 'DELETE') {
//         try{
//             // check if the item with id is actually present
//             const existing = await prisma.newsItem.findUnique({
//                 where: {
//                     id: Number(id)
//                 }
//             })

//             if(!existing){
//                 return res.status(404).json({ message: "News item not found" });
//             }

//             // delete the item with id given and return a success message
//             const deleteitem = await prisma.newsItem.delete({
//                 where: {
//                     id: Number(id)
//                 }
//             })

//             return res.status(200).json({ message: "News item deleted successfully", deleteitem });
//         }
//         catch(error){
//             // Log the error and return a 500 status code
//             console.error("Error in DELETE /api/news/[id]:", error);
//             return res.status(500).json({ message: "Internal Server Error" });
//         }
//     }
//     else{
//         // None of the accepted methods error
//         return res.status(407).json({ message: "Method not allowed" });
//     }
// }