import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const METADATA_SERVICE_URL =
  process.env.METADATA_SERVICE_URL ||
  process.env.PYTHON_SERVICE_URL ||
  "https://cosmic-vibes-metadata.onrender.com";

const metadataClient = axios.create({
  baseURL: METADATA_SERVICE_URL,
  timeout: 10000, // 10s timeout
});

export default metadataClient;
