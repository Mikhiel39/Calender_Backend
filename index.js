const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// Define Schemas and Models
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  linkedInProfile: String,
  emails: [String],
  phoneNumbers: [String],
  comments: String,
  communicationPeriodicity: String,
  lastCommunications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Communication",
    },
  ],
  nextCommunication: String,
});

const communicationSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  communicationType: { type: String, required: true },
  communicationDate: { type: String, required: true },
  notes: String,
  nextCommunication: String,
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

// Log a new communication action for a company
app.post("/api/communications", async (req, res) => {
  const {
    companyId,
    communicationType,
    communicationDate,
    notes,
    nextCommunication,
  } = req.body;

  try {
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

    const updatedCompany = await Company.findById(companyId).populate(
      "lastCommunications"
    );
    res
      .status(200)
      .json({ message: "Communication logged successfully", updatedCompany });
  } catch (error) {
    res.status(400).json({ message: "Error logging communication", error });
  }
});

// Delete a communication
app.delete("/api/communications/:id", async (req, res) => {
  try {
    const deletedCommunication = await Communication.findByIdAndDelete(
      req.params.id
    );
    if (!deletedCommunication)
      return res.status(404).json({ message: "Communication not found" });
    res
      .status(200)
      .json({
        message: "Communication deleted successfully",
        deletedCommunication,
      });
  } catch (error) {
    res.status(500).json({ message: "Error deleting communication", error });
  }
});

// Create next communication
app.post("/api/next-communications", async (req, res) => {
  try {
    const nextComm = new NextCommunication(req.body);
    await nextComm.save();
    res.status(201).json(nextComm);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating next communication", error });
  }
});

// Get next communications for a company
app.get("/api/next-communications/:companyId", async (req, res) => {
  try {
    const nextComms = await NextCommunication.find({
      companyId: req.params.companyId,
      isCompleted: false,
    });
    res.status(200).json(nextComms);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching next communications", error });
  }
});

// Update a next communication
app.put("/api/next-communications/:id", async (req, res) => {
  try {
    const updated = await NextCommunication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Next communication not found" });
    res.status(200).json(updated);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating next communication", error });
  }
});

// Cancel next communication
app.delete("/api/next-communications/:id", async (req, res) => {
  try {
    const deleted = await NextCommunication.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Next communication not found" });
    res
      .status(200)
      .json({ message: "Next communication cancelled successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error cancelling next communication", error });
  }
});

// Fetch all active next communications
app.get("/api/next-communications", async (req, res) => {
  try {
    const schedules = await NextCommunication.find({ isCompleted: false });
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schedules", error });
  }
});

// Server initialization
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
