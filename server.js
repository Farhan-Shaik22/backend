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
const crypto = require('crypto');
const dotenv= require('dotenv');
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
const secretKey = 'fa7b20520f8922f6c1ce97fc';


app.use(bodyParser.json());

app.use(cors({
    //    origin: ['https://prkmit.in','https://nexus2024.netlify.app']
    origin: '*',
  }));

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
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
app.post('/api/verify', async (req, res) => {
    const { rollNumber } = req.body;
  
    try {
      const user = await Student.findOne({ rollNumber });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Return the value of the 'monster' field
      return res.json({ monster: user.monster });
    } catch (error) {
      return res.status(500).json({ error: error });
    }
  });

  // API to update the 'monster' field of a user to true
app.post('/api/update', async (req, res) => {
    const { rollNumber } = req.body;
  
    try {
      const user = await Student.findOne({ rollNumber });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update the 'monster' field to true
      user.monster = true;
      await user.save();
  
      return res.json({ success: true, message: "'monster' field updated" });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/decrypt', (req, res) => {
    const { encryptedData } = req.body;
  
    if (!encryptedData) {
      return res.status(400).json({ error: 'Missing encryptedData' });
    }
  
    try {
      // Split the encrypted data into IV and the encrypted string
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex'); // Initialization vector
      const encryptedText = parts[1]; // Encrypted data
      const encryptionKey='iamgodandiwillbeiamgodandiwillbe';
      // Create the decipher object
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'utf8'), 
        iv
      );
  
      // Decrypt the data
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      console.log(decrypted);
  
      return res.json({ decrypted });
    } catch (error) {
      console.error('Decryption failed:', error);
      return res.status(500).json({ error: 'Decryption failed' });
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
        
        const student = await Student.findOne({ rollNumber });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const { clubs, part } = student;

        res.json({ success: true, clubs, part });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
app.get('/api/checkRollNumber', async (req, res) => {
    const { rollNumber } = req.query;

    try {
        const existingPass = await Pass.findOne({ rollNumber });
        res.json({ exists: !!existingPass });
    } catch (error) {
        console.error('Error checking roll number:', error);
        res.status(500).json({ success: false, message: 'Error checking roll number' });
    }
});

app.get('/api/checkYear', async (req, res) => {
    const { rollNumber, year } = req.query;

    try {
        const existingPass = await Pass.findOne({ rollNumber, year });
        res.json({ yearMatches: !!existingPass });
    } catch (error) {
        console.error('Error checking year:', error);
        res.status(500).json({ success: false, message: 'Error checking year' });
    }
});

app.post('/api/savePassData', async (req, res) => {
    const { rollNumber, year } = req.body;

    try {
        const existingPass = await Pass.findOne({ rollNumber, year });
        if (existingPass) {
            res.json({ success: true, message: 'Pass data already exists' });
        } else {
            const pass = new Pass({
                rollNumber,
                year
            });
            await pass.save();
            res.json({ success: true, message: 'Pass data saved successfully' });
        }
    } catch (error) {
        console.error('Error saving pass data:', error);
        res.status(500).json({ success: false, message: 'Error saving pass data' });
    }
});

app.put('/api/clubs/:rollNumber/:club', async (req, res) => {
    const { rollNumber, club } = req.params;
    const { part } = req.body;

    try {

        const student = await Student.findOne({ rollNumber });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const clubIndex = student.clubs.indexOf(club);
        if (clubIndex === -1) {
            return res.status(404).json({ success: false, message: 'Club not found for the student' });
        }

        student.part[clubIndex] = part;


        await student.save();

        res.json({ success: true, message: 'Club part value updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
app.get('/api/students/:rollNumber', async (req, res) => {
    const { rollNumber } = req.params;

    try {

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
