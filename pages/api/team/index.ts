import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["ResearchTeam", "GradPostDoc", "Trainee", "Alumni"];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // ======================
  // GET ALL TEAM MEMBERS
  // ======================
  if (req.method === "GET") {
    try {
      const { section, page = "1", limit = "50" } = req.query;

      const pageNumber = Number(page);
      const limitNumber = Number(limit);

      if (
        !Number.isInteger(pageNumber) ||
        !Number.isInteger(limitNumber) ||
        pageNumber < 1 ||
        limitNumber < 1
      ) {
        return res
          .status(400)
          .json({ message: "Invalid pagination parameters" });
      }

      const queryOptions: any = {
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: { name: "asc" },
        include: { links: true },
      };

      if (typeof section === "string") {
        if (section === "notAlumni") {
          queryOptions.where = { section: { not: "Alumni" } };
        } else {
          if (!allowedRoles.includes(section)) {
            return res.status(400).json({
              message:
                "section must be one of ResearchTeam, GradPostDoc, Trainee, Alumni or notAlumni",
            });
          }
          queryOptions.where = { section };
        }
      }

      // Transform to frontend shape
      const teamMembers = await prisma.teamMember.findMany({
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: { name: "asc" },
        ...(typeof section === "string"
            ? section === "notAlumni"
            ? { where: { section: { not: "Alumni" } } }
            : allowedRoles.includes(section)
            ? { where: { section } }
            : {}
            : {})
        });

        // Transform to frontend shape (NO LINKS)
        const formatted = teamMembers.map((member) => ({
        id: member.id.toString(),
        name: member.name,
        job_title: member.title,
        image: member.image,
        role: member.section,
        bio: member.body,
        status: member.status ?? undefined,
        }));

      return res.status(200).json(formatted);
    } catch (error) {
      console.error("Error in GET /api/team:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // ======================
  // POST CREATE TEAM MEMBER
  // ======================
  if (req.method === "POST") {
    try {
      const {
        name,
        job_title,
        role,
        status,
        image,
        bio,
        ...linkFields
      } = req.body;

      if (!name || !job_title || !role || !image || !bio) {
        return res.status(400).json({
          message:
            "name, job_title, role, image and bio are required fields",
        });
      }

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          message:
            "role must be one of ResearchTeam, GradPostDoc, Trainee, Alumni",
        });
      }

      const existing = await prisma.teamMember.findUnique({
        where: {
          name_title: {
            name,
            title: job_title,
          },
        },
      });

      if (existing) {
        return res.status(409).json({
          message: "Team member with this name and job_title already exists",
        });
      }

      // Build links from named fields
      const linksData = Object.entries(linkFields)
        .filter(([_, value]) => value)
        .map(([type, url]) => ({
          type,
          url: url as string,
        }));

      const teamMember = await prisma.teamMember.create({
        data: {
          name,
          title: job_title,
          section: role,
          body: bio,
          status: status ?? null,
          image,
          links: {
            create: linksData,
          },
        },
        include: { links: true },
      });

      const linkMap: Record<string, string> = {};
      teamMember.links.forEach((link) => {
        if (link.type) {
          linkMap[link.type] = link.url;
        }
      });

      return res.status(201).json({
        id: teamMember.id.toString(),
        name: teamMember.name,
        job_title: teamMember.title,
        image: teamMember.image,
        role: teamMember.section,
        bio: teamMember.body,
        status: teamMember.status ?? undefined,
        ...linkMap,
      });
    } catch (error) {
      console.error("Error in POST /api/team:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}
// // GET: Fetch all team members, with optional filtering on team member job type and pagination
// // POST: Add a new team member
// //GET: Passes all tests
// //POST: Passes all tests
// import type { NextApiRequest, NextApiResponse } from "next";
// import { prisma } from "@/lib/prisma";

// export default async function handler(
//     req: NextApiRequest,
//     res: NextApiResponse,
// ) {
//     if (req.method !== "POST" && req.method !== "GET") {
//         // If the request method is not POST or GET, return a 405 Method Not Allowed response
//         return res.status(405).json({ message: "Method Not Allowed" });
//     }
//     if (req.method === "GET") {
//         // Handle GET request to fetch all team members
//         // with optional filtering by section and pagination
//         try {
//             const { section, page = 1, limit = 10 } = req.query;

//             // Convert page and limit to numbers
//             const pageNumber = parseInt(page as string, 10);
//             const limitNumber = parseInt(limit as string, 10);

//             // Validate pagination parameters
//             if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
//                 return res.status(400).json({ message: "Invalid pagination parameters" });
//             }

//             // Build the query options
//             const queryOptions: any = {
//                 skip: (pageNumber - 1) * limitNumber,
//                 take: limitNumber,
//                 orderBy: {
//                     name: "asc", // Order by name alphabetically (A-Z)
//                 },
//             };

//             // If a section is provided, filter by it
//             if (section && typeof section === "string") {
//                 if (section === "notAlumni") {
//                     // Exclude Alumni section
//                     queryOptions.where = {
//                         section: {
//                             not: "Alumni",
//                         },
//                     };
//                 } else {
//                     // Validate that the section is one of the allowed enum values
//                     if (!["ResearchTeam", "GradPostDoc", "Trainee", "Alumni"].includes(section)) {
//                         return res.status(400).json({ message: "Section must be one of ResearchTeam, GradPostDoc, Trainee, Alumni, or notAlumni" });
//                     }
//                     queryOptions.where = {
//                         section: section,
//                     };
//                 }
//             }

//             // Fetch all team members from the database
//             const teamMembers = await prisma.teamMember.findMany({
//   skip: (pageNumber - 1) * limitNumber,
//   take: limitNumber,
//   orderBy: { name: "asc" },
//   include: { links: true },
//   ...(typeof section === "string"
//     ? section === "notAlumni"
//       ? { where: { section: { not: "Alumni" } } }
//       : allowedRoles.includes(section)
//       ? { where: { section } }
//       : {}
//     : {})
// });

//             const formatted = teamMembers.map((member) => {
//                 const linkMap: Record<string, string> = {};
//                 member.links.forEach((link: { type: string | number; url: string; }) => {
//                     if (link.type) {
//                         linkMap[link.type] = link.url;
//                     }
//                 });

//                 return {
//                     id: member.id.toString(),
//                     name: member.name,
//                     job_title: member.title,
//                     image: member.image,
//                     role: member.section,
//                     bio: member.body,
//                     status: member.status ?? undefined,
//                     ...linkMap,
//                 };
//             });

//             // Respond with the fetched team members
//             return res.status(200).json(formatted);
//         } catch (error) {
//             // Log the error and return a 500 status code
//             console.error("Error in GET /api/team:", error);
//             return res.status(500).json({ message: "Internal Server Error" });
//         }
//     }
//     // Handle POST request to create a new team member
//     else{
//         try {
//             // Extract the fields from the request body
//             const { name, title, section, status, links, image, body } = req.body;

//             // Validate required fields
//             if (
//                 !title ||
//                 !section ||
//                 !status ||
//                 !image ||
//                 !body ||
//                 !name
//             ) {
//                 return res.status(400).json({ message: "All fields except links are required" });
//             }

//             // Validate that the section is one of the allowed enum values
//             if (!["ResearchTeam", "GradPostDoc", "Trainee", "Alumni"].includes(section)) {
//                 return res.status(400).json({ message: "Section must be one of ResearchTeam, GradPostDoc, Trainee, Alumni" });
//             }

//             // check if the value of links are array of strings
//             if (links && (!Array.isArray(links) || !links.every((link: any) => typeof link === "string"))) {
//                 return res.status(400).json({ message: "Links must be an array of strings" });
//             }

//             // Check if team member already exists (unique on name + title)
//             const existing = await prisma.teamMember.findUnique({
//                 where: {
//                     name_title: {
//                         name,
//                         title,
//                     },
//                 },
//             });

//             if (existing) {
//                 return res.status(409).json({ message: "Team member with this name and title already exists" });
//             }

//             // Create team member with links (links can be empty or undefined)
//             const teamMember = await prisma.teamMember.create({
//                 data: {
//                     name,
//                     title,
//                     section,
//                     status,
//                     image,
//                     body,
//                     links: links && Array.isArray(links)
//                         ? { create: links.map((url: string) => ({ url })) }
//                         : undefined,
//                 },
//                 include: {
//                     links: true,
//                 },
//             });

//             // Respond with the created team member
//             return res.status(201).json(teamMember);
//         } catch (error) {
//             // Log the error and return a 500 status code
//             console.error("Error in POST /api/team:", error);
//             return res.status(500).json({ message: "Internal Server Error" });
//         }
//     }

// }
