const mongoose = require('mongoose');


const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    rollNumber: {
        type: String,
        required: true,
        unique: true
    },
    college: {
        type: String,
        required: true
    },
    mobile: {
        type: Number,
        required: true
    },
    monster: {
        type: Boolean,
        default: false        
    },
    password: {
        type: String,
        required: true
    },
    clubs: [{
        type: String  
    }],
    transactionIds: [{
        type: Number 
    }],
    part:[{
        type: Boolean
    }]
});


const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
