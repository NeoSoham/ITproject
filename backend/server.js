import express from "express";
import cors from "cors";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import session from "express-session";

import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import adminRouter from "./routes/adminRoute.js";

const app = express();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "your-gemini-api-key");

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // both origins
  credentials: true,  // allow cookies or credentials if needed
}));
app.use(session({
  secret: "your_secret_key", // use an actual secret
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // true if using HTTPS
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true,
  }
}))

app.use("/api/user", userRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/admin", adminRouter);

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  const userMessage = message.toLowerCase();
  const greetings = ["hi", "hello", "hey"];

  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro-latest" });

    // Log the incoming message and session object
    console.log("Incoming message:", message);
    console.log("Current session state:", req.session);

    // If no conversationStage in session, initialize it
    if (!req.session.conversationStage) {
      req.session.conversationStage = "illness_check";
      console.log("Initializing session to stage: illness_check");
      return res.json({ reply: "Hi! How are you feeling today?" });
    }

    const { conversationStage } = req.session;
    console.log("Conversation stage:", conversationStage);

    // Restart conversation if greeting is detected
    if (greetings.some(g => userMessage.includes(g))) {
      req.session.conversationStage = "illness_check";
      req.session.symptoms = "";
      console.log("Greeting detected. Resetting to stage: illness_check");
      return res.json({ reply: "Hey there! How are you feeling today?" });
    }

    // Stage: illness_check
    if (conversationStage === "illness_check") {
      if (userMessage.includes("ill") || userMessage.includes("not well") || userMessage.includes("sick")) {
        req.session.conversationStage = "ask_symptoms";
        console.log("User is ill. Moving to stage: ask_symptoms");
        return res.json({ reply: "I'm sorry to hear that. Can you tell me what symptoms you're experiencing?" });
      } else {
        console.log("User is not ill. Staying in stage: illness_check");
        return res.json({ reply: "That's great to hear! Let me know if anything changes." });
      }
    }

    // Stage: ask_symptoms
    if (conversationStage === "ask_symptoms") {
      req.session.conversationStage = "suggest_disease";
      req.session.symptoms = message;
      console.log("Received symptoms. Updating to stage: suggest_disease");
      console.log("Stored symptoms:", message);

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Based on these symptoms: ${message}, suggest a possible disease and an over-the-counter medication in 2-3 lines. Keep it natural.`
          }]
        }]
      });

      const response = await result.response;
      const text = response.text();
      return res.json({ reply: text.trim() });
    }

    // Stage: suggest_disease
    if (conversationStage === "suggest_disease") {
      if (
        userMessage.includes("not satisfied") ||
        userMessage.includes("don’t think so") ||
        userMessage.includes("not sure")
      ) {
        req.session.conversationStage = "recommend_doctor";
        const symptoms = req.session.symptoms || "general illness";
        console.log("User not satisfied. Moving to stage: recommend_doctor");
        console.log("Using stored symptoms:", symptoms);

        const result = await model.generateContent({
          contents: [{
            role: "user",
            parts: [{
              text: `Based on the symptoms: "${symptoms}", suggest a specialist doctor the user should consult. Keep it conversational and under 3 lines.`
            }]
          }]
        });

        const response = await result.response;
        const text = response.text();
        return res.json({ reply: text.trim() });
      } else {
        console.log("User is satisfied or unclear. Staying in suggest_disease stage.");
        return res.json({ reply: "If you're unsure, I can help you find the right doctor. Just say you're not satisfied." });
      }
    }

    // Thank you message
    if (
      userMessage.includes("thank you") ||
      userMessage.includes("thanks") ||
      userMessage.includes("thankyou")
    ) {
      console.log("User said thanks.");
      return res.json({ reply: "You're very welcome! I'm here if you need anything else. 😊" });
    }

    // Stage: recommend_doctor
    if (conversationStage === "recommend_doctor") {
      console.log("In recommend_doctor stage. Ending flow.");
      return res.json({ reply: "You can restart the chat anytime by saying 'hi'. Take care!" });
    }

    // Fallback
    console.log("Fallback response triggered.");
    return res.json({ reply: "Hmm, I didn't quite get that. Could you please rephrase?" });

  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    res.status(500).json({ error: "Gemini communication failed." });
  }
});


app.get("/", (req, res) => res.send("API Working"));

const port = process.env.PORT || 4000;
await connectDB();
await connectCloudinary();

app.listen(port, () => {
  console.log(`✅ Server started on PORT: ${port}`);
});
