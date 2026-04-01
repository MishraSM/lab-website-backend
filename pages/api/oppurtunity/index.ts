// GET: Fetch all oppurtunity, with optional filtering on jobtype
// POST: Add a new oppurtunity
// GET: Passes all tests
// POST: Passes all tests
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST" && req.method !== "GET") {
    // If the request method is not POST or GET, return a 405 Method Not Allowed response
    return res.status(405).json({ message: "Method Not Allowed" });

  }
  if (req.method === "GET") {
    // Handle GET request to fetch all oppurtunities
    // with optional filtering by jobType
    try {
      const { jobType } = req.query;

      if (jobType && (typeof jobType !== "string" || !["Research", "PostDoc", "Grad", "Undergrad"].includes(jobType))) {
          return res.status(400).json({ message: "Oppurtunity type must be one of Research, PostDoc, Grad or Undergrad" });
      }

      // If jobType is provided, filter oppurtunities by jobType
      const filters: Record<string, any> = {};

      if (jobType) {
        filters.jobType = jobType; // Add jobType filter
      }

      // Fetch all oppurtunities from the database
      const oppurtunities = await prisma.opportunity.findMany({
        where: filters, // Apply the filters if any
        orderBy: {
          createdAt: "desc", // Order by creation date, most recent first
        },
      });

      // Respond with the fetched oppurtunities
      return res.status(200).json(oppurtunities);
    } catch (error) {
      // Log the error and return a 500 status code
      console.error("Error in GET /api/oppurtunity:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  else{
    // Handle POST request to create a new oppurtunity
      try{
      // Extract the required fields from the request body
      const { title, description, descriptionpdf, applyLink, jobType } = req.body;
      
      // Validate that all required fields are provided
      if(!title || !description || !descriptionpdf || !applyLink || !jobType){
          return res.status(400).json({ message: "All fields are required" });
      }

      // Validate that the jobType is one of the allowed enum values
      // Note: The jobType enum values are case-sensitive, so ensure the input matches exactly
      if (!["Research", "PostDoc", "Grad", "Undergrad"].includes(jobType)) {
          return res.status(400).json({ message: "Oppurtunity type must be one of Research, PostDoc, Grad or Undergrad" });
      }

      // Check if an oppurtunity with the same title and jobType already exists
      const existing = await prisma.opportunity.findUnique({
              where: {
                  title_jobType: {
                      title,
                      jobType
                  },
              },
      });

      if (existing) {
          return res.status(409).json({ message: "An Oppurtunity with this title and Job type already exists" });
      }

      // Create the oppurtunity in the database
      const oppurtunity = await prisma.opportunity.create({
        data: {
          title: title,
          description: description,
          descriptionpdf: descriptionpdf,
          applyLink: applyLink,
          jobType: jobType
        }
      })

      // Respond with the created oppurtunity
      return res.status(201).json(oppurtunity);
  }
    catch (error){
      // Log the error and return a 500 status code
      console.error("Error in POST /api/oppurtunity:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}