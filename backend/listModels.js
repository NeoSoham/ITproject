import fetch from "node-fetch";

const API_KEY = "AIzaSyDExFQhv3uS2YsoOhsAthKlRhjrxaqaXGA";
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models`;

async function listModels() {
  try {
    const response = await fetch(`${endpoint}?key=${API_KEY}`, {
      method: "GET",
    });
    const data = await response.json();
    console.log("Available models:", data.models.map(m => m.name));
  } catch (err) {
    console.error("Failed to list models:", err.message);
  }
}

listModels();
