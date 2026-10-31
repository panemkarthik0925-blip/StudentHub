import express from "express";
import Student from "../models/Students.js";

const router = express.Router();

router.get("/",async (req, res)=>{
    try{
        const students = await Student.find();
        res.json(students);
    } catch (error){
        res.status(500).json({message:error.message})
    }
})
router.post("/", async (req, res) => {
  try {
    const student = await Student.create(req.body);

    res.status(201).json({
      success: true,
      message: "Student added successfully!",
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/* Update a student's details */
router.put("/:id", async (req, res) => {
  try {
    const { name, email, rollNumber, course, year } = req.body;

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, email, rollNumber, course, year },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.json(student);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Invalid student data or ID." });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or roll number is already in use.",
      });
    }

    res.status(500).json({ message: "Unable to update student." });
  }
});

/* Delete a student */
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.json({ message: "Student deleted successfully." });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    res.status(500).json({ message: "Unable to delete student." });
  }
});


export default router;
