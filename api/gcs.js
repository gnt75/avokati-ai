import { Storage } from '@google-cloud/storage';

export default async function handler(request, response) {
  // Sigurohuni që kërkesa vjen vetëm nga aplikacioni juaj në produksion
  // if (request.headers.origin !== 'https://avokati-ai.vercel.app') ...

  const { GCLOUD_PROJECT_ID, GCLOUD_CLIENT_EMAIL, GCLOUD_PRIVATE_KEY, GCLOUD_BUCKET_NAME } = process.env;

  if (!GCLOUD_PRIVATE_KEY || !GCLOUD_BUCKET_NAME) {
    return response.status(500).json({ error: 'Server Configuration Error: Missing Cloud Credentials' });
  }

  // Formatimi i çelësit privat (Vercel e ruan shpesh me \n tekstuale)
  const privateKey = GCLOUD_PRIVATE_KEY.replace(/\\n/g, '\n');

  const storage = new Storage({
    projectId: GCLOUD_PROJECT_ID,
    credentials: {
      client_email: GCLOUD_CLIENT_EMAIL,
      private_key: privateKey,
    },
  });

  const bucket = storage.bucket(GCLOUD_BUCKET_NAME);

  try {
    const { action, filename } = request.query;

    // 1. LIST FILES
    if (action === 'list') {
      const [files] = await bucket.getFiles({ 
          prefix: request.query.prefix || '' // Opsionale: për folderat
      });
      
      const fileList = files
        .filter(f => f.name.toLowerCase().endsWith('.pdf')) // Vetëm PDF
        .map(file => ({
          name: file.name,
          size: parseInt(file.metadata.size),
          updated: file.metadata.updated
        }));

      return response.status(200).json({ files: fileList });
    }

    // 2. DOWNLOAD FILE
    if (action === 'download') {
      if (!filename) return response.status(400).json({ error: 'Filename required' });

      const file = bucket.file(filename);
      const [exists] = await file.exists();

      if (!exists) return response.status(404).json({ error: 'File not found' });

      // Shkarko si buffer
      const [buffer] = await file.download();
      
      // Ktheje si base64 tek frontendi
      return response.status(200).json({
        name: filename,
        content: buffer.toString('base64')
      });
    }

    return response.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('GCS Error:', error);
    return response.status(500).json({ error: error.message });
  }
}