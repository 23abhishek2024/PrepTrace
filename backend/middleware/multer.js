import multer from "multer";

// Resumes are kept in memory (req.file.buffer) and parsed directly:
// no temporary files to write or clean up. The 5 MB limit protects the
// server from very large uploads (a text resume PDF is usually < 1 MB).
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
