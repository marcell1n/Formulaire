import { useState, useRef } from 'react'
import type {
  DragEvent,
  ChangeEvent,
  FormEvent,
} from 'react'

import './App.css'


// ─── Types ───────────────────────────────────────────────────────────────────

type Status =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'


// ─── Fonction utilitaire : fichier → base64 ─────────────────────────────────

function fileToBase64(
  file: File
): Promise<string> {

  return new Promise((resolve, reject) => {

    const reader = new FileReader()

    reader.readAsDataURL(file)

    reader.onload = () => {

      const result = reader.result as string

      // Supprime "data:image/png;base64,"
      const cleanBase64 =
        result.split(',')[1]

      resolve(cleanBase64)
    }

    reader.onerror = reject
  })
}

// ─── Fonction d’envoi ────────────────────────────────────────────────────────

async function submitToAirtable(
  nom: string,
  email: string,
  file: File | null
): Promise<void> {

  let fileBase64 = ''
  let filename = ''
  let mimetype = ''

  // ─── Conversion fichier ───────────────────────────────────

  if (file) {

    fileBase64 =
      await fileToBase64(file)

    filename = file.name

    mimetype = file.type
  }

  // ─── Requête Netlify ──────────────────────────────────────

  const response = await fetch(
    '/.netlify/functions/upload',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        nom,
        email,
        file: fileBase64,
        filename,
        mimetype,
      }),
    }
  )

  // ✅ Lire UNE SEULE FOIS le body

const text = await response.text()

type ApiResponse = {
  success?: boolean
  error?: string
  id?: string
}

let data: ApiResponse

try {
  data = JSON.parse(text) as ApiResponse
} catch (e) {
  console.error("Réponse non JSON :", text)

  throw new Error(
    "Serveur invalide ou fonction Netlify introuvable",
    { cause: e }
  )
}


console.log("RESPONSE NETLIFY:", data)

if (!response.ok) {
  throw new Error(data?.error || "Erreur lors de l’envoi")
}

}



// ─── Composant principal ─────────────────────────────────────────────────────

export default function App() {

  // ─── States ───────────────────────────────────────────────

  const [nom, setNom] =
    useState('')

  const [email, setEmail] =
    useState('')

  const [file, setFile] =
    useState<File | null>(null)

  const [dragging, setDragging] =
    useState(false)

  const [status, setStatus] =
    useState<Status>('idle')

  const [message, setMessage] =
    useState('')

  const [progress, setProgress] =
    useState(0)

  // ─── Ref input file ───────────────────────────────────────

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  // ─── Gestion fichier ──────────────────────────────────────

  function handleFileChange(
    e: ChangeEvent<HTMLInputElement>
  ) {

    const selected =
      e.target.files?.[0] ?? null

    setFile(selected)
  }

  function handleDragOver(
    e: DragEvent<HTMLDivElement>
  ) {

    e.preventDefault()

    setDragging(true)
  }

  function handleDragLeave() {

    setDragging(false)
  }

  function handleDrop(
    e: DragEvent<HTMLDivElement>
  ) {

    e.preventDefault()

    setDragging(false)

    const dropped =
      e.dataTransfer.files?.[0] ?? null

    setFile(dropped)
  }

  // ─── Submit ───────────────────────────────────────────────

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {

    e.preventDefault()

    // Validation

    if (
      !nom.trim() ||
      !email.trim()
    ) {

      setStatus('error')

      setMessage(
        'Veuillez remplir tous les champs obligatoires.'
      )

      return
    }

    try {

      setStatus('loading')

      setMessage('')

      setProgress(30)

      // Simulation progression

      setTimeout(() => {
        setProgress(60)
      }, 300)

      // Envoi

      await submitToAirtable(
        nom,
        email,
        file
      )

      setProgress(100)

      setStatus('success')

      setMessage(
        '✅ Votre soumission a bien été reçue.'
      )

      // Reset

      setNom('')

      setEmail('')

      setFile(null)

      if (
        fileInputRef.current
      ) {

        fileInputRef.current.value =
          ''
      }

    } catch (
      err: unknown
    ) {

      setStatus('error')

      setMessage(
        `❌ Une erreur est survenue : ${
          err instanceof Error
            ? err.message
            : 'Erreur inconnue'
        }`
      )

    } finally {

      setTimeout(() => {
        setProgress(0)
      }, 1000)
    }
  }

  // ─── UI ───────────────────────────────────────────────────

  return (

    <div className="card">

      <h1>
        Nous contacter
      </h1>

      <p className="subtitle">
        Remplissez le formulaire
        ci-dessous et envoyez-nous
        vos fichiers.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
      >

        {/* Nom */}

        <div className="form-group">

          <label htmlFor="nom">
            Nom *
          </label>

          <input
            id="nom"
            type="text"
            placeholder="Votre nom complet"
            value={nom}
            onChange={(e) =>
              setNom(
                e.target.value
              )
            }
            disabled={
              status === 'loading'
            }
            required
          />

        </div>

        {/* Email */}

        <div className="form-group">

          <label htmlFor="email">
            Email *
          </label>

          <input
            id="email"
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            disabled={
              status === 'loading'
            }
            required
          />

        </div>

        {/* Upload */}

        <div className="form-group">

          <label>
            Fichier (optionnel)
          </label>

          <div
            className={`file-drop-zone ${
              dragging
                ? 'dragging'
                : ''
            }`}
            onDragOver={
              handleDragOver
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={handleDrop}
            onClick={() =>
              fileInputRef.current?.click()
            }
          >

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={
                handleFileChange
              }
              disabled={
                status === 'loading'
              }
              hidden
            />

            <div className="file-icon">
              📎
            </div>

            <p>
              Glissez-déposez un
              fichier ici ou{' '}
              <span className="browse-link">
                parcourez
              </span>
            </p>

            <p
              style={{
                marginTop:
                  '0.25rem',

                fontSize:
                  '0.8rem',

                color:
                  '#a0aec0',
              }}
            >
              Images, vidéos, PDF,
              documents…
            </p>

          </div>

          {/* Fichier sélectionné */}

          {file && (

            <div className="file-selected">

              📄 {file.name} (

              {(
                file.size /
                1024 /
                1024
              ).toFixed(2)}{' '}
              Mo)

            </div>
          )}

        </div>

        {/* Progress */}

        {status === 'loading' && (

          <div className="progress-bar">

            <div
              className="progress-bar-fill"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>
        )}

        {/* Bouton */}

        <button
          type="submit"
          className="btn-submit"
          disabled={
            status === 'loading'
          }
        >

          {status === 'loading'
            ? 'Envoi en cours…'
            : 'Envoyer'}

        </button>

      </form>

      {/* Message */}

      {message && (

        <div
          className={`message ${
            status === 'success'
              ? 'success'
              : 'error'
          }`}
        >

          {message}

        </div>
      )}

    </div>
  )
}