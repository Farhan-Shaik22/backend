const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const path = require('path');
const qr= require('qrcode');
const Student = require('./models/Student');
const Pass = require('./models/Pass');
const getClubRegistrationCount = require('./getClubRegistrationCount'); 
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const secretKey = 'fa7b20520f8922f6c1ce97fc';


app.use(bodyParser.json());

app.use(cors({
    origin: '*'
  }));

mongoose.connect('mongodb+srv://farhan2262003:we9jNupRKBPAVgb9@cluster0.hqd5s4a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// const staticFilesPath = path.join('..', 'frontend', 'build');
// app.use(express.static(staticFilesPath));


app.post('/api/register', async (req, res) => {
    var { name, rollNumber, college, mobile, password } = req.body;

    try {

        const existingStudent = await Student.findOne({ rollNumber });
        if (existingStudent) {
            return res.status(400).json({ success: false, message: 'Student already exists' });
        }

        const hashedPassword = await argon2.hash(password);
        rollNumber=rollNumber.toLowerCase();

        const newStudent = new Student({
            name,
            rollNumber,
            college,
            mobile,
            password: hashedPassword
        });


        await newStudent.save();

        res.status(201).json({ success: true, message: 'Student registered successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/deleteStudentsWithMoreThanFourAs', async (req, res) => {
    try {
        const studentsWithMoreThanFourAs = await Student.find({
            name: { $regex: /a.*a.*a.*a.*a/, $options: 'i' }
        });

        const deletionResult = await Student.deleteMany({
            name: { $regex: /a.*a.*a.*a.*a/, $options: 'i' }
        });

        res.json({ success: true, deletedCount: deletionResult.deletedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



app.post('/api/login', async (req, res) => {
    var { rollNumber, password } = req.body;
    rollNumber=rollNumber.toLowerCase();
    try {
        const student = await Student.findOne({ rollNumber });
        if (!student) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const passwordMatch = await argon2.verify(student.password, password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ rollNumber: student.rollNumber }, secretKey, { expiresIn: '1h' });

        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


app.post('/api/generateQR', async (req, res) => {

    var { rollNumber, year } = req.body;
    rollNumber=rollNumber.toLowerCase();
    const qrData = `${rollNumber}`;

    try {

        const qrCodeUrl = await qr.toDataURL(qrData);


        const pass = new Pass({
            rollNumber,
            year,
            entry: false
        });
        // await pass.save();

    
        res.json({ qrCodeUrl });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ message: 'Error generating QR code' });
    }
});

app.get('/api/clubs/:rollNumber', async (req, res) => {
    const { rollNumber } = req.params;

    try {
        // Find the student by roll number
        const student = await Student.findOne({ rollNumber });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Extract clubs and part arrays from the student
        const { clubs, part } = student;

        res.json({ success: true, clubs, part });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/clubs/:rollNumber/:club', async (req, res) => {
    const { rollNumber, club } = req.params;
    const { part } = req.body;

    try {
        // Find the student by roll number
        const student = await Student.findOne({ rollNumber });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Find the index of the club in the clubs array
        const clubIndex = student.clubs.indexOf(club);
        if (clubIndex === -1) {
            return res.status(404).json({ success: false, message: 'Club not found for the student' });
        }

        // Update the part value of the club
        student.part[clubIndex] = part;

        // Save the updated student document
        await student.save();

        res.json({ success: true, message: 'Club part value updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
app.get('/api/students/:rollNumber', async (req, res) => {
    const { rollNumber } = req.params;

    try {
        // Find the student by roll number
        const student = await Student.findOne({ rollNumber });

        if (student) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// class CustomError extends Error {
//     constructor(message) {
//       super(message);
//       this.name = 'CustomError'; // Set the error name // Timestamp when the error occurred
//     }
//   }
app.put('/api/students/:rollNumber', async (req, res) => {
    const { club, transactionId } = req.body;
    const { rollNumber } = req.params;

    try {
        const student = await Student.findOne({ rollNumber });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Check if transactionId is already used
        const existingStudentWithTransactionId = await Student.findOne({ transactionIds: transactionId });
        if (existingStudentWithTransactionId) {
            return res.status(400).json({ success: false, message: 'Transaction ID already exists' });
        }

        // const count = await getClubRegistrationCount(club);
        // if(club==="Riti" && count>=1 ){
        //     throw new CustomError('Registrations Count Reached');
        // }

        student.clubs.push(club);
        student.transactionIds.push(transactionId);
        student.part.push(false);
        await student.save();

        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
app.get('/api/passCount', async (req, res) => {
    const { year ,rollNumber} = req.query;

    try {
        const existingPass = await Pass.findOne({ rollNumber, year });
        if(existingPass){
            const n= existingPass.num;
            res.json({ success: true, n});
            console.log(n);
        }
        else{
            const passCount = await Pass.countDocuments({ year });
            console.log(passCount);
            res.json({ success: true, passCount });
        }
    } catch (error) {
        console.error('Error fetching pass count:', error);
        res.status(500).json({ success: false, message: 'Error fetching pass count' });
    }
});
app.post('/api/savePassData', async (req, res) => {
    var { rollNumber, year , passCount} = req.body;
    passCount=passCount+1

    try {
        const existingPass=await Pass.findOne({rollNumber,year});
        if(existingPass){

        }

        // Create a new pass with the incremented pass number
    else{    
        const pass = new Pass({
                rollNumber,
                year,
                passCount // Increment the pass number
            });

            // Save the new pass
        await pass.save();}

        res.json({ success: true, message: 'Pass data saved successfully' });
    } catch (error) {
        console.error('Error saving pass data:', error);
        res.status(500).json({ success: false, message: 'Error saving pass data' });
    }
});

// Assuming this is the path to your function

// Route to get the registration count of a club
app.get('/api/clubRegistrationCount/:clubName', async (req, res) => {
    const { clubName } = req.params;

    try {
        const count = await getClubRegistrationCount(clubName);
        res.json({ success: true, count });
    } catch (error) {
        console.error('Error getting club registration count:', error);
        res.status(500).json({ success: false, message: 'Failed to get club registration count' });
    }
});


// app.get('*', (req, res) => {
//     res.sendFile('C:/Users/farha/OneDrive/Desktop/chec/frontend/build/index.html');
// });

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
