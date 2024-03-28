const mongoose = require('mongoose');


const passSchema = new mongoose.Schema({
    rollNumber: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    num: {
        type: Number,
        required: true
    }
});


const Pass = mongoose.model('Pass', passSchema);

module.exports = Pass;
