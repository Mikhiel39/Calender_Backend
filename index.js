const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection with retry mechanism
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error(
      "Could not connect to MongoDB, retrying in 5 seconds...",
      err
    );
    setTimeout(connectWithRetry, 5000);
  }
};
connectWithRetry();

// Define Schemas and Models
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  linkedInProfile: { type: String },
  emails: [{ type: String, validate: /^\S+@\S+\.\S+$/ }],
  phoneNumbers: [{ type: String, validate: /^[0-9]{10}$/ }],
  comments: { type: String },
  communicationPeriodicity: { type: String },
  lastCommunications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Communication",
    },
  ],
  nextCommunication: { type: String },
});

const communicationSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  communicationType: { type: String, required: true },
  communicationDate: { type: String, required: true },
  notes: { type: String },
  nextCommunication: { type: String },
});

const nextCommunicationSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  communicationType: { type: String, required: true },
  scheduledDate: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
});

const Company = mongoose.model("Company", companySchema);
const Communication = mongoose.model("Communication", communicationSchema);
const NextCommunication = mongoose.model(
  "NextCommunication",
  nextCommunicationSchema
);

// API Endpoints

// Fetch all companies with populated communications
app.get("/api/companies", async (req, res) => {
  try {
    const companies = await Company.find().populate("lastCommunications");
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: "Error fetching companies", error });
  }
});

// Fetch a single company by ID
app.get("/api/companies/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate(
      "lastCommunications"
    );
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: "Error fetching company", error });
  }
});

// Add a new company
app.post("/api/companies", async (req, res) => {
  try {
    const company = new Company(req.body);
    await company.save();
    res.status(201).json({ message: "Company added successfully", company });
  } catch (error) {
    res.status(400).json({ message: "Error adding company", error });
  }
});

// Update an existing company
app.put("/api/companies/:id", async (req, res) => {
  try {
    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedCompany)
      return res.status(404).json({ message: "Company not found" });
    res
      .status(200)
      .json({ message: "Company updated successfully", updatedCompany });
  } catch (error) {
    res.status(400).json({ message: "Error updating company", error });
  }
});

// Delete a company
app.delete("/api/companies/:id", async (req, res) => {
  try {
    const deletedCompany = await Company.findByIdAndDelete(req.params.id);
    if (!deletedCompany)
      return res.status(404).json({ message: "Company not found" });
    res
      .status(200)
      .json({ message: "Company deleted successfully", deletedCompany });
  } catch (error) {
    res.status(500).json({ message: "Error deleting company", error });
  }
});

// Fetch all log communications
app.get("/api/communications", async (req, res) => {
  try {
    const communications = await Communication.find().populate("companyId");
    res.status(200).json(communications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching communications", error });
  }
});

// Log a new communication action for a company
app.post("/api/communications", async (req, res) => {
  try {
    const {
      companyId,
      communicationType,
      communicationDate,
      notes,
      nextCommunication,
    } = req.body;

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    const communication = new Communication({
      companyId,
      communicationType,
      communicationDate,
      notes,
      nextCommunication,
    });

    await communication.save();
    company.lastCommunications.push(communication._id);
    company.nextCommunication = nextCommunication || null;

    await company.save();

    res
      .status(201)
      .json({ message: "Communication logged successfully", communication });
  } catch (error) {
    res.status(400).json({ message: "Error logging communication", error });
  }
});

// Remaining Endpoints (NextCommunication handling)
// ... no errors in original version; keep the same.

// Server initialization
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
