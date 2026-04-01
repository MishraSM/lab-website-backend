// This file includes the api for editing and deleting a oppurtunity by its id.
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
    if (req.method === 'PUT'){
        try{
            // Check if oppurtunity exists with id
            const existing = await prisma.opportunity.findUnique({
                where: {
                    id: Number(id)
                }
            })

            if(!existing){
                return res.status(404).json({ message: "Oppurtunity with the specific id not found"})
            }
            
            // Extract the required fields from the request body
            const {title, description, descriptionpdf, applyLink, jobType} = req.body;

            // Validate that all required fields are provided
            if(!title || !description || !descriptionpdf || !applyLink || !jobType){
                return res.status(400).json({ message: "All fields are required" });
            }

            // Validate that the jobType is one of the allowed enum values
            if (!["Research", "PostDoc", "Grad", "Undergrad"].includes(jobType)) {
                return res.status(400).json({ message: "Oppurtunity type must be one of Research, GradPostDoc, Trainee or Alumni" });
            }

            const existingTitle = await prisma.opportunity.findFirst({
                where: {
                    title: title,
                    jobType: jobType,
                    id: {
                        not: Number(id) // Ensure we are not checking the current oppurtunity
                    }
                }
            });

            if(existingTitle){
                return res.status(400).json({ message: "An oppurtunity with the same title and type already exists" });
            }

            // Update the oppurtunity with the given id and return it
            const oppurtunity = await prisma.opportunity.update({
                where: {
                    id: Number(id)
                },
                data: {
                    title: title,
                    description: description,
                    descriptionpdf: descriptionpdf,
                    applyLink: applyLink,
                    jobType: jobType
                }
            })

            // Respond with the updated oppurtunity
            return res.status(200).json(oppurtunity);
        }
        catch(error){
            // Log the error and return a 500 status code
            console.error("Error in PUT /api/oppurtunity/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else if(req.method === 'DELETE'){
        try{
            // check if oppurtunity exists with id
            const existing = await prisma.opportunity.findUnique({
                where: {
                    id: Number(id)
                }
            })

            if(!existing){
                return res.status(404).json({ message: "Oppurtunity with the specific id not found"})
            }

            // delete the oppurtunity with the given id and return it
            const oppurtunity = await prisma.opportunity.delete({
                where: {
                    id: Number(id)
                }
            })

            // Respond with a success message
            return res.status(200).json({ message: "Oppurtunity deleted successfully", oppurtunity})
        }
        catch(error){
            // Log the error and return a 500 status code
            console.error("Error in DELETE /api/oppurtunity/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else{
        // If the method is not PUT or DELETE, return a 405 Method Not Allowed status
        return res.status(405).json({ message: "Method Not Allowed" });
    }
}
