// This file includes the api for getting, editing and deleting a team member by its id.
// Delete - passes all tests
// Get - passes all tests
// Put - passes all tests


import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
){
    // extracting id and checking if its a string
    const { id } = req.query;
    if (typeof id !== 'string') {
        return res.status(400).json({ message: "Invalid ID format" });
    }
    if (req.method === 'GET'){
        try{
            // Check if the team member with the given id exists
            const teamMember = await prisma.teamMember.findUnique({
                where: {
                    id: Number(id)
                },
                include: {
                    links: true, // Include link information
                }
            });

            // If not found, return 404
            if (!teamMember) {
                return res.status(404).json({ message: "Team member not found" });
            }

            // Return the team member details
            const linkMap: Record<string, string> = {};

            teamMember.links.forEach(link => {
                linkMap[link.type] = link.url;
            });

            return res.status(200).json({
                id: teamMember.id.toString(),
                name: teamMember.name,
                job_title: teamMember.title,
                image: teamMember.image,
                role: teamMember.section,
                bio: teamMember.body,
                status: teamMember.status,
                ...linkMap
            });
        }
        catch(error){
            console.error("Error in GET /api/team/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        
    }
    else if (req.method === 'PUT') {
        try {
            const numericId = Number(id);
            const existing = await prisma.teamMember.findUnique({
                where: { id: numericId },
            });

            if (!existing) {
                return res
                .status(404)
                .json({ message: "Team member with this id doesn't exist." });
            }

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

            if (
                !["ResearchTeam", "GradPostDoc", "Trainee", "Alumni"].includes(role)
            ) {
                return res.status(400).json({
                message:
                    "role must be one of ResearchTeam, GradPostDoc, Trainee, Alumni",
                });
            }

            // Build links from named fields
            const linksData = Object.entries(linkFields)
                .filter(([_, value]) => value)
                .map(([type, url]) => ({
                type,
                url: url as string,
                }));

            const updatedMember = await prisma.teamMember.update({
                where: { id: numericId },
                data: {
                name,
                title: job_title,
                section: role,
                body: bio,
                status: status ?? null,
                image,
                links: {
                    deleteMany: {},
                    create: linksData,
                },
                },
                include: { links: true },
            });

            const linkMap: Record<string, string> = {};
            updatedMember.links.forEach((link) => {
                if (link.type) {
                linkMap[link.type] = link.url;
                }
            });

            return res.status(200).json({
                id: updatedMember.id.toString(),
                name: updatedMember.name,
                job_title: updatedMember.title,
                image: updatedMember.image,
                role: updatedMember.section,
                bio: updatedMember.body,
                status: updatedMember.status ?? undefined,
                ...linkMap,
            });
            } catch (error) {
            console.error("Error in PUT /api/team/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
            }
  }
    else if (req.method === 'DELETE'){
        try{
            // Check if the team member with the given id exists
            const existingMember = await prisma.teamMember.findUnique({
                where: {
                    id: Number(id)
                }
            });

            // If not found, return 404
            if (!existingMember) {
                return res.status(404).json({ message: "Team member not found" });
            }

            await prisma.link.deleteMany({
                where: {
                    teamMemberId: Number(id)
                }
            });

            // First, find all publications where this member is in teamLed
            // const publications = await prisma.publication.findMany({
            //     where: {
            //         teamLed: {
            //             some: {
            //                 id: Number(id)
            //             }
            //         }
            //     }
            // });

            // // For each publication, disconnect this team member from teamLed
            // for (const publication of publications) {
            //     await prisma.publication.update({
            //         where: { id: publication.id },
            //         data: {
            //             teamLed: {
            //                 disconnect: { id: Number(id) }
            //             }
            //         }
            //     });
            // }

            // Delete the team member
            const member = await prisma.teamMember.delete({
                where: {
                    id: Number(id)
                }
            });

            // Return success response
            return res.status(200).json({ message: "Team member deleted successfully", member });
        }
        catch(error){
            console.error("Error in DELETE /api/team/[id]:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else{
        return res.status(405).json({ message: "Method Not Allowed" });
    }
}