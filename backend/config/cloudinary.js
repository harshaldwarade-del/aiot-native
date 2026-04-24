const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for product/material images
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "allinonetechnology/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

// Storage for invoice/document uploads
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "allinonetechnology/documents",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    resource_type: "auto",
  },
});

const uploadProductImage = multer({ storage: productStorage });
const uploadDocument = multer({ storage: documentStorage });

module.exports = { cloudinary, uploadProductImage, uploadDocument };
