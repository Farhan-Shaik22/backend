const Student = require('./models/Student'); // Assuming this is the path to your Student model

const getClubRegistrationCount = async (clubName) => {
    try {
        const clubRegistrationCount = await Student.aggregate([
            {
                $match: { clubs: clubName } 
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 } 
                }
            }
        ]);

        if (clubRegistrationCount.length > 0) {
            return clubRegistrationCount[0].count;
        } else {
            return 0;
        }
    } catch (error) {
        console.error('Error getting club registration count:', error);
        throw error; 
    }
};

module.exports = getClubRegistrationCount;
