/// <reference types="node" />
import { v2 as cloudinary } from "cloudinary"
import type { Handler } from "@netlify/functions"
import Airtable, { type FieldSet } from "airtable"

type Body = {
  nom?: string
  email?: string
  file?: string       // base64
  filename?: string
  mimetype?: string
}

export const handler: Handler = async (event) => {
  try {
    console.log("START FUNCTION")

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Variables d'environnement manquantes" }),
      }
    }

    let body: Body = {}
    if (event.body) {
      try {
        body = JSON.parse(event.body) as Body
      } catch {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Body JSON invalide" }),
        }
      }
    }

    console.log("BODY reçu (sans file):", { nom: body.nom, email: body.email, filename: body.filename })

// ─── Upload fichier vers Cloudinary ────────────────────────
let attachments: unknown[] = []

if (body.file && body.filename) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const dataUrl = `data:${body.mimetype ?? "application/octet-stream"};base64,${body.file}`

  const isPdf = body.mimetype === "application/pdf"

const uploaded = await cloudinary.uploader.upload(dataUrl, {
  folder: "formulaire",
  resource_type: isPdf ? "raw" : "auto",
  public_id: `${Date.now()}-${body.filename.replace(/\.[^/.]+$/, "")}`,
})

console.log("URL:", uploaded.secure_url)
console.log("Type:", uploaded.resource_type)
console.log("Format:", uploaded.format)

  console.log("Cloudinary URL:", uploaded.secure_url)
  attachments = [{ url: uploaded.secure_url, filename: body.filename }]
}

    // ─── Envoi vers Airtable ─────────────────────────────────
    const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE_ID)

   const fields: FieldSet = {
  Nom: body.nom ?? "",
  Email: body.email ?? "",
  ...(attachments.length > 0 && {
    Fichier: attachments as unknown as FieldSet["Fichier"],
  }),
}

    console.log("FIELDS:", fields)

    const result = await base(AIRTABLE_TABLE_NAME).create(fields)

    console.log("AIRTABLE RESULT:", result.id)

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, id: result.id }),
    }

  } catch (error: unknown) {
    console.log("FULL ERROR ↓↓↓", error)
    const err = error instanceof Error ? error : new Error("Erreur inconnue")
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    }
  }
}