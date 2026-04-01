// This file includes the api for editing and deleting a publication by its id.
// PUT - Passes all tests
// DELETE - Passes all tests

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
    if(req.method === 'PUT'){
        try{
            // check if the publication with id is actually present
            const existingPublication = await prisma.publication.findUnique({
                where: {
                    id: Number(id)
                }
            });

            // If not found, return 404
            if (!existingPublication) {
                return res.status(404).json({ message: "Publication not found" });
            }

            // Extract the fields from the request body
            // Required fields: title, authors, year, category
            const { title, authors, year, category, journal, preprintserver, link, presentedAt, teamLed, date, pubmedId } = req.body;

            // Validate required fields
            if(!title || !authors || !year || !category){
                return res.status(400).json({ message: "Missing required fields - title, authors, year, category" });
            }

            // Validate that the year is a number
            if (typeof year !== "number" || year < 1900 || year > new Date().getFullYear()){
                return res.status(400).json({ message: "Year must be a valid number between 1900 and the current year" });
            }

            // Validate that the category is one of the allowed enum values
            if (!["PeerReviewed", "Preprint", "Poster", "Brief"].includes(category)){
                return res.status(400).json({ message: "Category must be one of PeerReviewed, Preprint, Poster or Brief" });
            }
            
            // Validate check for each category required fields
            if (category === "PeerReviewed" && !journal && !link && !pubmedId){
                return res.status(400).json({ message: "Journal, pubmed Id, and paper link is required for PeerReviewed Publications" });
            }

            if (category === "Preprint" && !preprintserver && !link){
                return res.status(400).json({ message: "Preprint server and paper link is required for Preprint Publications" });
            }

            if (category === "Poster" && !presentedAt && !link && !teamLed && !date){
                return res.status(400).json({ message: "Conference, poster link, team led and date are required for Poster Presentations" });
            }

            if (category === "Brief" && !link && !teamLed && !date){
                return res.status(400).json({ message: "Brief/report link, team led and date are required for Briefs + Reports" });
            }

            // Check if the title, author, year, category already exists for another publication
            const existingTitle = await prisma.publication.findFirst({
                where: {
                    title: title,
                    authors: authors,
                    year: year,
                    category: category,
                    id: {
                        not: Number(id) // Ensure we are not checking the current publication
                    }
                }
            });

            if(existingTitle){
                return res.status(400).json({ message: "A publication with the same title, authors, year and category already exists" });
            }

            // Update the publication
            const updatedPublication = await prisma.publication.update({
                where: {
                    id: Number(id)
                },
                data: {
                    title: title,
                    authors: authors,
                    year: year,
                    category: category,
                    journal: journal || null,
                    preprintserver: preprintserver || null,
                    link: link || null,
                    presentedAt: presentedAt || null,
                    date: date || null,
                    pubmedId: pubmedId || null,
                    teamLed: teamLed && Array.isArray(teamLed)
                        ? {
                            set: teamLed.map((memberId: number) => ({ id: memberId }))
                        }
                        : undefined
                }
            });

            // Return the updated publication
            return res.status(200).json(updatedPublication);
        }
        catch(error){
            // Log the error and return a 500 status code
            console.error("Error in PUT /api/publications/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else if(req.method === 'DELETE'){
        try{
            // Check if the publication with the given id exists
            const existingPublication = await prisma.publication.findUnique({
                where: {
                    id: Number(id)
                },
                include: {
                    teamLed: true // Include team members to disconnect them later
                }
            });

            // If not found, return 404
            if (!existingPublication) {
                return res.status(404).json({ message: "Publication not found" });
            }

            // Disconnect any team members associated with the publication
            await prisma.publication.update({
                where: {
                    id: Number(id)
                },
                data: {
                    teamLed: {
                        disconnect: existingPublication.teamLed.map(member => ({ id: member.id }))
                    }
                }
            });

            // Delete the publication
            const publication = await prisma.publication.delete({
                where: {
                    id: Number(id)
                }
            });

            // Return a success message
            return res.status(200).json({ message: "Publication deleted successfully",  publication});
        }
        catch(error){
            // Log the error and return a 500 status code
            console.error("Error in DELETE /api/publications/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else{
        // None of the accepted methods error
        return res.status(405).json({ message: "Method Not Allowed" });
    }
}