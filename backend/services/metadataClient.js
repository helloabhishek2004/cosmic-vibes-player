import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";

const metadataClient = axios.create({
  baseURL: PYTHON_SERVICE_URL,
  timeout: 10000, // 10s timeout
});

export default metadataClient;
