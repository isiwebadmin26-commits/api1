import { google, drive_v3 } from "googleapis";

let cachedDriveClient: drive_v3.Drive | null = null;

export function getDriveClient(): drive_v3.Drive {
  if (cachedDriveClient) return cachedDriveClient;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY).");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  cachedDriveClient = google.drive({ version: "v3", auth });
  return cachedDriveClient;
}

export interface DriveDownloadedFile {
  fileId: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
}

/**
 * Downloads a binary file from Google Drive using its File ID.
 * Returns null if the file cannot be retrieved.
 */
export async function downloadDriveFile(fileId: string): Promise<DriveDownloadedFile | null> {
  if (!fileId) return null;

  try {
    const drive = getDriveClient();

    // 1. Fetch file metadata
    const metaRes = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size",
    });

    const fileName = metaRes.data.name || "Resume.pdf";
    const mimeType = metaRes.data.mimeType || "application/pdf";

    // 2. Fetch binary media content
    const mediaRes = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "arraybuffer",
      }
    );

    const buffer = Buffer.from(mediaRes.data as ArrayBuffer);

    return {
      fileId,
      name: fileName,
      mimeType,
      buffer,
      size: buffer.length,
    };
  } catch (err: any) {
    console.error(`Failed to fetch Google Drive file ID: ${fileId} - ${err.message}`);
    return null;
  }
}
