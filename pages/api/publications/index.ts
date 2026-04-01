// POST: Add a new publication - done, not tested yet
// GET: Fetch all publications based on publication type, with optional filtering search query
// GET: passes all tests
// POST: passes all tests
// added 197 publications in 60014 ms = 60 seconds
import type { NextApiResponse, NextApiRequest } from "next";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import xml2js from "xml2js";

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
){
    if (req.method !== "POST" && req.method !== "GET") {
        // If the request method is not POST or GET, return a 405 Method Not Allowed response
        return res.status(405).json({ message: "Method not allowed"});
    }
    if (req.method === "GET") {
        // Handle GET request to fetch publications filtered by type and search query
        try {
            const { type, q, page = 1, limit = 10 } = req.query;

            // Validate pagination parameters
            const pageNumber = parseInt(page as string, 10);
            const limitNumber = parseInt(limit as string, 10);

            if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
                return res.status(400).json({ message: "Invalid pagination parameters" });
            }

            // Allowed publication types
            const allowedTypes = ["PeerReviewed", "Preprint", "Poster", "Brief"];

            // Ensure publication type is always present and valid
            if (!type || typeof type !== "string" || !allowedTypes.includes(type)) {
            return res.status(400).json({ message: "Publication type is required and must be one of: PeerReviewed, Preprint, Poster, Brief" });
            }

            // Build filter object
            const filter: any = {
            category: type
            };

            // If search query is present, filter on title, authors, journal, preprintserver, presentedAt
            if (q && typeof q === "string" && q.trim().length > 0) {
            filter.OR = [
                { title: { contains: q } },
                { authors: { contains: q } },
                { journal: { contains: q } },
                { preprintserver: { contains: q } },
                { presentedAt: { contains: q } }
            ];
            }

            const publications = await prisma.publication.findMany({
            where: filter,
            orderBy: {
                year: "desc"
            },
            skip: (pageNumber - 1) * limitNumber,
            take: limitNumber,
            });
            return res.status(200).json(publications);
        } catch (error) {
            console.error("Error fetching publications:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        }
        else{
        // Handle POST request to add a new publication
        try{
            // Extract the fields from the request body
            // Required fields: title, authors, year, category
            const { title, authors, year, category, journal, preprintserver, link, presentedAt, teamLed, date, pubmedId } = req.body;

            // if no category is provided, return a 400 error
            if (!category){
                return res.status(400).json({ message: "Category is required" });
            }

            // Validate that the category is one of the allowed enum values
            if (!["PeerReviewed", "Preprint", "Poster", "Brief"].includes(category)){
                return res.status(400).json({ message: "Category must be one of PeerReviewed, Preprint, Poster or Brief" });
            }

            // If the category is PeerReviewed, fetch publications from PubMed
            if (category === "PeerReviewed") {
                // If any of the manual fields are provided (title, authors, year, journal, link, pubmedId)
                const manualFields = [title, authors, year, journal, link, pubmedId];
                const anyManualFieldProvided = manualFields.some(f => f !== undefined && f !== null);

                // If any manual field is provided but not all required, return missing fields error
                if (anyManualFieldProvided) {
                    if (!title || !authors || !year || !journal || !link) {
                        return res.status(400).json({ message: "Missing required fields for manual PeerReviewed publication: title, authors, year, journal, link" });
                    }

                    // Check if publication already exists
                    const existing = await prisma.publication.findFirst({
                        where: {
                            AND: [
                                { title: title },
                                { authors: authors },
                                { year: year },
                                { category: "PeerReviewed" }
                            ]
                        }
                    });

                    if (existing) {
                        return res.status(409).json({ message: "This publication already exists." });
                    }

                    // Create the publication in the database
                    const publication = await prisma.publication.create({
                        data: {
                            title,
                            authors,
                            year,
                            category: "PeerReviewed",
                            journal,
                            preprintserver: null,
                            link,
                            presentedAt: null,
                            teamLed: undefined,
                            date: date || null,
                            pubmedId: pubmedId || null
                        }
                    });

                    return res.status(201).json(publication);
                }

                // Only go into auto-insert if only category is provided (no manual fields)
                // Authors to fetch publications for
                const TEAM_AUTHORS = [
                    "Mishra Sharmistha"
                ];

                // Ensure the PubMed API key is set in environment variables
                const API_KEY = process.env.PUBMED_API_KEY;

                if (!API_KEY) {
                    return res.status(500).json({ message: "PubMed API key is not set in environment variables" });
                }

                // Function to fetch PubMed IDs for a given author
                const getPubMedIds = async (author: string) => {
                    const url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
                    const params = {
                        db: "pubmed",
                        term: `${author}[Author]`,
                        retmode: "json",
                        retmax: 1000,
                        api_key: API_KEY,
                    };
                    const res = await axios.get(url, { params });
                    return res.data.esearchresult.idlist;
                };

                // Function to fetch and parse a PubMed article by ID
                const fetchAndParsePub = async (id: any) => {
                    const efetchUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
                    const params = {
                        db: "pubmed",
                        id,
                        retmode: "xml",
                        api_key: API_KEY,
                    };
                    const res = await axios.get(efetchUrl, { params });

                    // Parse the XML response to extract publication details
                    return new Promise((resolve, reject) => {
                        xml2js.parseString(res.data, { explicitArray: false }, (err: any, result: { PubmedArticleSet: { PubmedArticle: { MedlineCitation: { Article: any; }; }; }; }) => {
                            if (err) return reject(err);
                            try {
                                const article = result.PubmedArticleSet.PubmedArticle.MedlineCitation.Article;
                                const authorsArr = article.AuthorList.Author;
                                const authors = (Array.isArray(authorsArr) ? authorsArr : [authorsArr])
                                    .map(a => `${a.ForeName} ${a.LastName}`.trim())
                                    .join(', ');

                                const dateObj = article.ArticleDate || article.Journal.JournalIssue.PubDate;
                                const year = parseInt(dateObj.Year);
                                const month = dateObj.Month?.padStart?.(2, '0') || "01";
                                const day = dateObj.Day?.padStart?.(2, '0') || "01";
                                const date = new Date(`${year}-${month}-${day}`);

                                const category = "PeerReviewed";
                                const journalTitle = article.Journal.Title;
                                const volume = article.Journal.JournalIssue.Volume;
                                const journal = volume ? `${journalTitle}, Vol ${volume}` : journalTitle;

                                const elocs = Array.isArray(article.ELocationID) ? article.ELocationID : [article.ELocationID];
                                const doi = elocs.find((el: { $: { EIdType: string; }; }) => el.$.EIdType === 'doi');
                                const link = doi ? `https://doi.org/${doi._}` : null;

                                // Ensure title is a string (handles cases where ArticleTitle is an object)
                                let title = article.ArticleTitle;
                                if (typeof title === "object" && title._) {
                                    title = title._;
                                }
                                resolve({
                                    title,
                                    authors,
                                    year,
                                    category,
                                    journal,
                                    preprintserver: null,
                                    link,
                                    presentedAt: null,
                                    teamLed: undefined,
                                    date,
                                    createdAt: new Date()
                                });
                            } catch (err) {
                                resolve(null);
                            }
                        });
                    });
                };

                // Fetch and insert publications for each author
                const insertedPublications = [];

                // Loop through each author and fetch their publications
                for (const author of TEAM_AUTHORS) {
                    const ids = await getPubMedIds(author);
                    for (const id of ids) {
                        // Check if the publication already exists in the database
                        const exists = await prisma.publication.findFirst({ where: { pubmedId: id } });
                        // If it exists, skip to the next ID
                        if (exists) continue;

                        // Fetch and parse the publication details
                        const pub = await fetchAndParsePub(id);
                        if (pub) {
                            // Insert the publication into the database
                            await prisma.publication.create({
                                data: {
                                    ...(pub as any),
                                    pubmedId: id,
                                }
                            });
                            insertedPublications.push(pub);
                        }

                        // Wait for a short time to avoid hitting the API rate limit
                        await new Promise((r) => setTimeout(r, 120)); // Rate limiting
                    }
                }
                return res.status(201).json({ message: "Peer-reviewed publications fetched and inserted", length: insertedPublications.length, data: insertedPublications });
            }

            // If the category is Preprint, handle preprints
            if (category === "Preprint") {
                // Check if any manual fields are provided
                const manualFields = [title, authors, year, preprintserver, link];
                const anyManualFieldProvided = manualFields.some(f => f !== undefined && f !== null);

                // If any manual field is provided but not all required, return missing fields error
                if (anyManualFieldProvided) {
                    if (!title || !authors || !year || !preprintserver || !link) {
                        return res.status(400).json({ message: "Missing required fields for manual Preprint publication: title, authors, year, preprintserver, link" });
                    }

                    // Check if preprint already exists
                    const existing = await prisma.publication.findFirst({
                        where: {
                            AND: [
                                { title: title },
                                { authors: authors },
                                { year: year },
                                { category: "Preprint" }
                            ]
                        }
                    });

                    // if it exists, return a 409 conflict error
                    if (existing) {
                        return res.status(409).json({ message: "This preprint already exists." });
                    }

                    // create the preprint in the database
                    const publication = await prisma.publication.create({
                        data: {
                            title,
                            authors,
                            year,
                            category: "Preprint",
                            journal: null,
                            preprintserver,
                            link,
                            presentedAt: null,
                            teamLed: undefined,
                            date: null,
                            pubmedId: null
                        }
                    });

                    return res.status(201).json(publication);
                }
            }
            // Validate required fields
            if(!title || !authors || !year || !category){
                return res.status(400).json({ message: "Missing required fields - title, authors, year, category" });
            }

            // Validate that the year is a number
            if (typeof year !== "number" || year < 1900 || year > new Date().getFullYear()){
                return res.status(400).json({ message: "Year must be a valid number between 1900 and the current year" });
            }

            if (category === "Poster" && !presentedAt && !link && !teamLed && !date){
                return res.status(400).json({ message: "Conference, poster link, team led and date are required for Poster Presentations" });
            }

            if (category === "Brief" && !link && !teamLed && !date){
                return res.status(400).json({ message: "Brief/report link, team led and date are required for Briefs + Reports" });
            }

            // Check if a publication with the same title, authors, year and category already exists
            const existing = await prisma.publication.findFirst({
                where: {
                    AND: [
                        { title: title },
                        { authors: authors },
                        { year: year },
                        { category: category }
                    ]
                },
            });

            if(existing){
                return res.status(409).json({ message: "A publication with this title, authors, year and category already exists" });
            }

            // Create the publication in the database
            const publication = await prisma.publication.create({
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
                    // Connect teamLed as an array of member IDs if provided
                    teamLed: teamLed && Array.isArray(teamLed)
                        ? {
                            connect: teamLed.map((id: number) => ({ id }))
                        }
                        : undefined
                }
            });

            // Respond with the created publication
            return res.status(201).json(publication);
        }
        catch(error){
            // Log the error and return a 500 status code
            console.error("Error in POST /api/publications:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
}