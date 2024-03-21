const Student = require('./models/Student'); // Assuming this is the path to your Student model

const getClubRegistrationCount = async (clubName) => {
    try {
        const clubRegistrationCount = await Student.aggregate([
            {
                $match: { clubs: clubName } // Filter students who are registered for the given club
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 } // Count the number of students in the group
                }
            }
        ]);

        if (clubRegistrationCount.length > 0) {
            return clubRegistrationCount[0].count; // Return the count of registered students for the club
        } else {
            return 0; // Return 0 if no students are registered for the club
        }
    } catch (error) {
        console.error('Error getting club registration count:', error);
        throw error; // Throw the error for handling in the caller function
    }
};

module.exports = getClubRegistrationCount;
