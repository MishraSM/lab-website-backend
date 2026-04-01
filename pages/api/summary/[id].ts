// This file includes the api for getting, editing and deleting a lay summary by its id.
// PUT - Passes all tests
// DELETE - Passes all tests
// GET - Passes all tests
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
){
    // extracting id and checking if its a string
    const { id } = req.query;
    if (typeof id !== 'string') {
        return res.status(400).json({ message: "Invalid ID format" });
    }
    // GET method
    if (req.method === 'GET'){
        try{
            // check if the lay summary with id is actually present
            const laySummary = await prisma.laySummary.findUnique({
                where: { id: Number(id) },
                include: {
                    tags: true,
                    sections: {
                        orderBy: { order: "asc" }
                    }
                }
                });

            // if not found, return 404
            if(!laySummary){
                return res.status(404).json({ message: "Lay summary not found" });
            }

            return res.status(200).json({
                    id: laySummary.id.toString(),
                    title: laySummary.title,
                    description: laySummary.description,
                    date: laySummary.date.toISOString(),
                    paperUrl: laySummary.paperUrl,
                    contentImage: laySummary.contentImage,
                    imageCaption: laySummary.imageCaption,
                    tags: laySummary.tags,
                    sections: laySummary.sections.map(s => ({
                        question: s.question,
                        answer: s.answer
                    })),
                    createdAt: laySummary.createdAt
                });
        }
        // Log the error and return a 500 status code
        catch(error){
            console.error("Error in GET /api/summary/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else if (req.method === "PUT") {
        try {
            const numericId = Number(id);

            const {
            title,
            description,
            paperUrl,
            contentImage,
            imageCaption,
            date,
            sections,
            tags
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
                "title, description, paperUrl, contentImage, imageCaption, date, sections, and tags are required"
            });
            }

            // Validate sections structure
            if (
            sections.some(
                (s: any) =>
                !s.question || !s.answer || typeof s.question !== "string"
            )
            ) {
            return res.status(400).json({
                message: "Each section must have question and answer"
            });
            }

            // Validate tags
            if (tags.some((tag: any) => typeof tag !== "string")) {
            return res.status(400).json({
                message: "Tags must be an array of strings"
            });
            }

            const existing = await prisma.laySummary.findUnique({
            where: { id: numericId },
            include: { tags: true, sections: true }
            });

            if (!existing) {
            return res.status(404).json({ message: "Lay summary not found" });
            }

            // Prevent duplicate title
            const existingTitle = await prisma.laySummary.findFirst({
            where: {
                title,
                id: { not: numericId }
            }
            });

            if (existingTitle) {
            return res.status(400).json({
                message: "A lay summary with the same title already exists"
            });
            }

            // Delete ALL old sections
            await prisma.section.deleteMany({
            where: { laySummaryId: numericId }
            });

            // Disconnect old tags
            await prisma.laySummary.update({
            where: { id: numericId },
            data: {
                tags: {
                set: [] // removes all existing connections
                }
            }
            });

            // Update summary + recreate sections + reconnect tags
            const updated = await prisma.laySummary.update({
            where: { id: numericId },
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
                    order: index
                }))
                },
                tags: {
                connectOrCreate: tags.map((tag: string) => ({
                    where: { tag },
                    create: { tag }
                }))
                }
            },
            include: {
                sections: { orderBy: { order: "asc" } },
                tags: true
            }
            });

            return res.status(200).json(updated);
        } catch (error) {
            console.error("Error in PUT /api/summary/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else if (req.method === "DELETE") {
        try {
            const numericId = Number(id);

            const existing = await prisma.laySummary.findUnique({
            where: { id: numericId },
            include: { sections: true }
            });

            if (!existing) {
            return res.status(404).json({ message: "Lay Summary not found" });
            }

            // Delete all sections
            await prisma.section.deleteMany({
            where: { laySummaryId: numericId }
            });

            // Disconnect all tags
            await prisma.laySummary.update({
            where: { id: numericId },
            data: {
                tags: { set: [] }
            }
            });

            // Delete summary
            await prisma.laySummary.delete({
            where: { id: numericId }
            });

            return res.status(200).json({
            message: "Lay Summary deleted successfully"
            });
        } catch (error) {
            console.error("Error in DELETE /api/summary/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else{
        // None of the accepted methods error
        return res.status(407).json({ message: "Method not allowed" });
    }
}