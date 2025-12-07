// src/routes/upload.routes.ts (Backend)
import { Hono } from 'hono';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';

//import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadRoutes = new Hono();

// Upload profile picture
uploadRoutes.post('/profile-picture', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return c.json({ error: 'No image provided' }, 400);
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Cloudinary
const result = await new Promise<UploadApiResponse>((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder: 'vanske-profiles',
      transformation: [
        { width: 400, height: 400, crop: 'fill' },
        { quality: 'auto' },
      ],
    },
    (error, result) => {
      if (error) reject(error);
      else resolve(result as UploadApiResponse); // Type assertion
    }
  );

  uploadStream.end(buffer);
});

    return c.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

export default uploadRoutes;